"use client";
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  User, 
  Bot, 
  Plus, 
  Mic, 
  Activity, 
  Search, 
  Star, 
  Zap, 
  Check, 
  X, 
  GripVertical,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Send
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

import { TestSessionResult } from './TestResults';

import { apiClient, type RunRecordItem } from '../lib/client/api';

interface ModelItem {
  id: string;
  name: string;
  shortName: string;
  rank: string;
  match: string;
  desc: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  toolCall?: {
    name: string;
    status: 'running' | 'done';
  };
}

const CANONICAL_DEFAULT_MODELS: ModelItem[] = [
  { 
    id: 'auto-router', 
    name: 'Nexus Router (Auto)', 
    shortName: 'Auto',
    rank: '#1 Intelligent', 
    match: 'Deterministic', 
    desc: 'Dynamic constraint-aware routing across latency, cost, and quality tiers.' 
  },
  { 
    id: 'llama-3.3-70b-versatile', 
    name: 'Llama 3.3 70B Versatile', 
    shortName: 'Llama 70B',
    rank: '#2 Flagship', 
    match: 'Groq Cloud', 
    desc: 'High-throughput reasoning, coding, and general tasks on Groq LPU.' 
  },
  { 
    id: 'sim-basic-fast', 
    name: 'Simulator: Basic Fast', 
    shortName: 'Fast Sim',
    rank: '#3 Budget', 
    match: 'Offline Sim', 
    desc: 'Deterministic low-latency offline simulator for high-throughput testing.' 
  },
  { 
    id: 'sim-quality-pro', 
    name: 'Simulator: Quality Pro', 
    shortName: 'Pro Sim',
    rank: '#4 Flagship', 
    match: 'Offline Sim', 
    desc: 'High-quality reasoning simulator with comprehensive synthetic outputs.' 
  },
  { 
    id: 'sim-code-specialist', 
    name: 'Simulator: Code Specialist', 
    shortName: 'Code Sim',
    rank: '#5 Balanced', 
    match: 'Offline Sim', 
    desc: 'Specialized code generation simulator with full deterministic outputs.' 
  }
];

function getModelConfigForResult(model: ModelItem, runRecord?: RunRecordItem | null) {
  const modelId = runRecord?.selectedModelId || model.id;
  const isSim = modelId.startsWith('sim-');
  return {
    name: model.name,
    provider: isSim ? 'Nexus Simulator' : 'Groq',
    catalogueId: modelId,
    version: '2026-Q1',
    contextLimit: isSim ? '32,000 tokens' : '128,000 tokens',
    maxOutputTokens: '8,192 tokens',
    modalities: ['Text'],
    temperature: 0.7,
  };
}

interface PlaygroundProps {
  onBackToLanding: () => void;
  onEndTesting: (result: TestSessionResult) => void;
}

export const Playground: React.FC<PlaygroundProps> = ({ onBackToLanding, onEndTesting }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [modelsList, setModelsList] = useState<ModelItem[]>(CANONICAL_DEFAULT_MODELS);
  const [activeModel, setActiveModel] = useState<ModelItem>(CANONICAL_DEFAULT_MODELS[0]);
  
  const [isPlusActive, setIsPlusActive] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastRunRecord, setLastRunRecord] = useState<RunRecordItem | null>(null);

  // Token Tracking & Limits
  const [tokensUsed, setTokensUsed] = useState(0);
  const MAX_TOKENS = 50000;
  
  // Dynamic Chart Analytics Data
  const [chartData, setChartData] = useState<Array<{ task: string; timeTaken: number; tokens: number }>>([
    { task: 'Init', timeTaken: 120, tokens: 25 },
  ]);

  // Load backend catalogue models on mount
  useEffect(() => {
    apiClient.getModels().then(({ items }) => {
      if (items && items.length > 0) {
        const mapped: ModelItem[] = [
          CANONICAL_DEFAULT_MODELS[0],
          ...items.map((m, idx) => ({
            id: m.id,
            name: m.name,
            shortName: m.name.split(' ')[0] || m.id,
            rank: `#${idx + 2} ${m.tier.toUpperCase()}`,
            match: `${m.provider.toUpperCase()} API`,
            desc: `In: $${m.costPer1kInput}/1k | Out: $${m.costPer1kOutput}/1k | Context: ${m.contextWindow.toLocaleString()} tokens`,
          })),
        ];
        setModelsList(mapped);
      }
    }).catch((err) => {
      console.warn("Could not fetch remote models, using canonical default list", err);
    });
  }, []);

  // Dynamic Chat History
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', sender: 'bot', text: 'Welcome to NEXUS ROUTER Playground. Select a model or keep Auto Router enabled to test deterministic constraint-aware execution.' },
  ]);

  // Helper to trigger Test Results screen with REAL execution data
  const triggerEndTesting = (reason: string, status: 'Completed' | 'Interrupted' | 'Exhausted' | 'Failed' = 'Completed') => {
    const config = getModelConfigForResult(activeModel, lastRunRecord);
    const now = new Date();
    const endTimeStr = now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
    const startTimeStr = lastRunRecord?.createdAt || new Date(Date.now() - 5 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19) + ' UTC';

    const inputTokens = lastRunRecord?.response?.usage?.inputTokens ?? Math.round(tokensUsed * 0.7);
    const outputTokens = lastRunRecord?.response?.usage?.outputTokens ?? Math.round(tokensUsed * 0.3);
    const totalTokensCount = inputTokens + outputTokens;
    const totalCostValue = lastRunRecord?.response?.usage?.costUsd ?? 0.00012;
    const avgLatencyValue = lastRunRecord?.response?.latencyMs ?? 165;

    const result: TestSessionResult = {
      session: {
        status: status,
        id: lastRunRecord?.id || `run_${Date.now()}`,
        startTime: startTimeStr,
        endTime: endTimeStr,
        terminationReason: reason,
        task: 'Intelligent Inference Execution',
        testMode: activeModel.id === 'auto-router' ? 'Deterministic Router' : 'Direct Model Run',
      },
      modelConfig: config,
      performance: {
        avgLatency: `${avgLatencyValue}`,
        totalTokens: `${totalTokensCount.toLocaleString()}`,
        totalCost: `$${totalCostValue.toFixed(5)}`,
        successRate: lastRunRecord?.status === 'failed' ? '0.0' : '100.0',
      },
      tokenEconomics: {
        usage: {
          input: `${inputTokens.toLocaleString()}`,
          output: `${outputTokens.toLocaleString()}`,
          cached: '0',
          billable: `${totalTokensCount.toLocaleString()}`,
        },
        pricing: {
          inputCost: `$${(totalCostValue * 0.4).toFixed(5)}`,
          outputCost: `$${(totalCostValue * 0.6).toFixed(5)}`,
          cachedDiscount: '$0.00000',
          otherCharges: '$0.00000',
          totalCost: `$${totalCostValue.toFixed(5)}`,
        },
      },
    };

    onEndTesting(result);
  };

  // State for Resizable and Collapsible Sidebar
  const containerRef = useRef<HTMLDivElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const [sidebarWidth, setSidebarWidth] = useState(300); // Default optimal width in px
  const [lastWidth, setLastWidth] = useState(300);
  const [isResizing, setIsResizing] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // State for Drag and Drop
  const [isDragOver, setIsDragOver] = useState(false);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    setIsCollapsed(false);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback((mouseMoveEvent: MouseEvent) => {
    if (isResizing && containerRef.current) {
      const newWidth = mouseMoveEvent.clientX - containerRef.current.getBoundingClientRect().left;
      if (newWidth > 200 && newWidth < 600) {
        setSidebarWidth(newWidth);
      }
    }
  }, [isResizing]);

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  const toggleSidebar = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCollapsed) {
      setSidebarWidth(lastWidth || 300);
      setIsCollapsed(false);
    } else {
      setLastWidth(sidebarWidth);
      setIsCollapsed(true);
    }
  };

  const handleDragStart = (e: React.DragEvent, model: ModelItem) => {
    e.dataTransfer.setData("modelId", model.id);
    e.dataTransfer.effectAllowed = "copyMove";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const modelId = e.dataTransfer.getData("modelId");
    const droppedModel = modelsList.find(m => m.id === modelId);
    if (droppedModel) {
      setActiveModel(droppedModel);
    }
  };

  const filteredModels = modelsList.filter(model => 
    model.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    model.desc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userText = inputValue;
    setInputValue('');

    const newMsgId = Date.now().toString();
    setMessages(prev => [...prev, { id: newMsgId, sender: 'user', text: userText }]);
    setIsLoading(true);

    try {
      let runRecord: RunRecordItem;
      if (activeModel.id === 'auto-router') {
        runRecord = await apiClient.routeTask({ prompt: userText });
      } else {
        runRecord = await apiClient.runPlayground({ prompt: userText, modelId: activeModel.id });
      }

      setLastRunRecord(runRecord);

      const latency = runRecord.response?.latencyMs ?? 185;
      const inputToks = runRecord.response?.usage?.inputTokens ?? 25;
      const outputToks = runRecord.response?.usage?.outputTokens ?? 75;
      const stepTotal = inputToks + outputToks;

      const newTotalTokens = tokensUsed + stepTotal;
      setTokensUsed(newTotalTokens);

      setChartData(prev => [
        ...prev,
        { task: `Step ${prev.length}`, timeTaken: latency, tokens: stepTotal },
      ]);

      let botText = runRecord.response?.output || '';
      if (runRecord.status === 'no_eligible_model') {
        const reasons = Object.entries(runRecord.routingDecision?.rejectionReasons || {})
          .map(([mod, r]) => `• ${mod}: ${r}`)
          .join('\n');
        botText = `[Deterministic Router: No Eligible Model]\n${reasons || 'All models exceeded constraints.'}`;
      } else if (runRecord.status === 'fallback_exhausted') {
        botText = `[Deterministic Router: Fallback Exhausted] Initial and fallback models failed.`;
      }

      const activeLabel = runRecord.selectedModelId || activeModel.name;

      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'bot',
          text: botText,
          toolCall: {
            name: `model: ${activeLabel} (${latency}ms)`,
            status: 'done',
          },
        },
      ]);

      if (newTotalTokens >= MAX_TOKENS) {
        setTimeout(() => {
          triggerEndTesting(
            `Token limit exhausted for session (${newTotalTokens.toLocaleString()} / ${MAX_TOKENS.toLocaleString()} tokens)`,
            'Exhausted',
          );
        }, 1200);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Execution failed';
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'bot',
          text: `[Error] ${message}`,
        },
      ]);
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`flex h-screen w-full bg-zinc-950 text-zinc-100 font-sans overflow-hidden selection:bg-blue-500/30 ${isResizing ? 'cursor-col-resize select-none' : ''}`}
    >
      
      {/* Left Column - Model Selection Sidebar */}
      <div 
        style={{ width: isCollapsed ? '0px' : `${sidebarWidth}px` }}
        className={`bg-zinc-900 relative z-10 shadow-xl shrink-0 overflow-hidden ${!isResizing ? 'transition-[width] duration-300 ease-in-out' : ''}`}
      >
        {/* Inner container to prevent content from reflowing during collapse */}
        <div 
          style={{ width: `${isCollapsed ? lastWidth : sidebarWidth}px` }}
          className="h-full flex flex-col"
        >
          {/* Sidebar Header & Search */}
          <div className="p-6 border-b border-zinc-800 bg-zinc-900/95 sticky top-0 backdrop-blur-sm z-20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-zinc-100">Models</h2>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-blue-950 text-cyan-300 border border-blue-500/30">
                Nexus Router
              </span>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input 
                type="text" 
                placeholder="Search models..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg pl-10 pr-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-500 transition-all outline-none"
              />
            </div>
            <p className="text-[11px] text-zinc-500 mt-3 text-center uppercase tracking-wider font-semibold">
              Drag a model into the chat to select
            </p>
          </div>

          {/* Model List (Draggable) */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {filteredModels.map((model) => {
              const isActive = activeModel.id === model.id;
              return (
                <div
                  key={model.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, model)}
                  onClick={() => setActiveModel(model)}
                  className={`w-full text-left p-4 rounded-xl border transition-all duration-200 cursor-grab active:cursor-grabbing group ${
                    isActive 
                      ? 'bg-blue-900/20 border-blue-500/50 shadow-sm shadow-blue-900/20' 
                      : 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <GripVertical size={16} className="text-zinc-600 opacity-50 group-hover:opacity-100" />
                      <h3 className={`font-medium ${isActive ? 'text-blue-400' : 'text-zinc-200 group-hover:text-zinc-100'}`}>
                        {model.name}
                      </h3>
                    </div>
                    {isActive && <Star size={16} className="text-blue-500 fill-blue-500 shrink-0" />}
                  </div>
                  
                  <div className="flex items-center gap-2 mb-2 text-xs font-semibold pl-6">
                    <span className="text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded text-[11px] tracking-wide">
                      {model.match}
                    </span>
                    <span className="text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded text-[11px] tracking-wide">
                      {model.rank}
                    </span>
                  </div>
                  
                  <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2 pl-6">
                    {model.desc}
                  </p>
                </div>
              );
            })}
            {filteredModels.length === 0 && (
              <div className="text-center text-zinc-500 text-sm py-10">
                No models found matching "{searchQuery}"
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Resizable Divider */}
      <div 
        onMouseDown={startResizing}
        className="relative w-1.5 bg-zinc-900 border-x border-zinc-800 hover:bg-blue-500/50 active:bg-blue-500 cursor-col-resize z-30 transition-colors flex items-center justify-center shrink-0"
      >
        <div className="h-8 w-0.5 bg-zinc-700 rounded-full pointer-events-none" />
        
        {/* Sidebar Toggle Button */}
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={toggleSidebar}
          className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 w-6 h-6 flex items-center justify-center bg-zinc-800 border border-zinc-700 rounded-full z-40 hover:bg-zinc-700 hover:text-zinc-100 text-zinc-400 shadow-lg transition-transform hover:scale-110 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Right Column - Chat & Testing Arena */}
      <div 
        className="flex-1 flex flex-col h-full relative bg-zinc-950 min-w-0"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        
        {/* Drop Zone Overlay */}
        {isDragOver && (
          <div className="absolute inset-0 z-30 bg-blue-500/10 border-2 border-dashed border-blue-500/50 m-4 rounded-2xl flex items-center justify-center backdrop-blur-[2px] pointer-events-none">
            <div className="bg-zinc-900/90 text-blue-400 px-6 py-4 rounded-xl font-medium shadow-2xl flex items-center gap-3 border border-blue-500/30">
              <Zap size={24} className="text-blue-400" />
              Drop {activeModel.name} here to switch
            </div>
          </div>
        )}

        {/* Top Toolbar */}
        <div className="h-16 shrink-0 flex items-center justify-between px-6 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md z-10 gap-3">
          
          {/* Back to Landing Page Link */}
          <button
            onClick={onBackToLanding}
            className="flex items-center gap-2 text-xs font-semibold text-zinc-300 hover:text-cyan-300 transition-colors px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Back to NEXUS ROUTER</span>
          </button>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 px-4 py-2 rounded-lg transition-colors text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-sm cursor-pointer"
            >
              <Activity size={16} className="text-blue-400" />
              Token tracking
              <span className="font-mono text-blue-300 ml-1 tracking-wider text-xs bg-blue-500/10 px-1.5 py-0.5 rounded">
                [ 12450/50000 ]
              </span>
            </button>

            <button 
              onClick={() => triggerEndTesting(`Token limit exhausted for model ${activeModel.name} (50,000 / 50,000 tokens reached)`, 'Exhausted')}
              className="hidden sm:inline-flex items-center gap-1.5 text-amber-300 border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-2 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer"
              title="Test token quota exhaustion flow"
            >
              <Zap size={13} className="text-amber-400" />
              <span>Exhaust Tokens</span>
            </button>

            <button 
              onClick={() => triggerEndTesting('Manually ended by user', 'Interrupted')}
              className="text-rose-400 border border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10 hover:border-rose-500/60 px-5 py-2 rounded-lg text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-rose-500/40 shadow-sm cursor-pointer"
            >
              End Testing
            </button>
          </div>

        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-8 flex flex-col space-y-8 max-w-4xl mx-auto w-full">
          
          {messages.map((msg) => {
            if (msg.sender === 'user') {
              return (
                <div key={msg.id} className="flex items-start justify-end gap-4 w-full">
                  <div className="bg-blue-600 text-white px-5 py-3 rounded-2xl rounded-tr-sm max-w-[75%] text-sm leading-relaxed shadow-sm">
                    {msg.text}
                  </div>
                  <div className="w-10 h-10 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700 flex items-center justify-center shrink-0 shadow-sm">
                    <User size={20} strokeWidth={2} />
                  </div>
                </div>
              );
            }

            return (
              <div key={msg.id} className="flex items-start justify-start gap-4 w-full">
                <div className="w-10 h-10 rounded-full bg-zinc-200 text-zinc-900 flex items-center justify-center shrink-0 shadow-sm">
                  <Bot size={22} strokeWidth={2.5} />
                </div>
                <div className="flex flex-col gap-3 max-w-[80%]">
                  {msg.toolCall && (
                    <>
                      <div className="bg-zinc-900 border border-zinc-700/80 rounded-full px-4 py-2 flex items-center gap-3 w-fit text-sm shadow-sm hover:bg-zinc-800 transition-colors">
                        <Zap size={15} className="text-yellow-500" fill="currentColor" />
                        <span className="font-mono text-zinc-300">{msg.toolCall.name}</span>
                      </div>
                      
                      <div className="bg-zinc-900 border border-zinc-700/80 rounded-full px-4 py-2 flex items-center gap-3 w-fit text-sm shadow-sm">
                        <Check size={16} className="text-emerald-500" strokeWidth={3} />
                        <span className="font-mono text-zinc-300">{msg.toolCall.name}</span>
                      </div>
                    </>
                  )}

                  <div className="bg-zinc-800 border border-zinc-700/50 text-zinc-200 px-5 py-3 rounded-2xl rounded-tl-sm text-sm leading-relaxed shadow-sm">
                    {msg.text}
                  </div>
                </div>
              </div>
            );
          })}

          <div ref={chatBottomRef} />
        </div>

        {/* Bottom Input Area */}
        <div className="p-6 shrink-0 w-full relative z-20">
          <div className="max-w-4xl mx-auto flex flex-col items-center">
            
            {/* Input Box matching the provided layout */}
            <form 
              onSubmit={handleSendMessage}
              className="w-full bg-[#1e1e1e] border-none rounded-full flex items-center px-4 py-3.5 gap-2 shadow-2xl ring-1 ring-zinc-800/50 focus-within:ring-zinc-600 focus-within:bg-[#252525] transition-all"
            >
              
              <div className="relative flex items-center justify-center">
                {isPlusActive && (
                  <div className="absolute bottom-full mb-4 left-0 bg-zinc-800 border border-zinc-700 text-zinc-100 text-[13px] px-3 py-1.5 rounded-lg whitespace-nowrap shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-200 z-50">
                    Add files
                    <div className="absolute top-full left-3 -mt-[1px] border-4 border-transparent border-t-zinc-700"></div>
                    <div className="absolute top-full left-3 -mt-[2px] border-4 border-transparent border-t-zinc-800"></div>
                  </div>
                )}
                <button 
                  type="button"
                  onClick={() => setIsPlusActive(!isPlusActive)}
                  className={`transition-all duration-300 flex items-center justify-center focus:outline-none p-2 rounded-full cursor-pointer ${
                    isPlusActive 
                      ? 'text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.8)] bg-blue-500/10 scale-110' 
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
                  }`}
                >
                  <Plus size={24} strokeWidth={isPlusActive ? 2.5 : 2} />
                </button>
              </div>
              
              <input 
                type="text" 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={`Ask ${activeModel.name}`} 
                className="bg-transparent flex-1 text-zinc-100 placeholder-zinc-400 focus:outline-none px-2 text-[15px]"
              />
              
              <div className="flex items-center gap-3 pr-2 pl-4">
                {/* Active Model Name Indicator */}
                <span className="text-[14px] text-zinc-400 whitespace-nowrap bg-zinc-800/50 px-2 py-1 rounded-md border border-zinc-700/50 pointer-events-none">
                  {activeModel.shortName}
                </span>
                
                <div className="relative flex items-center justify-center">
                  {isMicActive && (
                    <div className="absolute bottom-full mb-4 right-0 bg-zinc-800 border border-zinc-700 text-zinc-100 text-[13px] px-3 py-1.5 rounded-lg whitespace-nowrap shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-200 z-50">
                      Add audio instructions
                      <div className="absolute top-full right-4 -mt-[1px] border-4 border-transparent border-t-zinc-700"></div>
                      <div className="absolute top-full right-4 -mt-[2px] border-4 border-transparent border-t-zinc-800"></div>
                    </div>
                  )}
                  <button 
                    type="button"
                    onClick={() => {
                      const SpeechRecognition = typeof window !== 'undefined' && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
                      if (SpeechRecognition) {
                        try {
                          setIsMicActive(true);
                          const rec = new SpeechRecognition();
                          rec.onresult = (ev: any) => {
                            const text = Array.from(ev.results).map((r: any) => r[0].transcript).join('');
                            setInputValue(text);
                          };
                          rec.onend = () => setIsMicActive(false);
                          rec.onerror = () => setIsMicActive(false);
                          rec.start();
                        } catch {
                          setIsMicActive(false);
                        }
                      } else {
                        alert('Browser speech recognition is not supported in this browser.');
                      }
                    }}
                    className={`transition-all duration-300 flex items-center justify-center focus:outline-none p-2 rounded-full ml-1 cursor-pointer ${
                      isMicActive 
                        ? 'text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.8)] bg-rose-500/10 scale-110' 
                        : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
                    }`}
                  >
                    <Mic size={20} strokeWidth={isMicActive ? 2.5 : 2} />
                  </button>
                </div>

                {inputValue.trim() && (
                  <button
                    type="submit"
                    className="p-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-md ml-1 cursor-pointer"
                  >
                    <Send size={16} />
                  </button>
                )}
              </div>
            </form>

          </div>
        </div>

      </div>

      {/* Analytics Modal with Recharts */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl w-full max-w-3xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/50">
              <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
                <Activity size={20} className="text-blue-400" />
                Token Usage & Performance Analytics
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 p-1.5 rounded-lg transition-colors focus:outline-none cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 h-[450px] w-full bg-zinc-900">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis 
                    dataKey="task" 
                    stroke="#a1a1aa" 
                    tick={{ fill: '#a1a1aa', fontSize: 13 }} 
                    axisLine={{ stroke: '#3f3f46' }}
                    tickLine={false}
                    dy={15}
                  />
                  <YAxis 
                    yAxisId="left" 
                    stroke="#a1a1aa" 
                    tick={{ fill: '#a1a1aa', fontSize: 13 }}
                    axisLine={{ stroke: '#3f3f46' }}
                    tickLine={false}
                    dx={-10}
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right" 
                    stroke="#a1a1aa" 
                    tick={{ fill: '#a1a1aa', fontSize: 13 }}
                    axisLine={{ stroke: '#3f3f46' }}
                    tickLine={false}
                    dx={10}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#18181b', 
                      borderColor: '#3f3f46',
                      borderRadius: '8px',
                      color: '#f4f4f5',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                    itemStyle={{ fontSize: '14px', fontWeight: 500 }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="timeTaken" 
                    name="Time Taken (ms)"
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    dot={{ fill: '#18181b', stroke: '#3b82f6', strokeWidth: 2, r: 5 }}
                    activeDot={{ r: 7, fill: '#3b82f6' }}
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="tokens" 
                    name="Tokens Used"
                    stroke="#10b981" 
                    strokeWidth={3}
                    dot={{ fill: '#18181b', stroke: '#10b981', strokeWidth: 2, r: 5 }}
                    activeDot={{ r: 7, fill: '#10b981' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

          </div>
        </div>
      )}

      {/* Global CSS for scrollbars */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #3f3f46;
          border-radius: 20px;
        }
      `}} />
    </div>
  );
};
