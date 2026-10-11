"use client";
import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-[#050302] border-t border-amber-500/15 py-12 px-6 sm:px-10 text-stone-300">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        
        {/* Brand & Tagline */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-amber-500 via-orange-400 to-yellow-300 p-[1px] shadow-[0_0_12px_rgba(245,158,11,0.4)]">
              <div className="w-full h-full bg-[#0c0805] rounded-lg flex items-center justify-center">
                <div className="w-2.5 h-2.5 border border-amber-400 rotate-45 flex items-center justify-center">
                  <div className="w-0.5 h-0.5 bg-amber-200" />
                </div>
              </div>
            </div>
            <span className="text-base font-bold tracking-tight text-white font-display">
              NEXUS ROUTER
            </span>
          </div>
          <p className="text-xs text-stone-400 max-w-sm font-light">
            Intelligent model orchestration for the next generation of autonomous AI applications.
          </p>
        </div>

        {/* Links (matching Noon style) */}
        <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 text-xs font-medium text-stone-300">
          <a href="#features" className="hover:text-amber-300 transition-colors">
            Features
          </a>
          <a href="#developers" className="hover:text-amber-300 transition-colors">
            Documentation
          </a>
          <a href="mailto:team@nexusrouter.ai" className="hover:text-amber-300 transition-colors">
            team@nexusrouter.ai
          </a>
          <a href="#" className="hover:text-amber-300 transition-colors">
            Terms & Conditions
          </a>
          <a href="#" className="hover:text-amber-300 transition-colors">
            Privacy Policy
          </a>
        </div>

        {/* Copyright */}
        <div className="text-xs text-stone-400 font-mono text-center md:text-right">
          © 2026 NEXUS ROUTER. All rights reserved.
        </div>

      </div>
    </footer>
  );
};
