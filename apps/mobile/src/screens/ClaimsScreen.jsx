import React from 'react';
import {
  AlertTriangle,
  BriefcaseMedical,
  Camera,
  FileText,
  Headphones,
} from 'lucide-react';
import safeShieldIcon from '../assets/real/safe_shield_clean.png';
import arrowRight from '../assets/pack/icons/arrow-right.svg';

const OPTION_ICON_SIZE = 22;
const INCIDENT_ICON_SIZE = 26;
const ICON_STROKE = 2;
const SAFE_GREEN = '#007A3D';
const INCIDENT_RED = '#DC2626';

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

function OptionIcon({ Icon }) {
  return (
    <Icon
      className="claims-line-icon"
      size={OPTION_ICON_SIZE}
      strokeWidth={ICON_STROKE}
      color={SAFE_GREEN}
      aria-hidden="true"
    />
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
      icon: <OptionIcon Icon={BriefcaseMedical} />,
      onClick: () => openClaimFlow?.(2),
    },
    {
      key: 'photo',
      title: 'Photo evidence',
      subtitle: 'Attach accident photos',
      icon: <OptionIcon Icon={Camera} />,
      onClick: () => openClaimFlow?.(2),
    },
    {
      key: 'police',
      title: 'Police report',
      subtitle: 'Add official documents',
      icon: <OptionIcon Icon={FileText} />,
      onClick: () => openClaimFlow?.(3),
    },
    {
      key: 'support',
      title: 'Support line',
      subtitle: 'Call or message support',
      icon: <OptionIcon Icon={Headphones} />,
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
          <AlertTriangle
            className="claims-line-icon claims-line-icon--incident"
            size={INCIDENT_ICON_SIZE}
            strokeWidth={ICON_STROKE}
            color={INCIDENT_RED}
            aria-hidden="true"
          />
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
