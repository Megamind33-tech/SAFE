import React from 'react';

export default function BusIllustration({ width = 180, height = 120 }) {
  return (
    <svg width={width} height={height} viewBox="0 0 360 240" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Sky */}
      <rect width="360" height="240" rx="16" fill="#e8f5ee" />
      {/* Clouds */}
      <ellipse cx="80" cy="50" rx="30" ry="14" fill="#fff" opacity=".7" />
      <ellipse cx="100" cy="45" rx="22" ry="12" fill="#fff" opacity=".6" />
      <ellipse cx="280" cy="60" rx="24" ry="11" fill="#fff" opacity=".5" />
      {/* Trees */}
      <circle cx="50" cy="140" r="28" fill="#16a34a" opacity=".5" />
      <circle cx="42" cy="135" r="20" fill="#22c55e" opacity=".6" />
      <rect x="47" y="155" width="6" height="20" rx="2" fill="#854d0e" opacity=".4" />
      <circle cx="310" cy="135" r="24" fill="#16a34a" opacity=".5" />
      <circle cx="318" cy="128" r="18" fill="#22c55e" opacity=".6" />
      <rect x="312" y="150" width="5" height="18" rx="2" fill="#854d0e" opacity=".4" />
      {/* Road */}
      <rect x="0" y="180" width="360" height="60" fill="#94a3b8" opacity=".15" rx="4" />
      <line x1="30" y1="210" x2="330" y2="210" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="12 8" />
      {/* Bus body */}
      <rect x="100" y="130" width="160" height="70" rx="12" fill="#006b3f" />
      <rect x="100" y="130" width="160" height="16" rx="8" fill="#005a34" />
      {/* Windows */}
      <rect x="112" y="148" width="28" height="22" rx="4" fill="#dbeafe" opacity=".9" />
      <rect x="146" y="148" width="28" height="22" rx="4" fill="#dbeafe" opacity=".9" />
      <rect x="180" y="148" width="28" height="22" rx="4" fill="#dbeafe" opacity=".9" />
      <rect x="214" y="148" width="28" height="22" rx="4" fill="#dbeafe" opacity=".9" />
      {/* Door */}
      <rect x="248" y="150" width="8" height="40" rx="3" fill="#004d2c" />
      {/* Headlight */}
      <circle cx="258" cy="186" r="5" fill="#fbbf24" />
      <circle cx="108" cy="186" r="5" fill="#ef4444" opacity=".6" />
      {/* Bumper */}
      <rect x="96" y="196" width="168" height="6" rx="3" fill="#004d2c" />
      {/* Wheels */}
      <circle cx="130" cy="202" r="14" fill="#1e293b" />
      <circle cx="130" cy="202" r="6" fill="#64748b" />
      <circle cx="230" cy="202" r="14" fill="#1e293b" />
      <circle cx="230" cy="202" r="6" fill="#64748b" />
      {/* SAFE text on bus */}
      <text x="165" y="143" fontFamily="Inter,sans-serif" fontSize="9" fontWeight="800" fill="#fff" letterSpacing="1">SAFE</text>
      {/* Shield on bus */}
      <circle cx="155" cy="182" r="8" fill="#ffc700" opacity=".9" />
      <path d="M152 180l3 3 5-5" stroke="#006b3f" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
