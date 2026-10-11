"use client";
import React, { useState, useMemo, useEffect } from 'react';
import { 
  ArrowLeft, 
  Search, 
  Filter, 
  LayoutGrid, 
  List, 
  Sparkles, 
  CheckCircle2, 
  ChevronDown, 
  X, 
  Bot, 
  Layers, 
  Boxes,
  Zap
} from 'lucide-react';
import { ModelShortlistLoader } from './ModelShortlistLoader';
import { apiClient, type RecommendationSummaryItem } from '../lib/client/api';

export interface EcosystemItem {
  id: string;
  name: string;
  vendor: string;
  category: string;
  type: 'PLATFORM' | 'AI AGENT';
  isNew?: boolean;
  description: string;
  bullets: string[];
  allBullets?: string[];
  statusText: string;
  statusType: 'commercial' | 'free' | 'mit' | 'open-source';
  iconColor: string;
  iconBg: string;
  iconSymbol: string;
  contextWindow?: string;
  pricing?: string;
}

const ECOSYSTEM_DATA: EcosystemItem[] = [
  {
    id: 'anthropic-claude',
    name: 'Anthropic Claude',
    vendor: 'by Anthropic PBC',
    category: 'Coding Agents',
    type: 'PLATFORM',
    description: 'AI safety and research company that created Claude, known for high steerability, 200K token contexts, and frontier reasoning.',
    bullets: [
      'High-level software architecture & reasoning',
      'Computer Use API (agent controls GUI elements)'
    ],
    allBullets: [
      'High-level software architecture & reasoning',
      'Computer Use API (agent controls GUI elements)',
      '200K token context window with high recall',
      'Prompt caching for cost reduction',
      'Artifacts interface for iterative code generation'
    ],
    statusText: 'Commercial Verified',
    statusType: 'commercial',
    iconColor: 'text-white',
    iconBg: 'bg-zinc-900 border-zinc-800',
    iconSymbol: '✹',
    contextWindow: '200K Tokens',
    pricing: '$3.00 / $15.00 per 1M tokens'
  },
  {
    id: 'cursor',
    name: 'Cursor',
    vendor: 'by Anysphere Inc.',
    category: 'Coding Agents',
    type: 'AI AGENT',
    description: 'A dedicated fork of VS Code engineered from the ground up for agentic multi-file code editing, repository indexing, and inline diffs.',
    bullets: [
      'Full-codebase semantic vector indexing',
      'Cursor Composer multi-file simultaneous edits'
    ],
    allBullets: [
      'Full-codebase semantic vector indexing',
      'Cursor Composer multi-file simultaneous edits',
      'Instant terminal command generation and error autofix',
      'Multi-model fallback (Claude 3.5 Sonnet, GPT-4o)',
      'Private codebase indexing without training'
    ],
    statusText: 'Free Verified',
    statusType: 'free',
    iconColor: 'text-white',
    iconBg: 'bg-zinc-900 border-zinc-800',
    iconSymbol: '⬡',
    contextWindow: 'Variable Context',
    pricing: 'Freemium / $20/mo Pro'
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    vendor: 'by DeepSeek AI',
    category: 'Open-Source Models',
    type: 'PLATFORM',
    isNew: true,
    description: 'AI research lab that open-sourced DeepSeek-V3 and DeepSeek-R1, proving frontier reasoning capabilities at ultra-low inference costs.',
    bullets: [
      'DeepSeek-R1 pure reinforcement learning reasoning',
      'Multi-head Latent Attention (MLA) architecture'
    ],
    allBullets: [
      'DeepSeek-R1 pure reinforcement learning reasoning',
      'Multi-head Latent Attention (MLA) architecture',
      '671B MoE model with 37B active parameters',
      'Near-zero cost per million input tokens',
      'Open weights available on Hugging Face'
    ],
    statusText: 'MIT Verified',
    statusType: 'mit',
    iconColor: 'text-white',
    iconBg: 'bg-zinc-900 border-zinc-800',
    iconSymbol: '🐋',
    contextWindow: '128K Tokens',
    pricing: '$0.14 / $0.28 per 1M tokens'
  },
  {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    vendor: 'by ElevenLabs Inc.',
    category: 'Voice AI',
    type: 'PLATFORM',
    description: 'Voice AI research platform creating the most lifelike speech synthesis, real-time voice cloning, and interactive low-latency conversational AI agents.',
    bullets: [
      'Ultra-realistic voice synthesis & emotion tuning',
      'Sub-200ms conversational voice agents'
    ],
    allBullets: [
      'Ultra-realistic voice synthesis & emotion tuning',
      'Sub-200ms conversational voice agents',
      'Zero-shot voice cloning from 1-minute audio',
      'Multilingual dubbing across 29 languages',
      'Native WebRTC audio streaming SDK'
    ],
    statusText: 'Commercial Verified',
    statusType: 'commercial',
    iconColor: 'text-white',
    iconBg: 'bg-zinc-900 border-zinc-800',
    iconSymbol: '|||',
    contextWindow: 'Audio Stream Native',
    pricing: 'Usage-based / $0.15/min audio'
  },
  {
    id: 'github-copilot',
    name: 'GitHub Copilot',
    vendor: 'by GitHub & Microsoft',
    category: 'Coding Agents',
    type: 'AI AGENT',
    description: 'The ubiquitous AI pair programmer embedded across Visual Studio Code, IntelliJ, and GitHub CLI, providing inline code completions.',
    bullets: [
      'Context-aware multi-line code autocompletion',
      'Copilot Workspace specification-to-PR workflows'
    ],
    allBullets: [
      'Context-aware multi-line code autocompletion',
      'Copilot Workspace specification-to-PR workflows',
      'CLI shell command translation from natural language',
      'Custom repository knowledge base indexing',
      'Enterprise security & IP indemnity guarantees'
    ],
    statusText: 'Commercial Verified',
    statusType: 'commercial',
    iconColor: 'text-white',
    iconBg: 'bg-zinc-900 border-zinc-800',
    iconSymbol: '⌥',
    contextWindow: 'Editor Buffer Context',
    pricing: '$10/mo Individual / $19 Enterprise'
  },
  {
    id: 'google-gemini',
    name: 'Google Gemini',
    vendor: 'by Google DeepMind',
    category: 'Foundation Models',
    type: 'PLATFORM',
    description: 'Google’s frontier multimodal model family featuring a 2-million-token context window, native audio/video processing, and search grounding.',
    bullets: [
      'Industry-leading 2,000,000 token context window',
      'Native multimodality (audio, video, code, text)'
    ],
    allBullets: [
      'Industry-leading 2,000,000 token context window',
      'Native multimodality (audio, video, code, text)',
      'Live Google Search grounding citations',
      'Direct system instructions and JSON Schema enforcement',
      'Ultra-fast TTFT on Gemini 1.5 Flash'
    ],
    statusText: 'Commercial Verified',
    statusType: 'commercial',
    iconColor: 'text-white',
    iconBg: 'bg-zinc-900 border-zinc-800',
    iconSymbol: '✦',
    contextWindow: '2,000,000 Tokens',
    pricing: '$0.075 / $0.30 per 1M tokens'
  },
  {
    id: 'groq',
    name: 'Groq',
    vendor: 'by Groq Inc.',
    category: 'Open-Source Models',
    type: 'PLATFORM',
    description: 'Creator of the LPU (Language Processing Unit) inference engine, delivering unprecedented 500+ tokens/sec throughput for open-source LLMs.',
    bullets: [
      'Ultra-low latency inference (500+ tokens/second)',
      'Deterministic hardware execution with zero jitter'
    ],
    allBullets: [
      'Ultra-low latency inference (500+ tokens/second)',
      'Deterministic hardware execution with zero jitter',
      'Drop-in OpenAI SDK compatibility',
      'Hosting Llama 3.3 70B, Mixtral, and Whisper v3',
      'Sub-50ms Time-To-First-Token (TTFT)'
    ],
    statusText: 'Commercial Verified',
    statusType: 'commercial',
    iconColor: 'text-white',
    iconBg: 'bg-zinc-900 border-zinc-800',
    iconSymbol: '⚡',
    contextWindow: '128K Tokens',
    pricing: '$0.59 / $0.79 per 1M tokens'
  },
  {
    id: 'hugging-face',
    name: 'Hugging Face',
    vendor: 'by Hugging Face Inc.',
    category: 'Open-Source Models',
    type: 'PLATFORM',
    description: 'The global open-source AI community and model repository hosting over 1,000,000 open weights models, datasets, and serverless inference endpoints.',
    bullets: [
      'The open standard for AI model distribution',
      'Transformers & Diffusers Python libraries'
    ],
    allBullets: [
      'The open standard for AI model distribution',
      'Transformers & Diffusers Python libraries',
      'Inference Endpoints with dedicated GPU deployments',
      'Community evaluation leaderboards (Open LLM Leaderboard)',
      'Spaces for interactive Streamlit/Gradio web apps'
    ],
    statusText: 'Open Source',
    statusType: 'open-source',
    iconColor: 'text-white',
    iconBg: 'bg-zinc-900 border-zinc-800',
    iconSymbol: '🤗',
    contextWindow: 'Catalog Dependent',
    pricing: 'Free Community / GPU Hourly'
  },
  {
    id: 'meta-llama',
    name: 'Meta Llama',
    vendor: 'by Meta Platforms Inc.',
    category: 'Open-Source Models',
    type: 'PLATFORM',
    description: 'The world’s most widely adopted family of open weights models (Llama 3.1 & 3.3), enabling private enterprise deployment and fine-tuning.',
    bullets: [
      'Leading open-weights model family (8B, 70B, 405B)',
      'Full parameter fine-tuning and weight sovereignty'
    ],
    allBullets: [
      'Leading open-weights model family (8B, 70B, 405B)',
      'Full parameter fine-tuning and weight sovereignty',
      '128K context window across all sizes',
      'Multilingual support across 8+ major languages',
      'Permissive Llama Community License'
    ],
    statusText: 'Open Weights',
    statusType: 'open-source',
    iconColor: 'text-white',
    iconBg: 'bg-zinc-900 border-zinc-800',
    iconSymbol: '∞',
    contextWindow: '128K Tokens',
    pricing: 'Free Weights / Self-hosted'
  },
  {
    id: 'mistral-ai',
    name: 'Mistral AI',
    vendor: 'by Mistral AI SAS',
    category: 'Open-Source Models',
    type: 'PLATFORM',
    description: 'European AI pioneer building high-efficiency open models (Mistral Large 2, Codestral, Pixtral) with competitive reasoning at compact sizes.',
    bullets: [
      'Codestral 22B specialized for 80+ programming languages',
      'Apache 2.0 open-weights licensing on foundational models'
    ],
    allBullets: [
      'Codestral 22B specialized for 80+ programming languages',
      'Apache 2.0 open-weights licensing on foundational models',
      'Mistral Large 2 frontier reasoning with 128K context',
      'La Plateforme managed enterprise API',
      'High reasoning density per GPU FLOP'
    ],
    statusText: 'MIT / Apache 2.0',
    statusType: 'mit',
    iconColor: 'text-white',
    iconBg: 'bg-zinc-900 border-zinc-800',
    iconSymbol: '◬',
    contextWindow: '128K Tokens',
    pricing: '$2.00 / $6.00 per 1M tokens'
  },
  {
    id: 'openai-gpt',
    name: 'OpenAI GPT & o-Series',
    vendor: 'by OpenAI LLC',
    category: 'Foundation Models',
    type: 'PLATFORM',
    description: 'Pioneers of generative AI, creators of GPT-4o, ChatGPT, and the o1/o3 reasoning model series that uses chain-of-thought reinforcement learning.',
    bullets: [
      'o1 & o3 frontier reasoning through deliberate planning',
      'GPT-4o real-time voice, vision, and text multimodality'
    ],
    allBullets: [
      'o1 & o3 frontier reasoning through deliberate planning',
      'GPT-4o real-time voice, vision, and text multimodality',
      'Structured Outputs guarantee valid JSON conforming to schemas',
      'Assistants API with code interpreter and file search',
      'Enterprise fine-tuning and prompt caching'
    ],
    statusText: 'Commercial Verified',
    statusType: 'commercial',
    iconColor: 'text-white',
    iconBg: 'bg-zinc-900 border-zinc-800',
    iconSymbol: '✳',
    contextWindow: '128K Tokens',
    pricing: '$2.50 / $10.00 per 1M tokens'
  },
  {
    id: 'perplexity-ai',
    name: 'Perplexity AI',
    vendor: 'by Perplexity AI Inc.',
    category: 'Search & RAG',
    type: 'AI AGENT',
    description: 'An AI-native conversational answer engine that performs multi-source web indexing to provide grounded answers with citations.',
    bullets: [
      'Real-time live web indexing and multi-source citations',
      'Sonar API with structured answer grounding'
    ],
    allBullets: [
      'Real-time live web indexing and multi-source citations',
      'Sonar API with structured answer grounding',
      'Pro Search iterative question decomposition',
      'Zero hallucination verification on current events',
      'Collection spaces for private document indexing'
    ],
    statusText: 'Commercial Verified',
    statusType: 'commercial',
    iconColor: 'text-white',
    iconBg: 'bg-zinc-900 border-zinc-800',
    iconSymbol: '✳',
    contextWindow: '128K Grounded Context',
    pricing: '$1.00 / $5.00 per 1k searches'
  },
  {
    id: 'pinecone',
    name: 'Pinecone',
    vendor: 'by Pinecone Systems Inc.',
    category: 'Search & RAG',
    type: 'PLATFORM',
    description: 'Serverless vector database engineered for enterprise Retrieval-Augmented Generation (RAG) and high-throughput semantic similarity search.',
    bullets: [
      'Serverless architecture scaling to billions of vectors',
      'Sub-50ms similarity search with metadata filtering'
    ],
    allBullets: [
      'Serverless architecture scaling to billions of vectors',
      'Sub-50ms similarity search with metadata filtering',
      'Integrated text embedding generation pipeline',
      'SOC2 Type II enterprise compliance',
      'Drop-in integration with LangChain, LlamaIndex, and Nexus Router'
    ],
    statusText: 'Commercial Verified',
    statusType: 'commercial',
    iconColor: 'text-white',
    iconBg: 'bg-zinc-900 border-zinc-800',
    iconSymbol: '🌲',
    contextWindow: 'Vector Index Native',
    pricing: 'Usage-based / $0.04 per RCU-hr'
  },
  {
    id: 'v0-dev',
    name: 'v0 by Vercel',
    vendor: 'by Vercel Inc.',
    category: 'Coding Agents',
    type: 'AI AGENT',
    description: 'Generative UI development tool that converts natural language prompts and screenshots into production-grade React components using Tailwind CSS.',
    bullets: [
      'Generates accessible, responsive React & Tailwind components',
      'Interactive visual canvas with iterative live code editing'
    ],
    allBullets: [
      'Generates accessible, responsive React & Tailwind components',
      'Interactive visual canvas with iterative live code editing',
      'One-click deployment to Vercel preview environments',
      'Figma design copy-paste to functional code',
      'CLI export directly into local Next.js projects'
    ],
    statusText: 'Commercial Verified',
    statusType: 'commercial',
    iconColor: 'text-white',
    iconBg: 'bg-zinc-900 border-zinc-800',
    iconSymbol: '▲',
    contextWindow: 'Component Level',
    pricing: 'Freemium / $20/mo Premium'
  },
  {
    id: 'windsurf',
    name: 'Windsurf Editor',
    vendor: 'by Codeium Inc.',
    category: 'Coding Agents',
    type: 'AI AGENT',
    description: 'Agentic IDE designed for software engineers with "Cascade" flows, allowing the model to inspect terminals, evaluate errors, and write full codebases.',
    bullets: [
      'Cascade Agent: deep codebase context reasoning',
      'Integrated terminal monitoring and auto-fix triggers'
    ],
    allBullets: [
      'Cascade Agent: deep codebase context reasoning',
      'Integrated terminal monitoring and auto-fix triggers',
      'Real-time collaborative AI pair programming',
      'Supercomplete intelligent multi-line prediction',
      'Enterprise on-premise deployment support'
    ],
    statusText: 'Free Verified',
    statusType: 'free',
    iconColor: 'text-white',
    iconBg: 'bg-zinc-900 border-zinc-800',
    iconSymbol: '🏄',
    contextWindow: 'Repository Context',
    pricing: 'Free Tier / $15/mo Pro'
  }
];

interface ExploreModelsProps {
  onBackToGateway: () => void;
  onOpenPlaygroundWithModel?: (modelId: string) => void;
  initialSearchQuery?: string;
  showShortlistLoader?: boolean;
}

export const ExploreModels: React.FC<ExploreModelsProps> = ({ 
  onBackToGateway,
  onOpenPlaygroundWithModel,
  initialSearchQuery = '',
  showShortlistLoader = true
}) => {
  const [isLoading, setIsLoading] = useState(showShortlistLoader);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [detailModalItem, setDetailModalItem] = useState<EcosystemItem | null>(null);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [liveModels, setLiveModels] = useState<EcosystemItem[]>([]);
  const [recommendationSummary, setRecommendationSummary] = useState<RecommendationSummaryItem | null>(null);

  useEffect(() => {
    // 1. Fetch real catalogue models
    apiClient.getModels().then(({ items }) => {
      if (items && items.length > 0) {
        const liveItems: EcosystemItem[] = items.map(m => ({
          id: m.id,
          name: m.name,
          vendor: `by ${m.provider.toUpperCase()}`,
          category: m.tier === 'flagship' ? 'Foundation Models' : m.tier === 'balanced' ? 'Coding Agents' : 'Open-Source Models',
          type: 'PLATFORM' as const,
          isNew: true,
          description: `Canonical catalogue model in tier "${m.tier}". Input: $${m.costPer1kInput}/1k, Output: $${m.costPer1kOutput}/1k. Context window: ${m.contextWindow.toLocaleString()} tokens.`,
          bullets: [
            `Supported tasks: ${m.supportedTasks.slice(0, 3).join(', ')}`,
            `Context window: ${m.contextWindow.toLocaleString()} tokens`,
          ],
          allBullets: [
            `Provider: ${m.provider.toUpperCase()}`,
            `Tier: ${m.tier}`,
            `Context window: ${m.contextWindow.toLocaleString()} tokens`,
            `Input Cost: $${m.costPer1kInput}/1k tokens`,
            `Output Cost: $${m.costPer1kOutput}/1k tokens`,
            `Capabilities: ${m.capabilities.join(', ')}`,
          ],
          statusText: `${m.provider.toUpperCase()} Verified`,
          statusType: 'commercial' as const,
          iconColor: 'text-amber-400',
          iconBg: 'bg-amber-950/40 border-amber-500/30',
          iconSymbol: '⚡',
          contextWindow: `${m.contextWindow.toLocaleString()} Tokens`,
          pricing: `$${m.costPer1kInput} / $${m.costPer1kOutput} per 1k tokens`,
        }));
        setLiveModels(liveItems);
      }
    }).catch(() => {});

    // 2. Fetch real task recommendations if query exists
    if (initialSearchQuery.trim()) {
      apiClient.recommendTask({ prompt: initialSearchQuery }).then(res => {
        setRecommendationSummary(res);
      }).catch(() => {});
    }
  }, [initialSearchQuery]);

  const filteredItems = useMemo(() => {
    const combined = [...liveModels, ...ECOSYSTEM_DATA];
    return combined.filter(item => {
      const matchesSearch = 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.vendor.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      const matchesType = selectedType === 'All' || item.type === selectedType;

      return matchesSearch && matchesCategory && matchesType;
    });
  }, [searchQuery, selectedCategory, selectedType, liveModels]);

  // If loading: display the animated concentric ripple circle loader in black & white SaaS style
  if (isLoading) {
    return (
      <ModelShortlistLoader
        taskQuery={initialSearchQuery || searchQuery}
        onComplete={() => setIsLoading(false)}
      />
    );
  }

  const categories = [
    'All',
    'Coding Agents',
    'Foundation Models',
    'Open-Source Models',
    'Voice AI',
    'Search & RAG'
  ];

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedCardId(expandedCardId === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-white selection:text-black antialiased flex flex-col">
      
      {/* AI Recommendation Banner if triggered by task exploration */}
      {recommendationSummary && (
        <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-4 w-full">
          <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Task: {recommendationSummary.requirements.taskType.toUpperCase()}
                </span>
                <span className="text-xs text-stone-400">
                  Complexity: {recommendationSummary.requirements.complexity} · Optimization: {recommendationSummary.requirements.optimization}
                </span>
              </div>
              <h4 className="text-sm font-semibold text-white">
                Top Recommendation: <span className="text-amber-400">{recommendationSummary.topRecommendation?.candidate?.name || 'Deterministic Choice'}</span>
              </h4>
              <p className="text-xs text-stone-300 mt-0.5">
                {recommendationSummary.explanation?.rationale || 'Optimal match based on current routing policy and constraints.'}
              </p>
            </div>
            {recommendationSummary.topRecommendation && onOpenPlaygroundWithModel && (
              <button
                onClick={() => onOpenPlaygroundWithModel(recommendationSummary.topRecommendation.candidate.id)}
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold transition-all shrink-0 cursor-pointer"
              >
                Run on Playground →
              </button>
            )}
          </div>
        </div>
      )}

      {/* 1. Top Navbar (Standard Monochrome SaaS Header) */}
      <header className="sticky top-0 z-40 w-full bg-black/90 backdrop-blur-md border-b border-zinc-800/80 px-4 sm:px-8 py-3">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          
          {/* Left Actions: Back to Gateway + ModelRouter Badge */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={onBackToGateway}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-200 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Gateway</span>
            </button>

            {/* ModelRouter Badge (Monochrome Standard SaaS) */}
            <div className="flex items-center gap-2 pl-1">
              <div className="w-6 h-6 rounded bg-white text-black flex items-center justify-center font-bold text-[10px] tracking-wider shadow-sm font-mono">
                MR
              </div>
              <div className="hidden md:flex flex-col">
                <span className="text-xs font-bold tracking-wider text-white font-mono leading-none">
                  MODELROUTER
                </span>
                <span className="text-[9px] text-zinc-400 font-mono tracking-widest leading-none mt-0.5">
                  INTELLIGENT GATEWAY
                </span>
              </div>

              <span className="ml-2 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-zinc-300 uppercase tracking-widest hidden lg:inline">
                AI AGENT MANUAL
              </span>
            </div>
          </div>

          {/* Center Search Bar */}
          <div className="flex-1 max-w-xl mx-0 sm:mx-4 relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search AI platforms and agents..."
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-zinc-900/80 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all shadow-inner"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Right Controls: Filter button + Grid/List View Toggle */}
          <div className="flex items-center gap-2 justify-end shrink-0">
            {/* Filter Toggle */}
            <div className="relative">
              <button
                onClick={() => setFilterMenuOpen(!filterMenuOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <Filter className="w-3.5 h-3.5 text-zinc-300" />
                <span>Filter</span>
                <ChevronDown className="w-3 h-3 text-zinc-500" />
              </button>

              {/* Filter Dropdown */}
              {filterMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 p-3 rounded-xl bg-zinc-950 border border-zinc-800 shadow-2xl z-50 text-xs space-y-2">
                  <div className="font-semibold text-zinc-300 pb-1 border-b border-zinc-800">
                    Filter by Type
                  </div>
                  <div className="space-y-1">
                    {['All', 'PLATFORM', 'AI AGENT'].map(t => (
                      <button
                        key={t}
                        onClick={() => {
                          setSelectedType(t);
                          setFilterMenuOpen(false);
                        }}
                        className={`w-full text-left px-2 py-1.5 rounded transition-colors ${
                          selectedType === t ? 'bg-white text-black font-semibold' : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
                        }`}
                      >
                        {t === 'All' ? 'All Types' : t === 'PLATFORM' ? 'Foundation Platforms' : 'Autonomous AI Agents'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Grid / List View Toggle */}
            <div className="flex items-center p-0.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded transition-colors cursor-pointer ${
                  viewMode === 'grid' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-400 hover:text-white'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded transition-colors cursor-pointer ${
                  viewMode === 'list' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-400 hover:text-white'
                }`}
                title="List View"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </div>
      </header>

      {/* 2. Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-6">
        
        {/* Shortlisted Models Banner when filtered */}
        {searchQuery && (
          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xl animate-in fade-in duration-300">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-white flex items-center gap-2">
                  <span>AI Shortlist Active for:</span>
                  <span className="text-white font-mono font-bold underline underline-offset-2">&quot;{searchQuery}&quot;</span>
                </div>
                <div className="text-[11px] text-zinc-400 mt-0.5">
                  Showing {filteredItems.length} candidate model{filteredItems.length === 1 ? '' : 's'} matching required capabilities and latency policies.
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setIsLoading(true)}
                className="px-3.5 py-1.5 rounded-lg bg-white text-black font-semibold text-xs hover:bg-zinc-200 transition-colors cursor-pointer shadow-sm"
              >
                Re-scan Shortlist
              </button>
              <button
                onClick={() => setSearchQuery('')}
                className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 hover:text-white transition-colors cursor-pointer"
              >
                Show All Models
              </button>
            </div>
          </div>
        )}

        {/* Hero Section Banner (Standard SaaS Black & White) */}
        <section className="relative rounded-2xl p-6 sm:p-8 bg-zinc-950 border border-zinc-800/80 shadow-2xl overflow-hidden">
          
          {/* Subtle soft white ambient blur in background */}
          <div className="absolute top-0 right-0 w-[450px] h-[250px] bg-white/[0.03] blur-[100px] pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            
            {/* Left Title Area */}
            <div className="max-w-2xl">
              {/* Eyebrow Kicker */}
              <div className="flex items-center gap-2 mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-widest font-semibold">
                  AI AGENT DIRECTORY / MANUAL DASHBOARD
                </span>
                <span className="px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-zinc-300">
                  VERIFIED DIRECTORY
                </span>
              </div>

              {/* Large Display Title in Clean Monochrome */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white mb-3 font-display">
                Explore the <span className="italic font-serif font-normal text-zinc-300">AI Ecosystem.</span>
              </h1>

              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-xl font-light">
                Discover AI platforms, understand their capabilities, and explore the agents and tools that power modern intelligent applications.
              </p>
            </div>

            {/* Right 4 Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:w-[480px] shrink-0 p-3 rounded-xl bg-black border border-zinc-800 shadow-inner">
              
              <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800">
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 mb-1">
                  <Layers className="w-3 h-3 text-zinc-300" />
                  <span>Total Platforms</span>
                </div>
                <div className="text-xl font-bold text-white font-mono">7</div>
                <div className="text-[10px] text-zinc-500">Core Foundations</div>
              </div>

              <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800">
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 mb-1">
                  <Bot className="w-3 h-3 text-zinc-300" />
                  <span>Available Agents</span>
                </div>
                <div className="text-xl font-bold text-white font-mono">18</div>
                <div className="text-[10px] text-zinc-500">Autonomous & Tools</div>
              </div>

              <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800">
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 mb-1">
                  <Boxes className="w-3 h-3 text-zinc-300" />
                  <span>Categories</span>
                </div>
                <div className="text-xl font-bold text-white font-mono">8</div>
                <div className="text-[10px] text-zinc-500">Domains Covered</div>
              </div>

              <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800">
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 mb-1">
                  <Sparkles className="w-3 h-3 text-zinc-300" />
                  <span>Recently Added</span>
                </div>
                <div className="text-xl font-bold text-white font-mono">5</div>
                <div className="text-[10px] text-zinc-500">Latest Frontier</div>
              </div>

            </div>

          </div>
        </section>

        {/* 3. Filter & Category Selection Bar */}
        <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-800/80">
          
          <div className="text-xs text-zinc-400">
            Showing <strong className="text-white font-mono">{filteredItems.length}</strong> of 15 verified platforms & agents
          </div>

          {/* Category Chips Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-white text-black font-semibold shadow-sm border border-white'
                    : 'bg-zinc-900/80 text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

        </section>

        {/* 4. The Ecosystem Cards Grid / List (Standard SaaS Black & White) */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {filteredItems.map((item) => {
              const isExpanded = expandedCardId === item.id;
              const displayBullets = isExpanded ? item.allBullets || item.bullets : item.bullets;

              return (
                <div
                  key={item.id}
                  onClick={() => setDetailModalItem(item)}
                  className="rounded-2xl p-5 bg-zinc-950 border border-zinc-800/80 hover:border-zinc-600 transition-all flex flex-col justify-between shadow-xl cursor-pointer hover:-translate-y-1 group relative min-h-[410px]"
                >
                  <div>
                    {/* Card Top: Brand Icon + Category Tag + Type Tag */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      {/* Icon */}
                      <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-base text-white shadow-sm shrink-0">
                        {item.iconSymbol}
                      </div>

                      {/* Badges Lockup */}
                      <div className="flex flex-col items-end gap-1">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-zinc-900 border border-zinc-800 text-zinc-300">
                          {item.category === 'Coding Agents' ? `</> ${item.category}` : item.category === 'Voice AI' ? `🎙 ${item.category}` : item.category}
                        </span>
                        <span className="text-[9px] font-mono font-bold tracking-wider text-zinc-500 uppercase">
                          {item.type}
                        </span>
                      </div>
                    </div>

                    {/* Title + Vendor + (NEW badge) */}
                    <div className="mb-2">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-base font-bold text-white group-hover:text-zinc-200 transition-colors font-display">
                          {item.name}
                        </h3>
                        {item.isNew && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold font-mono bg-white text-black">
                            NEW
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-zinc-400 block mt-0.5">
                        {item.vendor}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-zinc-400 leading-relaxed mb-4 line-clamp-3 font-light">
                      {item.description}
                    </p>

                    {/* Bullet Points */}
                    <div className="space-y-1.5 text-[11px] text-zinc-300 mb-3 bg-zinc-900/50 p-2.5 rounded-lg border border-zinc-800/80">
                      {displayBullets.map((bullet, idx) => (
                        <div key={idx} className="flex items-start gap-1.5 leading-tight">
                          <span className="text-zinc-500 shrink-0">•</span>
                          <span className="truncate">{bullet}</span>
                        </div>
                      ))}
                      
                      {/* "+3 more" toggle button */}
                      {item.allBullets && item.allBullets.length > item.bullets.length && (
                        <button
                          onClick={(e) => toggleExpand(item.id, e)}
                          className="text-[10px] text-zinc-400 hover:text-white font-mono mt-1 block cursor-pointer transition-colors"
                        >
                          {isExpanded ? 'Show less' : `+${item.allBullets.length - item.bullets.length} more`}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Card Bottom: Verification Status + "View Details ->" */}
                  <div className="pt-3 border-t border-zinc-850 flex items-center justify-between text-xs mt-2">
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      <span className="text-zinc-400 font-medium">{item.statusText}</span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDetailModalItem(item);
                      }}
                      className="text-zinc-300 hover:text-white text-xs font-semibold flex items-center gap-1 transition-colors group-hover:translate-x-0.5"
                    >
                      <span>View Details</span>
                      <span>→</span>
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        ) : (
          /* List View */
          <div className="space-y-3">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                onClick={() => setDetailModalItem(item)}
                className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all cursor-pointer hover:bg-zinc-900/60"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-lg text-white shrink-0">
                    {item.iconSymbol}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-white font-display">
                        {item.name}
                      </h3>
                      {item.isNew && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold font-mono bg-white text-black">
                          NEW
                        </span>
                      )}
                      <span className="text-xs text-zinc-400">{item.vendor}</span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-1 max-w-2xl line-clamp-2 font-light">
                      {item.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right hidden sm:block">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 block">
                      {item.category}
                    </span>
                    <span className="text-[11px] text-zinc-400 mt-1 block">
                      {item.statusText}
                    </span>
                  </div>
                  <button className="text-zinc-300 hover:text-white text-xs font-semibold flex items-center gap-1">
                    <span>View Details</span>
                    <span>→</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </main>

      {/* 5. Detail Modal when clicking "View Details" */}
      {detailModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-2xl p-6 sm:p-8 text-left shadow-2xl text-zinc-200 max-h-[90vh] overflow-y-auto">
            
            <button
              onClick={() => setDetailModalItem(null)}
              className="absolute top-5 right-5 p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-white transition-colors cursor-pointer border border-zinc-800"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-xl text-white shrink-0">
                {detailModalItem.iconSymbol}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-white font-display">
                    {detailModalItem.name}
                  </h3>
                  {detailModalItem.isNew && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-white text-black">
                      NEW FRONTIER
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400">{detailModalItem.vendor}</p>
              </div>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2 mb-6">
              <span className="px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300">
                Category: {detailModalItem.category}
              </span>
              <span className="px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300">
                Type: {detailModalItem.type}
              </span>
              <span className="px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 text-xs font-mono text-white">
                {detailModalItem.statusText}
              </span>
            </div>

            {/* Description */}
            <div className="mb-6 p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs sm:text-sm text-zinc-300 leading-relaxed font-light">
              {detailModalItem.description}
            </div>

            {/* Key Capabilities */}
            <div className="mb-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3 font-mono">
                Key Verified Capabilities
              </h4>
              <div className="space-y-2 text-xs">
                {(detailModalItem.allBullets || detailModalItem.bullets).map((bullet, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-zinc-900/50 border border-zinc-800/80 text-zinc-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0 mt-0.5" />
                    <span>{bullet}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Technical Specifications */}
            <div className="grid grid-cols-2 gap-3 mb-6 p-3 rounded-xl bg-zinc-900/50 border border-zinc-800 text-xs">
              <div>
                <span className="text-[10px] text-zinc-500 font-mono block">Context Window</span>
                <span className="text-sm font-bold text-white font-mono mt-0.5 block">
                  {detailModalItem.contextWindow || '128K Tokens'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 font-mono block">Pricing Model</span>
                <span className="text-sm font-bold text-zinc-200 font-mono mt-0.5 block">
                  {detailModalItem.pricing || 'Standard Gateway Routing'}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-zinc-800">
              <span className="text-xs text-zinc-500">
                Available via NEXUS ROUTER Gateway SDK
              </span>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={() => setDetailModalItem(null)}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-xs font-medium text-zinc-300 transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setDetailModalItem(null);
                    if (onOpenPlaygroundWithModel) {
                      onOpenPlaygroundWithModel(detailModalItem.id);
                    }
                  }}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-white text-black hover:bg-zinc-200 text-xs font-semibold shadow-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Test in Playground</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
