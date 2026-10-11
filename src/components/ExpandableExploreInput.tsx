"use client";
import React, { useState, useRef, useEffect } from 'react';
import { 
  Compass, 
  Mic, 
  MicOff, 
  Paperclip, 
  X, 
  ArrowRight, 
  FileText
} from 'lucide-react';

import { apiClient } from '../lib/client/api';

interface ExpandableExploreInputProps {
  onOpenExploreModels: (query?: string) => void;
  onOpenPlayground?: (prompt?: string) => void;
}

export const ExpandableExploreInput: React.FC<ExpandableExploreInputProps> = ({
  onOpenExploreModels,
  onOpenPlayground,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [speechFeedback, setSpeechFeedback] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<{ stop: () => void; start: () => void } | null>(null);

  // Close when clicking outside if input is empty and not recording
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current && 
        !containerRef.current.contains(e.target as Node) &&
        !query &&
        !attachedFile &&
        !isRecording
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [query, attachedFile, isRecording]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [isOpen]);

  // Recording timer
  useEffect(() => {
    if (!isRecording) return;
    const interval = setInterval(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isRecording]);

  // Handle Speech Recognition
  const toggleRecording = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (isRecording) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      setIsRecording(false);
      setRecordingTime(0);
      setSpeechFeedback('');
      return;
    }

    setRecordingTime(0);

    // Try native Web Speech API if supported in browser
    const win = typeof window !== 'undefined' ? (window as unknown as Record<string, unknown>) : null;
    const SpeechRecognitionConstructor = 
      win && ((win.SpeechRecognition || win.webkitSpeechRecognition) as new () => {
        continuous: boolean;
        interimResults: boolean;
        lang: string;
        onresult: (ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
        onerror: () => void;
        onend: () => void;
        start: () => void;
        stop: () => void;
      });

    if (SpeechRecognitionConstructor) {
      try {
        setIsRecording(true);
        setSpeechFeedback('Listening...');
        const recognition = new SpeechRecognitionConstructor();
        recognitionRef.current = recognition;
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event) => {
          const transcript = Array.from(event.results)
            .map((result) => result[0]?.transcript || '')
            .join('');
          setQuery(transcript);
          setSpeechFeedback(`Heard: "${transcript}"`);
        };

        recognition.onerror = () => {
          setIsRecording(false);
          setRecordingTime(0);
          setSpeechFeedback('Voice input error or permission denied.');
        };

        recognition.onend = () => {
          setIsRecording(false);
          setRecordingTime(0);
          setSpeechFeedback('');
        };

        recognition.start();
        return;
      } catch {
        setIsRecording(false);
        setRecordingTime(0);
        setSpeechFeedback('Voice input is not supported in this browser.');
        return;
      }
    }

    // Display clear unsupported state instead of inserting randomly chosen sample prompts
    setIsRecording(false);
    setRecordingTime(0);
    setSpeechFeedback('Browser speech recognition is not supported.');
    setTimeout(() => setSpeechFeedback(''), 3000);
  };

  // Handle File Upload
  const handleFileUploadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedFile(file);
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await apiClient.uploadDocument(formData);
        if (!query) {
          setQuery(`Analyze document "${file.name}" (${res.chunkCount} chunks ingested)`);
        }
      } catch (err: unknown) {
        console.error('File upload error:', err);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const removeAttachedFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setAttachedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Handle Submit
  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (query.trim() || attachedFile) {
      // If user typed a query or uploaded file, route to Explore Models or Playground
      onOpenExploreModels(query.trim());
    } else {
      onOpenExploreModels();
    }
  };

  // When collapsed: renders the button format from the reference image
  if (!isOpen) {
    return (
      <div className="relative inline-flex items-center">
        {/* Hidden file input for accessibility */}
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          className="hidden" 
          accept=".pdf,.txt,.md,.json,.csv,.png,.jpg,.jpeg"
        />

        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group relative px-6 py-3.5 rounded-full bg-stone-900/90 hover:bg-stone-800/90 text-sm font-medium text-stone-100 border border-amber-500/30 hover:border-amber-400/60 backdrop-blur-md transition-all duration-300 flex items-center justify-center gap-2.5 cursor-pointer shadow-[0_4px_20px_rgba(0,0,0,0.4)] hover:shadow-[0_0_25px_rgba(245,158,11,0.35)] active:scale-95"
          title="Click to explore models or search with voice and file upload"
        >
          {/* Circular Compass Icon in Solar Amber */}
          <div className="w-5 h-5 rounded-full border border-amber-400/80 flex items-center justify-center text-amber-400 group-hover:rotate-45 group-hover:border-amber-300 transition-all duration-300">
            <Compass className="w-3.5 h-3.5" />
          </div>

          <span className="font-medium tracking-tight">Explore Models</span>

          {/* Subtle pulse hint badge */}
          <span className="inline-flex items-center justify-center w-2 h-2 rounded-full bg-amber-400 animate-pulse ml-0.5" />
        </button>
      </div>
    );
  }

  // When open: Expandable Omnibar with Mic input, File Upload, Text input and Direct actions
  return (
    <div 
      ref={containerRef}
      className="relative z-30 flex flex-col items-center w-full max-w-xl transition-all duration-500 ease-in-out"
    >
      {/* Hidden file input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
        accept=".pdf,.txt,.md,.json,.csv,.png,.jpg,.jpeg"
      />

      {/* Main Expandable Input Bar in Noon Obsidian Amber */}
      <form 
        onSubmit={handleSubmit}
        className="relative w-full flex items-center bg-[#0d0805]/95 border-2 border-amber-500/80 rounded-full py-1.5 pl-3.5 pr-2 backdrop-blur-xl shadow-[0_0_35px_rgba(245,158,11,0.4)] ring-1 ring-amber-400/30 transition-all duration-300 focus-within:border-amber-300 focus-within:shadow-[0_0_45px_rgba(245,158,11,0.55)]"
      >
        {/* Left Compass / Status Icon */}
        <button
          type="button"
          onClick={() => onOpenExploreModels(query)}
          className="shrink-0 w-8 h-8 rounded-full bg-amber-500/10 border border-amber-400/40 flex items-center justify-center text-amber-400 hover:bg-amber-500/20 hover:border-amber-300 transition-colors cursor-pointer mr-2"
          title="Explore Model Catalog"
        >
          <Compass className="w-4 h-4" />
        </button>

        {/* Text Input */}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={isRecording ? "Listening to your request..." : "Ask AI, upload docs, or explore models..."}
          className="flex-1 bg-transparent text-sm text-white placeholder-stone-400 focus:outline-none pr-2 font-normal"
        />

        {/* Action Controls: Mic, File Upload, Submit */}
        <div className="flex items-center gap-1.5 shrink-0">
          
          {/* 1. Mic Input Button */}
          <button
            type="button"
            onClick={toggleRecording}
            className={`p-2 rounded-full transition-all duration-200 cursor-pointer flex items-center justify-center ${
              isRecording 
                ? 'bg-rose-500 text-white animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.8)]' 
                : 'text-stone-300 hover:text-amber-300 hover:bg-stone-800/80'
            }`}
            title={isRecording ? "Click to stop recording" : "Dictate request with microphone"}
          >
            {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* 2. File Upload Button */}
          <button
            type="button"
            onClick={handleFileUploadClick}
            className={`p-2 rounded-full transition-all duration-200 cursor-pointer flex items-center justify-center ${
              attachedFile 
                ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40' 
                : 'text-stone-300 hover:text-amber-300 hover:bg-stone-800/80'
            }`}
            title="Upload Document / RAG context (PDF, JSON, TXT)"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          {/* 3. Submit / Search Button */}
          <button
            type="submit"
            className="px-4 py-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-stone-950 text-xs font-semibold shadow-[0_0_15px_rgba(245,158,11,0.4)] flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            title="Explore models or route query"
          >
            <span>Explore</span>
            <ArrowRight className="w-3.5 h-3.5 text-stone-950" />
          </button>

          {/* 4. Close / Collapse Button */}
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              setQuery('');
              setAttachedFile(null);
              setIsRecording(false);
            }}
            className="p-1.5 text-stone-400 hover:text-stone-200 hover:bg-stone-800/60 rounded-full transition-colors cursor-pointer ml-0.5"
            title="Collapse"
          >
            <X className="w-3.5 h-3.5" />
          </button>

        </div>
      </form>

      {/* Voice Recording Waveform Indicator or Status */}
      {isRecording && (
        <div className="mt-2 flex items-center gap-2 px-3 py-1 bg-rose-950/80 border border-rose-500/40 rounded-full text-xs text-rose-300 animate-fadeIn">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
          <span className="font-mono text-[11px]">Recording audio ({recordingTime}s)</span>
          <div className="flex items-center gap-0.5 h-3">
            <span className="w-0.5 h-2 bg-rose-400 animate-pulse" />
            <span className="w-0.5 h-3 bg-rose-400 animate-pulse delay-75" />
            <span className="w-0.5 h-1.5 bg-rose-400 animate-pulse delay-150" />
            <span className="w-0.5 h-2.5 bg-rose-400 animate-pulse delay-100" />
          </div>
          <span className="text-[10px] text-rose-200/80">Speak your request...</span>
        </div>
      )}

      {/* Voice Status / Feedback Message */}
      {speechFeedback && !isRecording && (
        <div className="mt-2 text-xs text-amber-300 bg-amber-950/60 border border-amber-500/30 rounded-full px-3 py-0.5">
          {speechFeedback}
        </div>
      )}

      {/* Uploading progress indicator */}
      {isUploading && (
        <div className="mt-2 text-xs text-amber-400 bg-stone-900/80 border border-amber-500/20 rounded-full px-3 py-0.5 animate-pulse">
          Ingesting document chunks...
        </div>
      )}

      {/* Attached File Preview Badge */}
      {attachedFile && (
        <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-950/70 border border-amber-500/40 text-amber-200 text-xs shadow-sm animate-fadeIn">
          <FileText className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-mono text-[11px] max-w-[200px] truncate">{attachedFile.name}</span>
          <span className="text-[10px] text-amber-400/80 font-mono">
            ({(attachedFile.size / 1024).toFixed(1)} KB)
          </span>
          <button
            type="button"
            onClick={removeAttachedFile}
            className="text-amber-400 hover:text-white ml-1 cursor-pointer"
            title="Remove file"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Quick Suggestions & Direct Catalog Link */}
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-[11px] text-stone-400">
        <span>Try:</span>
        <button
          type="button"
          onClick={() => {
            setQuery('Fast coding agent');
            onOpenExploreModels('Coding');
          }}
          className="text-amber-300 hover:text-amber-200 underline underline-offset-2 cursor-pointer"
        >
          Coding Agents
        </button>
        <span>·</span>
        <button
          type="button"
          onClick={() => {
            setQuery('High context reasoning');
            onOpenExploreModels('Foundation');
          }}
          className="text-amber-300 hover:text-amber-200 underline underline-offset-2 cursor-pointer"
        >
          Reasoning Models
        </button>
        <span>·</span>
        <button
          type="button"
          onClick={() => onOpenExploreModels()}
          className="text-orange-400 hover:text-orange-300 font-medium cursor-pointer"
        >
          View Full Catalog →
        </button>
      </div>

    </div>
  );
};
