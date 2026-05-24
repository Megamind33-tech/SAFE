import React from 'react';
import safeShieldIcon from '../assets/real/safe_shield_clean.png';
import arrowRight from '../assets/pack/icons/arrow-right.svg';

const ICON_SIZE = 22;
const LINE_STROKE = 2;

const ACTIVE_STATUSES = new Set(['submitted', 'processing', 'pending', 'under_review', 'needs_documents']);

function formatClaimStatus(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'processing' || s === 'under_review') return 'Under review';
  if (s === 'submitted' || s === 'pending') return 'Submitted';
  if (s === 'needs_documents') return 'Needs documents';
  if (s === 'approved') return 'Approved';
  if (s === 'rejected') return 'Rejected';
  if (s === 'paid') return 'Paid';
  return status ? String(status).replace(/_/g, ' ') : 'Submitted';
}

function claimProgress(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'submitted' || s === 'pending') return 25;
  if (s === 'processing' || s === 'under_review') return 55;
  if (s === 'needs_documents') return 40;
  if (s === 'approved') return 85;
  if (s === 'paid') return 100;
  return 30;
}

function pickActiveClaim(claimsList) {
  if (!Array.isArray(claimsList) || claimsList.length === 0) return null;
  const active = claimsList.find((c) => ACTIVE_STATUSES.has(String(c?.status || '').toLowerCase()));
  return active || null;
}

function LineIcon({ children, size = ICON_SIZE }) {
  return (
    <svg
      className="claims-line-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function IncidentIcon() {
  return (
    <LineIcon size={26}>
      <path
        d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
        stroke="currentColor"
        strokeWidth={LINE_STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </LineIcon>
  );
}

function MedicalIcon() {
  return (
    <LineIcon>
      <rect x="4" y="4" width="16" height="16" rx="4" stroke="currentColor" strokeWidth={LINE_STROKE} />
      <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth={LINE_STROKE} strokeLinecap="round" />
    </LineIcon>
  );
}

function CameraIcon() {
  return (
    <LineIcon>
      <path
        d="M5 9h3l1.5-2.5h5L16 9h3a1 1 0 011 1v8a1 1 0 01-1 1H5a1 1 0 01-1-1v-8a1 1 0 011-1z"
        stroke="currentColor"
        strokeWidth={LINE_STROKE}
        strokeLinejoin="round"
      />
      <circle cx="12" cy="14" r="3" stroke="currentColor" strokeWidth={LINE_STROKE} />
    </LineIcon>
  );
}

function DocumentIcon() {
  return (
    <LineIcon>
      <path
        d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z"
        stroke="currentColor"
        strokeWidth={LINE_STROKE}
        strokeLinejoin="round"
      />
      <path d="M14 3v5h5M9 13h6M9 17h4" stroke="currentColor" strokeWidth={LINE_STROKE} strokeLinecap="round" />
    </LineIcon>
  );
}

function SupportIcon() {
  return (
    <LineIcon>
      <path
        d="M4 14v-2a8 8 0 0116 0v2"
        stroke="currentColor"
        strokeWidth={LINE_STROKE}
        strokeLinecap="round"
      />
      <path
        d="M6 14v2a2 2 0 002 2h1v-6H7a1 1 0 00-1 1zM18 14v2a2 2 0 01-2 2h-1v-6h2a1 1 0 011 1z"
        stroke="currentColor"
        strokeWidth={LINE_STROKE}
        strokeLinejoin="round"
      />
    </LineIcon>
  );
}

export default function ClaimsScreen({
  cityLabel = 'Lusaka',
  claimsList = [],
  openClaimFlow,
  setScreen,
}) {
  const activeClaim = pickActiveClaim(claimsList);

  const optionCards = [
    {
      key: 'medical',
      title: 'Medical support',
      subtitle: 'Claim medical expenses',
      icon: <MedicalIcon />,
      onClick: () => openClaimFlow?.(2),
    },
    {
      key: 'photo',
      title: 'Photo evidence',
      subtitle: 'Attach accident photos',
      icon: <CameraIcon />,
      onClick: () => openClaimFlow?.(2),
    },
    {
      key: 'police',
      title: 'Police report',
      subtitle: 'Add official documents',
      icon: <DocumentIcon />,
      onClick: () => openClaimFlow?.(3),
    },
    {
      key: 'support',
      title: 'Support line',
      subtitle: 'Call or message support',
      icon: <SupportIcon />,
      onClick: () => setScreen?.('chat'),
    },
  ];

  return (
    <main className="screen claims-screen claims-screen-board">
      <header className="cover-screen-board__header">
        <div className="cover-screen-board__brand">
          <img
            className="cover-screen-board__brand-icon"
            src={safeShieldIcon}
            alt=""
            aria-hidden="true"
          />
          <div className="cover-screen-board__brand-text">
            <span className="cover-screen-board__brand-name">SAFE</span>
            <span className="cover-screen-board__brand-sub">commuter cover</span>
          </div>
        </div>
        <span className="cover-screen-board__location">{cityLabel}</span>
      </header>

      <section className="claims-screen-board__title-area">
        <h1 className="claims-screen-board__title">Claims</h1>
        <p className="claims-screen-board__title-sub">
          Serious reporting. Clear evidence. Fast support.
        </p>
      </section>

      <article className="claims-primary-card">
        <div className="claims-primary-card__icon" aria-hidden="true">
          <IncidentIcon />
        </div>
        <div className="claims-primary-card__body">
          <h2 className="claims-primary-card__title">Report Incident</h2>
          <p className="claims-primary-card__desc">Upload trip, hospital or police details.</p>
          <button type="button" className="claims-primary-card__btn" onClick={() => openClaimFlow?.(1)}>
            Start claim
          </button>
        </div>
      </article>

      {activeClaim ? (
        <article className="claims-status-card">
          <div className="claims-status-card__top">
            <span className="claims-status-card__label">Active claim</span>
            <span className="claims-status-card__id">
              #{String(activeClaim.id || '').slice(0, 8).toUpperCase()}
            </span>
          </div>
          <p className="claims-status-card__status">{formatClaimStatus(activeClaim.status)}</p>
          <div className="claims-status-card__progress" aria-hidden="true">
            <div
              className="claims-status-card__progress-fill"
              style={{ width: `${claimProgress(activeClaim.status)}%` }}
            />
          </div>
        </article>
      ) : (
        <p className="claims-empty-hint">
          <span className="claims-empty-hint__title">No active claims</span>
          <span className="claims-empty-hint__text">
            Start a claim if you were involved in an accident.
          </span>
        </p>
      )}

      <div className="claims-options">
        {optionCards.map((card) => (
          <button key={card.key} type="button" className="claims-option-card" onClick={card.onClick}>
            <div className="claims-option-card__icon">{card.icon}</div>
            <div className="claims-option-card__text">
              <span className="claims-option-card__title">{card.title}</span>
              <span className="claims-option-card__subtitle">{card.subtitle}</span>
            </div>
            <img src={arrowRight} alt="" className="claims-option-card__arrow" aria-hidden="true" />
          </button>
        ))}
      </div>
    </main>
  );
}
