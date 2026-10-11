"use client";
import React, { useState } from 'react';
import { Menu, X, ArrowRight, Cpu, Sparkles } from 'lucide-react';

interface NavbarProps {
  onOpenExploreModels: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenExploreModels }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full bg-[#050302]/85 backdrop-blur-xl border-b border-amber-500/20">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 h-20 flex items-center justify-between">
        
        {/* Brand Lockup */}
        <a href="#" className="flex items-center gap-3 group">
          <div className="relative w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 via-orange-400 to-yellow-300 p-[1px] shadow-[0_0_15px_rgba(245,158,11,0.4)]">
            <div className="w-full h-full bg-[#0c0805] rounded-lg flex items-center justify-center">
              {/* Geometric Rhombus Logo like the reference image */}
              <div className="w-3.5 h-3.5 border-2 border-amber-400 rotate-45 flex items-center justify-center">
                <div className="w-1 h-1 bg-amber-200" />
              </div>
            </div>
          </div>
          <span className="text-base sm:text-lg font-bold tracking-tight text-white font-display group-hover:text-amber-300 transition-colors">
            NEXUS ROUTER
          </span>
        </a>

        {/* Centered Floating Pill Navigation (Matching Reference Image Format) */}
        <nav className="hidden md:flex items-center gap-7 px-7 py-2.5 rounded-full bg-stone-900/80 border border-amber-500/20 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.5)] text-xs font-medium text-stone-300">
          <a href="#features" className="hover:text-amber-300 transition-colors py-0.5">
            Features
          </a>
          <a href="#how-it-works" className="hover:text-amber-300 transition-colors py-0.5">
            How It Works
          </a>
          <a href="#developers" className="hover:text-amber-300 transition-colors py-0.5">
            Docs
          </a>
        </nav>

        {/* Mobile Hamburger Toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-lg bg-stone-900 border border-stone-800 text-stone-300 hover:text-white"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-stone-800 bg-[#080503] px-6 py-5 space-y-4 text-sm font-medium">
          <a
            href="#features"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-stone-300 hover:text-amber-300 py-1"
          >
            Features
          </a>
          <a
            href="#how-it-works"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-stone-300 hover:text-amber-300 py-1"
          >
            How It Works
          </a>
          <a
            href="#developers"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-stone-300 hover:text-amber-300 py-1"
          >
            Docs
          </a>
        </div>
      )}
    </header>
  );
};
