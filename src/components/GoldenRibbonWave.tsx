"use client";
import React from 'react';

export const GoldenRibbonWave: React.FC<{ className?: string }> = ({ className = '' }) => {
  // Generate overlapping sine curves to create the multi-threaded luminous wireframe ribbon
  const linesCount = 28;
  const paths = [];

  for (let i = 0; i < linesCount; i++) {
    const offset = i * 2.8;
    const opacity = (0.25 + (Math.sin((i / linesCount) * Math.PI) * 0.75)).toFixed(2);
    const strokeWidth = (0.75 + (i % 3 === 0 ? 0.75 : 0.25)).toFixed(2);
    
    // Wave points
    const cp1y = 70 + offset + Math.sin(i * 0.3) * 12;
    const cp2y = 170 - offset + Math.cos(i * 0.2) * 16;
    const cp3y = 40 + offset + Math.sin(i * 0.4) * 14;
    const endY = 120 + offset * 0.8;

    paths.push({
      d: `M -50,${90 + offset} C 250,${cp1y} 550,${cp2y} 850,${cp3y} S 1200,${160 - offset} 1450,${endY}`,
      opacity,
      strokeWidth,
      color: i % 4 === 0 ? '#fef08a' : i % 2 === 0 ? '#fbbf24' : '#f59e0b',
    });
  }

  return (
    <div className={`relative w-full overflow-hidden pointer-events-none select-none ${className}`}>
      
      {/* Radiant Diffuse Ambient Solar Glow */}
      <div className="absolute inset-0 bg-gradient-to-t from-transparent via-amber-500/20 to-transparent blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[160px] bg-gradient-to-r from-orange-600/30 via-amber-500/40 to-yellow-400/20 blur-[90px] rounded-full" />

      {/* Undulating Multi-threaded Wireframe Golden Mesh Ribbon */}
      <svg 
        viewBox="0 0 1400 240" 
        preserveAspectRatio="none" 
        className="w-full h-44 sm:h-64 lg:h-72 animate-wave-flow drop-shadow-[0_0_20px_rgba(245,158,11,0.7)]"
      >
        <defs>
          <linearGradient id="noonGoldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#d97706" stopOpacity="0.1" />
            <stop offset="25%" stopColor="#f59e0b" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#fef08a" stopOpacity="1" />
            <stop offset="75%" stopColor="#f59e0b" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#b45309" stopOpacity="0.2" />
          </linearGradient>

          <filter id="goldenGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Glow pass */}
        <g filter="url(#goldenGlow)" opacity="0.65">
          {paths.slice(0, 8).map((p, idx) => (
            <path
              key={`glow-${idx}`}
              d={p.d}
              fill="none"
              stroke="#fbbf24"
              strokeWidth="2.5"
              strokeOpacity="0.3"
            />
          ))}
        </g>

        {/* Crisp detailed luminous thread lines */}
        {paths.map((p, idx) => (
          <path
            key={`thread-${idx}`}
            d={p.d}
            fill="none"
            stroke="url(#noonGoldGrad)"
            strokeWidth={p.strokeWidth}
            strokeOpacity={p.opacity}
          />
        ))}
      </svg>
    </div>
  );
};
