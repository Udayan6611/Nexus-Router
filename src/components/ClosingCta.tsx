"use client";
import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, Sparkles, Mail, Star } from 'lucide-react';

export const ClosingCta: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 5000);
    }
  };

  return (
    <section id="cta" className="relative py-28 px-4 sm:px-8 lg:px-12 overflow-hidden text-center border-t border-amber-500/20">
      
      {/* Central Solar Amber Flare */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[750px] h-[400px] glow-solar-flare blur-[130px] pointer-events-none rounded-full" />

      {/* 1. Featured Testimonial Banner with Golden Arc (Matching Noon's bottom testimonial card) */}
      <div className="relative z-10 max-w-4xl mx-auto mb-20 p-8 sm:p-12 rounded-3xl bg-[#090604] border border-amber-500/30 shadow-[0_0_80px_rgba(245,158,11,0.2)] overflow-hidden">
        {/* Golden Horizon Light Beam Arc */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[650px] h-[200px] horizon-arc blur-[50px] pointer-events-none rounded-full" />
        <div className="absolute top-0 inset-x-0 h-[1px] horizon-line-glow" />

        <div className="relative z-10 space-y-4">
          <div className="flex justify-center gap-1 text-amber-400 mb-2">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-4 h-4 fill-amber-400" />
            ))}
          </div>

          <blockquote className="text-base sm:text-xl text-white font-display font-medium leading-relaxed max-w-2xl mx-auto">
            "Delightfully effective experience... cut our LLM latency by 64% and costs by 78% across our entire production fleet within the first week!"
          </blockquote>

          <div className="pt-2 text-xs">
            <div className="font-semibold text-amber-300">Arielle Chen</div>
            <div className="text-stone-400 font-light text-[11px]">Sr. AI Architect @ Retool</div>
          </div>
        </div>

        <div className="absolute bottom-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto">
        
        {/* Floating Sparkle Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-stone-900/80 border border-amber-500/30 text-xs font-medium text-amber-300 mb-8 backdrop-blur-md shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Start Intelligent Orchestration</span>
        </div>

        {/* Headline */}
        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-6 font-display leading-[1.15] text-balance">
          Make Every AI Request{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-orange-300 to-amber-500">
            Count.
          </span>
        </h2>

        {/* Subtitle */}
        <p className="text-base sm:text-lg text-stone-300 max-w-2xl mx-auto mb-10 leading-relaxed font-light">
          Build smarter applications with model-aware recommendations, policy-driven routing, and transparent trade-offs.
        </p>

        {/* Signup Form in Noon Obsidian Gold */}
        <form onSubmit={handleSubmit} className="max-w-md mx-auto mb-6">
          <div className="relative flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-1.5 rounded-full bg-stone-900/90 border border-amber-500/40 shadow-2xl backdrop-blur-xl focus-within:border-amber-300 focus-within:ring-2 focus-within:ring-amber-400/30 transition-all">
            <div className="flex-1 flex items-center px-4 py-2">
              <Mail className="w-4 h-4 text-stone-400 mr-2.5 shrink-0" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter work email..."
                className="w-full bg-transparent text-xs sm:text-sm text-white placeholder-stone-400 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 active:scale-95 text-xs font-semibold text-stone-950 shadow-[0_0_20px_rgba(245,158,11,0.5)] transition-all shrink-0 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5 text-stone-950" />
            </button>
          </div>

          {submitted && (
            <div className="mt-4 p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Welcome to NEXUS ROUTER! Check your inbox for API credentials.</span>
            </div>
          )}
        </form>

        <p className="text-xs text-stone-400 font-mono">
          Free developer tier · 10,000 monthly routing requests · No credit card required
        </p>

      </div>

    </section>
  );
};
