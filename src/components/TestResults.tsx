"use client";
import React, { useState } from 'react';
import { 
  Activity, 
  Box, 
  Clock, 
  Terminal, 
  AlertTriangle, 
  Check, 
  Download, 
  RefreshCw, 
  ArrowLeft, 
  Sliders, 
  Zap,
  CheckCircle2,
  DollarSign,
  Copy
} from 'lucide-react';

export interface TestSessionResult {
  session: {
    status: 'Completed' | 'Interrupted' | 'Exhausted' | 'Failed';
    id: string;
    startTime: string;
    endTime: string;
    terminationReason: string;
    task: string;
    testMode: string;
  };
  modelConfig: {
    name: string;
    provider: string;
    catalogueId: string;
    version: string;
    contextLimit: string;
    maxOutputTokens: string;
    modalities: string[];
    temperature: number;
  };
  performance: {
    avgLatency: string;
    totalTokens: string;
    totalCost: string;
    successRate: string;
  };
  tokenEconomics: {
    usage: {
      input: string;
      output: string;
      cached: string;
      billable: string;
    };
    pricing: {
      inputCost: string;
      outputCost: string;
      cachedDiscount: string;
      otherCharges: string;
      totalCost: string;
    };
  };
}

interface TestResultsProps {
  data?: Partial<TestSessionResult>;
  onRunAgain: () => void;
  onCompareModels: () => void;
  onBackToGateway: () => void;
}

const DEFAULT_MOCK_DATA: TestSessionResult = {
  session: {
    status: 'Completed',
    id: 'run_latest',
    startTime: '2026-10-11 19:00:00 UTC',
    endTime: '2026-10-11 19:00:01 UTC',
    terminationReason: 'Session completed successfully',
    task: 'Deterministic inference execution',
    testMode: 'Deterministic Router'
  },
  modelConfig: {
    name: 'Llama 3.3 70B Versatile',
    provider: 'Groq',
    catalogueId: 'llama-3.3-70b-versatile',
    version: '2026-Q1',
    contextLimit: '128,000 tokens',
    maxOutputTokens: '8,192 tokens',
    modalities: ['Text'],
    temperature: 0.7
  },
  performance: {
    avgLatency: '185',
    totalTokens: '120',
    totalCost: '$0.00012',
    successRate: '100.0'
  },
  tokenEconomics: {
    usage: {
      input: '45',
      output: '75',
      cached: '0',
      billable: '120'
    },
    pricing: {
      inputCost: '$0.00003',
      outputCost: '$0.00009',
      cachedDiscount: '$0.00000',
      otherCharges: '$0.00000',
      totalCost: '$0.00012'
    }
  }
};

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-slate-900 border border-slate-800 rounded-xl p-6 ${className}`}>
    {children}
  </div>
);

const SectionTitle: React.FC<{ title: string; icon?: React.ElementType }> = ({ title, icon: Icon }) => (
  <div className="flex items-center gap-2 mb-4 text-slate-100">
    {Icon && <div className="text-indigo-400"><Icon className="w-5 h-5" /></div>}
    <h2 className="text-lg font-semibold">{title}</h2>
  </div>
);

const Metric: React.FC<{ label: string; value: string; unit?: string; icon?: React.ElementType }> = ({ 
  label, 
  value, 
  unit, 
  icon: Icon 
}) => (
  <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
    <div className="flex items-center gap-2 text-slate-400 mb-2 text-sm font-medium">
      {Icon && <Icon className="w-4 h-4 text-slate-400" />}
      {label}
    </div>
    <div className="flex items-baseline gap-1">
      <span className="text-2xl font-bold text-white font-mono">{value}</span>
      {unit && <span className="text-slate-400 text-sm">{unit}</span>}
    </div>
  </div>
);

const DataRow: React.FC<{ label: string; value: string; isHighlight?: boolean }> = ({ 
  label, 
  value, 
  isHighlight = false 
}) => (
  <div className="flex justify-between items-center py-3 border-b border-slate-800/60 last:border-0">
    <span className="text-sm text-slate-400">{label}</span>
    <span className={`text-sm font-medium ${isHighlight ? 'text-indigo-400 font-semibold font-mono' : 'text-slate-200'}`}>
      {value}
    </span>
  </div>
);

export const TestResults: React.FC<TestResultsProps> = ({
  data,
  onRunAgain,
  onCompareModels,
  onBackToGateway,
}) => {
  const [copied, setCopied] = useState(false);

  // Merge provided data with fallback defaults
  const session = { ...DEFAULT_MOCK_DATA.session, ...data?.session };
  const modelConfig = { ...DEFAULT_MOCK_DATA.modelConfig, ...data?.modelConfig };
  const performance = { ...DEFAULT_MOCK_DATA.performance, ...data?.performance };
  const tokenEconomics = {
    usage: { ...DEFAULT_MOCK_DATA.tokenEconomics.usage, ...data?.tokenEconomics?.usage },
    pricing: { ...DEFAULT_MOCK_DATA.tokenEconomics.pricing, ...data?.tokenEconomics?.pricing }
  };

  const isExhausted = session.status === 'Exhausted' || session.terminationReason.toLowerCase().includes('exhaust');

  const handleExport = () => {
    const report = `# Test Results - ${modelConfig.name}
Session ID: ${session.id}
Status: ${session.status}
Termination Reason: ${session.terminationReason}
Start Time: ${session.startTime}
End Time: ${session.endTime}

## Performance
- Avg Latency: ${performance.avgLatency}ms
- Total Tokens: ${performance.totalTokens}
- Total Cost: $${performance.totalCost} USD
- Success Rate: ${performance.successRate}%

## Model Config
- Model: ${modelConfig.name} (${modelConfig.provider})
- Context Limit: ${modelConfig.contextLimit}
- Max Output: ${modelConfig.maxOutputTokens}

## Token Economics
- Input Tokens: ${tokenEconomics.usage.input}
- Output Tokens: ${tokenEconomics.usage.output}
- Total Billable: ${tokenEconomics.usage.billable}
- Total Cost: ${tokenEconomics.pricing.totalCost}
`;
    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-200 p-4 sm:p-6 lg:p-8 selection:bg-indigo-500/30">
      <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
        
        {/* Navigation Bar back to Gateway */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <button
            onClick={onBackToGateway}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Gateway</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono">
              Model Testing Telemetry
            </span>
            <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold uppercase ${
              isExhausted 
                ? 'bg-amber-950 text-amber-300 border border-amber-500/40' 
                : 'bg-indigo-950 text-indigo-300 border border-indigo-500/40'
            }`}>
              {session.status}
            </span>
          </div>
        </div>

        {/* Header Block */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-display">
                  Test Results
                </h1>
                {isExhausted && (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-950/80 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Token Limit Reached</span>
                  </span>
                )}
              </div>
              <p className="text-slate-400 text-sm">
                Complete performance and cost analysis for your tested model.
              </p>
            </div>
            
            <div className="text-left md:text-right text-sm">
              <div className="text-slate-500 mb-1">
                Session ID: <span className="text-slate-300 font-mono">{session.id}</span>
              </div>
            </div>
          </div>

          {/* Session Overview Bar */}
          <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-4 flex flex-wrap items-center gap-x-8 gap-y-4 text-sm">
            <div>
              <span className="text-slate-500 block mb-1 text-xs font-medium">Start Time</span>
              <span className="text-slate-200 font-mono text-xs">{session.startTime}</span>
            </div>
            <div>
              <span className="text-slate-500 block mb-1 text-xs font-medium">End Time</span>
              <span className="text-slate-200 font-mono text-xs">{session.endTime}</span>
            </div>
            <div>
              <span className="text-slate-500 block mb-1 text-xs font-medium">Termination Reason</span>
              <span className={`text-xs font-medium ${isExhausted ? 'text-amber-300' : 'text-slate-200'}`}>
                {session.terminationReason}
              </span>
            </div>
            <button
              onClick={onBackToGateway}
              className="mt-2 md:mt-0 md:ml-auto w-full md:w-auto inline-flex items-center justify-center px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(99,102,241,0.6)] cursor-pointer"
            >
              Use Model
            </button>
          </div>
        </div>

        {/* Performance at a Glance */}
        <section>
          <SectionTitle title="Performance at a glance" icon={Activity} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Metric label="Avg. Latency" value={performance.avgLatency} unit="ms" icon={Clock} />
            <Metric label="Total Tokens" value={performance.totalTokens} unit="tokens" icon={Terminal} />
            <Metric label="Estimated Cost" value={performance.totalCost} unit="USD" icon={DollarSign} />
            <Metric label="Success Rate" value={performance.successRate} unit="%" icon={Check} />
          </div>
        </section>

        {/* Detailed Panels Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Model Identity & Config */}
          <Card>
            <SectionTitle title="Model Identity & Configuration" icon={Box} />
            <div className="mt-4">
              <div className="flex items-center gap-3 mb-6 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Box className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-white font-semibold text-base">{modelConfig.name}</div>
                  <div className="text-slate-400 text-xs mt-0.5">
                    {modelConfig.provider} · <span className="font-mono text-slate-300">{modelConfig.catalogueId}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-1">
                <DataRow label="Model Version / Snapshot" value={modelConfig.version} />
                <DataRow label="Context Window Limit" value={modelConfig.contextLimit} />
                <DataRow label="Max Output Tokens" value={modelConfig.maxOutputTokens} />
                <DataRow label="Supported Modalities" value={modelConfig.modalities.join(', ')} />
                <DataRow label="Temperature" value={modelConfig.temperature.toString()} />
              </div>
            </div>
          </Card>

          {/* Token Economics */}
          <Card>
            <SectionTitle title="Token Economics" icon={DollarSign} />
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Usage Column */}
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Token Usage</h3>
                <div className="space-y-1">
                  <DataRow label="Input Tokens" value={tokenEconomics.usage.input} />
                  <DataRow label="Output Tokens" value={tokenEconomics.usage.output} />
                  <DataRow label="Cached Input" value={tokenEconomics.usage.cached} />
                  <DataRow label="Total Billable" value={tokenEconomics.usage.billable} isHighlight={true} />
                </div>
              </div>

              {/* Cost Column */}
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Estimated Cost</h3>
                <div className="space-y-1">
                  <DataRow label="Input Cost" value={tokenEconomics.pricing.inputCost} />
                  <DataRow label="Output Cost" value={tokenEconomics.pricing.outputCost} />
                  <DataRow label="Cached Discount" value={tokenEconomics.pricing.cachedDiscount} />
                  <DataRow label="Other Charges" value={tokenEconomics.pricing.otherCharges} />
                  <div className="pt-3 mt-3 border-t border-slate-700">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-slate-300">Total Estimated Cost</span>
                      <span className="text-lg font-bold text-white font-mono">{tokenEconomics.pricing.totalCost}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 text-right">Based on provider API pricing (Oct 2026)</p>
                  </div>
                </div>
              </div>

            </div>
          </Card>

        </div>

        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-xl gap-4">
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <button
              onClick={onRunAgain}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors shadow-sm cursor-pointer w-full sm:w-auto"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Run Test Again</span>
            </button>
            <button
              onClick={onCompareModels}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-medium rounded-lg transition-colors cursor-pointer w-full sm:w-auto"
            >
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span>Compare Models</span>
            </button>
          </div>
          
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-transparent hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-sm font-medium rounded-lg transition-colors w-full sm:w-auto justify-center cursor-pointer"
          >
            {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Download className="w-4 h-4" />}
            <span>{copied ? 'Report Copied to Clipboard!' : 'Export Report'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
