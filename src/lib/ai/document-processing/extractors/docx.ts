import mammoth from "mammoth";
import type { DocumentLimits } from "../config";
import { DocumentProcessingError } from "../errors";
import type { Extracted } from "../blocks";
import { extractHtml } from "./html";

const EOCD_SIG = 0x06054b50;
const CEN_SIG = 0x02014b50;

interface ZipSummary {
  entryCount: number;
  totalUncompressed: number;
  names: string[];
}

const corrupt = (msg: string) => new DocumentProcessingError("CORRUPT_FILE", msg);

/**
 * Reads only the zip central directory (no decompression) so entry count and
 * declared uncompressed size can be limited before any parser runs.
 * Limitation: sizes are what the archive declares; the parser is still the
 * last line of defense against archives that lie.
 */
export function inspectZip(bytes: Uint8Array): ZipSummary {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const minEocd = 22;
  let eocd = -1;
  for (let i = bytes.length - minEocd; i >= Math.max(0, bytes.length - minEocd - 0xffff); i--) {
    if (view.getUint32(i, true) === EOCD_SIG) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw corrupt("The DOCX archive is corrupt (no zip directory).");

  const total = view.getUint16(eocd + 10, true);
  const cdSize = view.getUint32(eocd + 12, true);
  const cdOffset = view.getUint32(eocd + 16, true);
  if (total === 0xffff || cdSize === 0xffffffff || cdOffset === 0xffffffff) {
    throw corrupt("ZIP64 archives are not supported.");
  }
  if (cdOffset + cdSize > bytes.length) throw corrupt("The DOCX archive is corrupt (bad directory).");

  const names: string[] = [];
  let totalUncompressed = 0;
  let pos = cdOffset;
  const decoder = new TextDecoder("utf-8");
  for (let n = 0; n < total; n++) {
    if (pos + 46 > bytes.length || view.getUint32(pos, true) !== CEN_SIG) {
      throw corrupt("The DOCX archive is corrupt (bad entry).");
    }
    const flags = view.getUint16(pos + 8, true);
    if (flags & 1) throw new DocumentProcessingError("ENCRYPTED_FILE", "The DOCX archive is encrypted.");
    totalUncompressed += view.getUint32(pos + 24, true);
    const nameLen = view.getUint16(pos + 28, true);
    const extraLen = view.getUint16(pos + 30, true);
    const commentLen = view.getUint16(pos + 32, true);
    if (pos + 46 + nameLen > bytes.length) throw corrupt("The DOCX archive is corrupt (bad name).");
    names.push(decoder.decode(bytes.subarray(pos + 46, pos + 46 + nameLen)));
    pos += 46 + nameLen + extraLen + commentLen;
  }
  return { entryCount: total, totalUncompressed, names };
}

export async function extractDocx(bytes: Uint8Array, limits: DocumentLimits): Promise<Extracted> {
  const zip = inspectZip(bytes);
  if (zip.entryCount > limits.maxDocxEntries) {
    throw new DocumentProcessingError("FILE_TOO_LARGE", "The DOCX archive contains too many entries.");
  }
  if (zip.totalUncompressed > limits.maxDocxUncompressedBytes) {
    throw new DocumentProcessingError("FILE_TOO_LARGE", "The DOCX archive expands beyond the allowed size.");
  }
  if (!zip.names.includes("word/document.xml")) {
    throw new DocumentProcessingError("FORMAT_MISMATCH", "The ZIP archive is not a Word document.");
  }

  let html: string;
  try {
    const result = await mammoth.convertToHtml(
      { buffer: Buffer.from(bytes) },
      // Skip embedded images so large base64 data never enters the text.
      { convertImage: mammoth.images.imgElement(async () => ({ src: "" })) },
    );
    html = result.value;
  } catch {
    throw corrupt("The DOCX file could not be parsed.");
  }
  return extractHtml(html);
}
