import React from 'react';

export function AirtelLogo({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="#ED1C24" />
      <text x="24" y="19" fontFamily="Inter,sans-serif" fontSize="7" fontWeight="800" fill="#fff" textAnchor="middle">airtel</text>
      <text x="24" y="30" fontFamily="Inter,sans-serif" fontSize="6" fontWeight="700" fill="#fff" textAnchor="middle" opacity=".9">money</text>
      <circle cx="24" cy="38" r="4" fill="#fff" opacity=".3" />
      <path d="M22 37l2 2 3-3" stroke="#fff" strokeWidth="1.2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function MtnLogo({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="#FFCC00" />
      <rect x="6" y="10" width="36" height="18" rx="4" fill="#003C71" />
      <text x="24" y="23" fontFamily="Inter,sans-serif" fontSize="10" fontWeight="900" fill="#FFCC00" textAnchor="middle">MTN</text>
      <text x="24" y="38" fontFamily="Inter,sans-serif" fontSize="6" fontWeight="700" fill="#003C71" textAnchor="middle">Mobile</text>
      <text x="24" y="45" fontFamily="Inter,sans-serif" fontSize="6" fontWeight="700" fill="#003C71" textAnchor="middle">Money</text>
    </svg>
  );
}

export function VisaMcLogo({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />
      <text x="14" y="22" fontFamily="Inter,sans-serif" fontSize="9" fontWeight="800" fill="#1A1F71" letterSpacing=".5">VISA</text>
      <circle cx="28" cy="34" r="7" fill="#EB001B" opacity=".85" />
      <circle cx="36" cy="34" r="7" fill="#F79E1B" opacity=".85" />
      <ellipse cx="32" cy="34" rx="3" ry="6" fill="#FF5F00" opacity=".7" />
    </svg>
  );
}

export function SecurePaymentIllustration({ width = 120, height = 80 }) {
  return (
    <svg width={width} height={height} viewBox="0 0 240 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Background */}
      <rect width="240" height="160" rx="16" fill="#e8f5ee" opacity=".5" />
      {/* Shield */}
      <path d="M120 20c-20 10-40 10-50 8v52c0 28 20 48 50 60 30-12 50-32 50-60V28c-10 2-30 2-50-8z" fill="#006b3f" opacity=".15" />
      <path d="M120 30c-16 8-32 8-40 6.5v42c0 22 16 39 40 48 24-9 40-26 40-48V36.5c-8 1.5-24 1.5-40-6.5z" fill="#006b3f" opacity=".3" />
      <path d="M120 42c-12 6-24 6-30 5v32c0 17 12 29 30 36 18-7 30-19 30-36V47c-6 1-18 1-30-5z" fill="#006b3f" />
      <path d="M110 72l8 8 16-16" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* Lock */}
      <rect x="170" y="50" width="36" height="28" rx="6" fill="#006b3f" opacity=".2" />
      <rect x="178" y="56" width="20" height="16" rx="4" fill="#ffc700" opacity=".8" />
      <path d="M184 56v-6a4 4 0 018 0v6" stroke="#006b3f" strokeWidth="2" fill="none" opacity=".5" />
      {/* Card */}
      <rect x="30" y="90" width="56" height="36" rx="6" fill="#006b3f" opacity=".2" />
      <rect x="34" y="100" width="20" height="4" rx="1" fill="#006b3f" opacity=".3" />
      <rect x="34" y="108" width="12" height="4" rx="1" fill="#006b3f" opacity=".2" />
      {/* Sparkles */}
      <circle cx="160" cy="40" r="3" fill="#ffc700" opacity=".6" />
      <circle cx="80" cy="35" r="2" fill="#ffc700" opacity=".4" />
      <circle cx="200" cy="100" r="2.5" fill="#006b3f" opacity=".3" />
    </svg>
  );
}
