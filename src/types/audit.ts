export type Severity = 'critical' | 'serious' | 'moderate' | 'minor';
export type AuditCategory = 'contrast' | 'typography' | 'layout' | 'content' | 'wcag';

export interface AuditIssue {
  id: string;
  title: string;
  category: AuditCategory;
  severity: Severity;
  wcagCriterion?: string;
  wcagLevel?: 'A' | 'AA' | 'AAA';
  location: string;
  currentValue: string;
  recommendedValue: string;
  description: string;
  impact: string;
  remediation: string;
  pinCoordinates?: { x: number; y: number }; // Percentage on visual preview
}

export interface ColorSwatch {
  name: string;
  hex: string;
  role: string;
  textColor: string;
  contrastRatio: number;
  wcagAAPass: boolean;
  wcagAAAPass: boolean;
  suggestedHex?: string;
  suggestedRatio?: number;
  notes: string;
}

export interface TypoBug {
  id: string;
  title: string;
  element: string;
  foundInDesign: string;
  correctedText: string;
  issueType: 'markdown_leak' | 'spelling_error' | 'duplicate_heading' | 'hierarchy_gap' | 'orphan_line';
  explanation: string;
}
