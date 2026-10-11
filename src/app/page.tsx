"use client";
import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/Hero';
import { DashboardPreview } from '@/components/DashboardPreview';
import { FeaturesSection } from '@/components/FeaturesSection';
import { HowItWorksSection } from '@/components/HowItWorksSection';
import { DeveloperSection } from '@/components/DeveloperSection';
import { ClosingCta } from '@/components/ClosingCta';
import { Footer } from '@/components/Footer';
import { Playground } from '@/components/Playground';
import { ExploreModels } from '@/components/ExploreModels';
import { TestResults, type TestSessionResult } from '@/components/TestResults';
import { AutonomousOrchestrationSection } from '@/components/AutonomousOrchestrationSection';

export default function Home() {
  const [currentScreen, setCurrentScreen] = useState<'landing' | 'playground' | 'explore-models' | 'test-results'>('landing');
  const [testResultData, setTestResultData] = useState<TestSessionResult | null>(null);
  const [exploreQuery, setExploreQuery] = useState<string>('');
  const [showShortlistLoader, setShowShortlistLoader] = useState<boolean>(true);

  // Sync path and hash routing
  useEffect(() => {
    const handleRoute = () => {
      if (typeof window === 'undefined') return;
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();

      if (path.includes('playground') || hash === '#playground') {
        setCurrentScreen('playground');
      } else if (path.includes('explore') || path.includes('models') || hash === '#explore' || hash === '#models') {
        setShowShortlistLoader(true);
        setCurrentScreen('explore-models');
      } else if (path.includes('test-results') || hash === '#test-results') {
        setCurrentScreen('test-results');
      } else {
        setCurrentScreen('landing');
      }
    };
    handleRoute();
    window.addEventListener('hashchange', handleRoute);
    window.addEventListener('popstate', handleRoute);
    return () => {
      window.removeEventListener('hashchange', handleRoute);
      window.removeEventListener('popstate', handleRoute);
    };
  }, []);

  const openPlayground = () => {
    setCurrentScreen('playground');
    if (typeof window !== 'undefined') {
      window.location.hash = 'playground';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const openExploreModels = (query?: string) => {
    setExploreQuery(query || '');
    setShowShortlistLoader(true);
    setCurrentScreen('explore-models');
    if (typeof window !== 'undefined') {
      window.location.hash = 'explore';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleEndTesting = (result: TestSessionResult) => {
    setTestResultData(result);
    setCurrentScreen('test-results');
    if (typeof window !== 'undefined') {
      window.location.hash = 'test-results';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const backToLanding = () => {
    setCurrentScreen('landing');
    if (typeof window !== 'undefined') {
      window.location.hash = '';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // If user is on Playground screen
  if (currentScreen === 'playground') {
    return (
      <Playground 
        onBackToLanding={backToLanding} 
        onEndTesting={handleEndTesting}
      />
    );
  }

  // If user is on Explore Models screen
  if (currentScreen === 'explore-models') {
    return (
      <ExploreModels 
        onBackToGateway={backToLanding} 
        onOpenPlaygroundWithModel={() => openPlayground()} 
        initialSearchQuery={exploreQuery}
        showShortlistLoader={showShortlistLoader}
      />
    );
  }

  // If user is on Test Results screen
  if (currentScreen === 'test-results') {
    return (
      <TestResults
        data={testResultData || undefined}
        onRunAgain={() => openPlayground()}
        onCompareModels={() => openExploreModels()}
        onBackToGateway={backToLanding}
      />
    );
  }

  // Otherwise render full landing page
  return (
    <div className="min-h-screen bg-[#050302] text-stone-100 flex flex-col font-sans antialiased selection:bg-amber-500 selection:text-black">
      {/* 1. Main Navigation Bar */}
      <Navbar onOpenExploreModels={openExploreModels} />

      {/* 2. Hero Section with Solar Amber Glow & Expandable Input */}
      <Hero 
        onOpenPlayground={openPlayground} 
        onOpenExploreModels={openExploreModels} 
      />

      {/* 3. Product Dashboard Preview */}
      <DashboardPreview />

      {/* 4. Autonomous Control Layer & Curved Solar Horizon Arc */}
      <AutonomousOrchestrationSection onOpenPlayground={openPlayground} />

      {/* 5. Features Section */}
      <FeaturesSection />

      {/* 6. How It Works Section */}
      <HowItWorksSection />

      {/* 7. Developer-focused Section */}
      <DeveloperSection />

      {/* 8. Closing CTA */}
      <ClosingCta />

      {/* 9. Footer */}
      <Footer />
    </div>
  );
}
