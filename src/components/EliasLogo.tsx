import React from 'react';

export default function EliasLogo({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="logoGoldGrad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#78350f" />
          <stop offset="30%" stopColor="#b88a3e" />
          <stop offset="70%" stopColor="#dfb15b" />
          <stop offset="100%" stopColor="#fef3c7" />
        </linearGradient>
        
        <linearGradient id="logoFlameGrad" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#b45309" stopOpacity={0.9} />
          <stop offset="50%" stopColor="#d97706" stopOpacity={0.8} />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.95} />
        </linearGradient>

        <linearGradient id="logoGlowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#dfb15b" />
          <stop offset="100%" stopColor="#ffffff" />
        </linearGradient>
        
        <filter id="logoDivineGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      
      <circle cx="50" cy="50" r="46" stroke="url(#logoGoldGrad)" strokeWidth="1" strokeDasharray="4 6" opacity="0.25" />
      <circle cx="50" cy="50" r="42" stroke="url(#logoGoldGrad)" strokeWidth="0.5" opacity="0.15" />

      <path d="M 50,14 C 28,34 26,56 46,67 C 32,58 35,38 50,25 C 65,38 68,58 54,67 C 74,56 72,34 50,14 Z" 
            fill="url(#logoFlameGrad)" 
            filter="url(#logoDivineGlow)" 
            opacity="0.85" />

      <path d="M 50,22 C 37,36 37,50 48,59 C 40,52 42,40 50,32 C 58,40 60,52 52,59 C 63,50 63,36 50,22 Z" 
            fill="url(#logoGoldGrad)" 
            opacity="0.95" />

      <path d="M 50,72 C 38,68 22,68 14,73 L 14,84 C 22,79 38,79 50,83 Z" 
            fill="url(#logoGoldGrad)" 
            stroke="#1c1917" 
            strokeWidth="0.5" />
      
      <path d="M 50,72 C 62,68 78,68 86,73 L 86,84 C 78,79 62,79 50,83 Z" 
            fill="url(#logoGoldGrad)" 
            stroke="#1c1917" 
            strokeWidth="0.5" />

      <path d="M 14,75 C 22,70 38,70 50,74 C 62,70 78,70 86,75" stroke="url(#logoGoldGrad)" strokeWidth="1" fill="none" opacity="0.6" />
      <path d="M 14,77 C 22,72 38,72 50,76 C 62,72 78,72 86,77" stroke="url(#logoGoldGrad)" strokeWidth="1" fill="none" opacity="0.4" />

      <path d="M 50,33 L 50,56" stroke="url(#logoGlowGrad)" strokeWidth="2" strokeLinecap="round" />
      <path d="M 43,41 L 57,41" stroke="url(#logoGlowGrad)" strokeWidth="2" strokeLinecap="round" />
      
      <circle cx="50" cy="31" r="2" fill="#ffffff" filter="url(#logoDivineGlow)" />
      <circle cx="41" cy="41" r="2" fill="#ffffff" filter="url(#logoDivineGlow)" />
      <circle cx="59" cy="41" r="2" fill="#ffffff" filter="url(#logoDivineGlow)" />
      <circle cx="50" cy="58" r="2.5" fill="#ffffff" filter="url(#logoDivineGlow)" />

      <line x1="50" y1="72" x2="50" y2="67" stroke="url(#logoGoldGrad)" strokeWidth="1" strokeDasharray="1 1" />
    </svg>
  );
}
