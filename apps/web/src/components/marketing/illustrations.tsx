import type React from 'react';

export function HeroIllustration({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 600 400" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Dashboard mockup */}
      <rect x="80" y="40" width="440" height="320" rx="16" fill="#FAF8F2" stroke="#D9D4C7" strokeWidth="2" />
      {/* Sidebar */}
      <rect x="80" y="40" width="100" height="320" rx="16" fill="#15140F" />
      <rect x="80" y="40" width="100" height="320" rx="16" fill="#15140F" />
      <circle cx="130" cy="80" r="14" fill="#FFE600" />
      <rect x="96" y="110" width="68" height="6" rx="3" fill="#5A5850" />
      <rect x="96" y="126" width="68" height="6" rx="3" fill="#5A5850" />
      <rect x="96" y="142" width="52" height="6" rx="3" fill="#5A5850" />
      <rect x="96" y="158" width="60" height="6" rx="3" fill="#5A5850" />
      <rect x="96" y="174" width="68" height="6" rx="3" fill="#FFE600" opacity="0.7" />
      <rect x="96" y="190" width="56" height="6" rx="3" fill="#5A5850" />
      {/* Header */}
      <rect x="180" y="40" width="340" height="40" fill="white" stroke="#D9D4C7" strokeWidth="1" />
      <rect x="200" y="54" width="80" height="12" rx="6" fill="#D9D4C7" />
      <rect x="460" y="52" width="40" height="16" rx="8" fill="#FFE600" />
      {/* KPI cards */}
      <rect x="200" y="100" width="145" height="70" rx="10" fill="white" stroke="#D9D4C7" strokeWidth="1.5" />
      <rect x="215" y="115" width="50" height="6" rx="3" fill="#94A3B8" />
      <rect x="215" y="130" width="80" height="14" rx="4" fill="#15140F" />
      <rect x="215" y="150" width="35" height="5" rx="2.5" fill="#FFE600" />
      <circle cx="325" cy="125" r="12" fill="#FFF6BF" />
      <rect x="365" y="100" width="145" height="70" rx="10" fill="white" stroke="#D9D4C7" strokeWidth="1.5" />
      <rect x="380" y="115" width="50" height="6" rx="3" fill="#94A3B8" />
      <rect x="380" y="130" width="60" height="14" rx="4" fill="#15140F" />
      <rect x="380" y="150" width="35" height="5" rx="2.5" fill="#FFE600" />
      <circle cx="490" cy="125" r="12" fill="#FFF6BF" />
      {/* Chart area */}
      <rect x="200" y="190" width="145" height="140" rx="10" fill="white" stroke="#D9D4C7" strokeWidth="1.5" />
      <rect x="215" y="205" width="70" height="8" rx="4" fill="#94A3B8" />
      {/* Bar chart */}
      <rect x="220" y="280" width="14" height="35" rx="3" fill="#F2EFE6" />
      <rect x="240" y="260" width="14" height="55" rx="3" fill="#F2EFE6" />
      <rect x="260" y="270" width="14" height="45" rx="3" fill="#15140F" />
      <rect x="280" y="250" width="14" height="65" rx="3" fill="#FFF6BF" />
      <rect x="300" y="240" width="14" height="75" rx="3" fill="#15140F" />
      {/* Activity list */}
      <rect x="365" y="190" width="145" height="140" rx="10" fill="white" stroke="#D9D4C7" strokeWidth="1.5" />
      <rect x="380" y="205" width="70" height="8" rx="4" fill="#94A3B8" />
      <rect x="380" y="225" width="115" height="6" rx="3" fill="#D9D4C7" />
      <rect x="380" y="240" width="100" height="6" rx="3" fill="#D9D4C7" />
      <rect x="380" y="255" width="110" height="6" rx="3" fill="#D9D4C7" />
      <rect x="380" y="270" width="90" height="6" rx="3" fill="#D9D4C7" />
      <rect x="380" y="285" width="105" height="6" rx="3" fill="#D9D4C7" />
      <rect x="380" y="300" width="80" height="6" rx="3" fill="#D9D4C7" />
      {/* Floating elements */}
      <g opacity="0.6">
        <rect x="30" y="120" width="50" height="50" rx="12" fill="#FFF6BF" stroke="#FFE600" strokeWidth="1.5" />
        <rect x="42" y="136" width="26" height="4" rx="2" fill="#15140F" />
        <rect x="42" y="144" width="18" height="4" rx="2" fill="#15140F" opacity="0.5" />
      </g>
      <g opacity="0.6">
        <rect x="530" y="200" width="50" height="50" rx="12" fill="#FFF6BF" stroke="#FFE600" strokeWidth="1.5" />
        <circle cx="555" cy="220" r="8" fill="#15140F" opacity="0.16" />
        <rect x="548" y="232" width="14" height="3" rx="1.5" fill="#15140F" />
      </g>
      <g opacity="0.4">
        <circle cx="50" cy="300" r="20" fill="#FFF6BF" stroke="#FFE600" strokeWidth="1.5" />
        <rect x="42" y="296" width="16" height="8" rx="2" fill="#15140F" opacity="0.4" />
      </g>
    </svg>
  );
}

export function SecurityIllustration({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="80" fill="#15140F" opacity="0.05" />
      <circle cx="100" cy="100" r="60" fill="#15140F" opacity="0.05" />
      {/* Shield */}
      <path d="M100 40 L140 60 V110 C140 140 100 160 100 160 C100 160 60 140 60 110 V60 Z" fill="#FFE600" opacity="0.15" stroke="#15140F" strokeWidth="2" />
      <path d="M100 55 L130 70 V105 C130 128 100 145 100 145 C100 145 70 128 70 105 V70 Z" fill="#FFF6BF" stroke="#15140F" strokeWidth="1.5" />
      {/* Lock icon */}
      <rect x="88" y="100" width="24" height="18" rx="4" fill="#15140F" />
      <path d="M93 100 V92 C93 88 96 85 100 85 C104 85 107 88 107 92 V100" stroke="#15140F" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <circle cx="100" cy="110" r="2.5" fill="white" />
      {/* Checkmarks */}
      <circle cx="55" cy="75" r="10" fill="#FFF6BF" />
      <path d="M50 75 L54 79 L60 71" stroke="#15140F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="145" cy="75" r="10" fill="#FFF6BF" />
      <path d="M140 75 L144 79 L150 71" stroke="#15140F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="100" cy="175" r="10" fill="#FFF6BF" />
      <path d="M95 175 L99 179 L105 171" stroke="#15140F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ProcessStepIcon({ step, className }: { step: number; className?: string }) {
  const icons: Record<number, React.ReactNode> = {
    1: <><rect x="6" y="10" width="28" height="20" rx="3" fill="#FFF6BF" stroke="#15140F" strokeWidth="1.5" /><rect x="10" y="14" width="14" height="2" rx="1" fill="#15140F" /><rect x="10" y="18" width="20" height="2" rx="1" fill="#15140F" opacity="0.4" /><rect x="10" y="22" width="16" height="2" rx="1" fill="#15140F" opacity="0.4" /></>,
    2: <><circle cx="20" cy="20" r="12" fill="#FFF6BF" stroke="#15140F" strokeWidth="1.5" /><path d="M14 20 L18 24 L26 16" stroke="#15140F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></>,
    3: <><rect x="6" y="8" width="28" height="24" rx="4" fill="#FFF6BF" stroke="#15140F" strokeWidth="1.5" /><circle cx="20" cy="18" r="5" fill="#15140F" opacity="0.18" /><rect x="12" y="26" width="16" height="2" rx="1" fill="#15140F" /></>,
    4: <><rect x="8" y="10" width="24" height="20" rx="3" fill="#FFF6BF" stroke="#15140F" strokeWidth="1.5" /><path d="M15 20 L19 24 L25 16" stroke="#15140F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></>,
    5: <><rect x="6" y="10" width="28" height="20" rx="3" fill="#FFF6BF" stroke="#15140F" strokeWidth="1.5" /><rect x="12" y="15" width="8" height="3" rx="1.5" fill="#15140F" /><rect x="12" y="21" width="16" height="3" rx="1.5" fill="#15140F" opacity="0.4" /></>,
  };
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      {icons[step] ?? icons[1]}
    </svg>
  );
}

