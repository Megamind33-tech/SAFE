/**
 * COVER HISTORY — ACCEPTED (do not redesign)
 *
 * Locked: layout, filters, empty state, policy ID display, card styling,
 * scroll clearance (360px pad + 240px spacer), bottom nav (Profile active).
 * CoverHistoryDetailScreen is also accepted — do not redesign.
 *
 * Allowed changes only: real API data fixes, bug fixes, small copy corrections.
 * Do not change spacing, typography, card design, or navigation unless requested.
 */
import { useMemo, useState } from 'react';
import { ArrowLeft, FileText, ShieldCheck } from 'lucide-react';
import BottomScrollSpacer from '../components/BottomScrollSpacer.jsx';
import {
  buildCoverHistoryItems,
  filterCoverHistoryItems,
  formatCoverDateTime,
  formatCoverPlanLine,
  formatCoverRouteTitle,
  formatCoverVehicle,
  getCoverPolicyId,
  getEffectiveCoverStatus,
  mapCoverHistoryItem,
} from '../utils/coverHistory.js';

const FILTERS = ['All', 'Active', 'Expired', 'Claims'];

export default function CoverHistoryScreen({
  historyReturn = 'profile',
  setScreen,
  coversHistory = [],
  claimsList = [],
  onSelectCover,
  onStartCover,
}) {
  const [filter, setFilter] = useState('All');

  const allItems = useMemo(
    () => buildCoverHistoryItems(coversHistory, claimsList),
    [coversHistory, claimsList]
  );

  const visibleItems = useMemo(
    () => filterCoverHistoryItems(allItems, filter),
    [allItems, filter]
  );

  const handleBack = () => {
    setScreen?.(historyReturn);
  };

  return (
    <main className="screen cover-history-screen cover-history-screen-board">
      <div className="cover-history-scroll">
        <header className="cover-history-header">
          <button
            type="button"
            className="cover-history-header__back"
            aria-label="Go back"
            onClick={handleBack}
          >
            <ArrowLeft size={22} strokeWidth={2.25} color="#101820" />
          </button>
          <h1 className="cover-history-header__title">Cover History</h1>
          <span className="cover-history-header__spacer" aria-hidden="true" />
        </header>

        <section className="cover-history-title-area">
          <h2 className="cover-history-title-area__heading">My cover history</h2>
          <p className="cover-history-title-area__subtitle">
            View receipts, policy IDs, and trip protection records.
          </p>
        </section>

        <div className="cover-history-filters" role="tablist" aria-label="Cover filters">
          {FILTERS.map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={filter === item}
              className={`cover-history-filter${filter === item ? ' cover-history-filter--active' : ''}`}
              onClick={() => setFilter(item)}
            >
              {item}
            </button>
          ))}
        </div>

        {allItems.length === 0 ? (
          <section className="cover-history-empty" aria-label="No cover history">
            <div className="cover-history-empty__icon" aria-hidden="true">
              <ShieldCheck size={28} strokeWidth={2} color="#007A3D" />
            </div>
            <h3 className="cover-history-empty__title">No cover history yet</h3>
            <p className="cover-history-empty__subtitle">
              Your trip protection records will appear here after you buy or verify a cover.
            </p>
            <button type="button" className="cover-history-empty__cta" onClick={onStartCover}>
              Start a cover
            </button>
          </section>
        ) : visibleItems.length === 0 ? (
          <section className="cover-history-empty cover-history-empty--filtered" aria-label="No matching covers">
            <h3 className="cover-history-empty__title">No records found</h3>
            <p className="cover-history-empty__subtitle">
              Try another filter or start a new cover.
            </p>
            <button type="button" className="cover-history-empty__cta" onClick={onStartCover}>
              Start a cover
            </button>
          </section>
        ) : (
          <section className="cover-history-list" aria-label="Cover records">
            {visibleItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className="cover-history-card"
                onClick={() => onSelectCover?.(item.cover)}
              >
                <div className="cover-history-card__date" aria-hidden="true">
                  <strong className="cover-history-card__day">{item.day}</strong>
                  <span className="cover-history-card__month">{item.month}</span>
                  <small className="cover-history-card__year">{item.year}</small>
                </div>
                <div className="cover-history-card__body">
                  <div className="cover-history-card__head">
                    <strong className="cover-history-card__route">{item.routeTitle}</strong>
                    <span className={`cover-history-card__pill cover-history-card__pill--${item.statusType}`}>
                      {item.statusLabel}
                    </span>
                  </div>
                  <div className="cover-history-card__details">
                    <span className="cover-history-card__meta">Vehicle: {item.vehicle}</span>
                    <span className="cover-history-card__meta">Plan: {item.planLine}</span>
                    <span className="cover-history-card__meta cover-history-card__meta--policy">
                      Policy ID: {item.policyId}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </section>
        )}

        <BottomScrollSpacer height={240} />
      </div>
    </main>
  );
}

export function CoverHistoryDetailScreen({
  selectedCover,
  claimsList = [],
  setScreen,
  historyReturn = 'history',
  openClaimFlow,
}) {
  const item = useMemo(() => {
    if (!selectedCover) return null;
    return mapCoverHistoryItem(selectedCover, claimsList);
  }, [selectedCover, claimsList]);

  if (!item) {
    return (
      <main className="screen cover-history-screen cover-history-detail-screen">
        <div className="cover-history-scroll">
          <header className="cover-history-header">
            <button
              type="button"
              className="cover-history-header__back"
              aria-label="Go back"
              onClick={() => setScreen?.(historyReturn)}
            >
              <ArrowLeft size={22} strokeWidth={2.25} color="#101820" />
            </button>
            <h1 className="cover-history-header__title">Cover Detail</h1>
            <span className="cover-history-header__spacer" aria-hidden="true" />
          </header>
          <section className="cover-history-empty">
            <p className="cover-history-empty__subtitle">Cover record not found.</p>
            <button type="button" className="cover-history-empty__cta" onClick={() => setScreen?.('history')}>
              Back to history
            </button>
          </section>
        </div>
      </main>
    );
  }

  const effectiveStatus = getEffectiveCoverStatus(item.cover);
  const statusLabel = item.hasClaim ? 'Claim linked' : effectiveStatus === 'active' ? 'Active' : 'Expired';

  return (
    <main className="screen cover-history-screen cover-history-detail-screen cover-history-screen-board">
      <div className="cover-history-scroll">
        <header className="cover-history-header">
          <button
            type="button"
            className="cover-history-header__back"
            aria-label="Go back"
            onClick={() => setScreen?.(historyReturn)}
          >
            <ArrowLeft size={22} strokeWidth={2.25} color="#101820" />
          </button>
          <h1 className="cover-history-header__title">Cover Detail</h1>
          <span className="cover-history-header__spacer" aria-hidden="true" />
        </header>

        <section className="cover-history-detail-hero">
          <span className={`cover-history-card__pill cover-history-card__pill--${item.statusType}`}>
            {item.statusLabel}
          </span>
          <h2 className="cover-history-detail-hero__title">{formatCoverRouteTitle(item.cover)}</h2>
          <p className="cover-history-detail-hero__subtitle">{formatCoverPlanLine(item.cover)}</p>
        </section>

        <section className="cover-history-detail-panel" aria-label="Cover details">
          <div className="cover-history-detail-row">
            <span className="cover-history-detail-row__label">Policy ID</span>
            <strong className="cover-history-detail-row__value">{getCoverPolicyId(item.cover)}</strong>
          </div>
          <div className="cover-history-detail-row">
            <span className="cover-history-detail-row__label">Route</span>
            <strong className="cover-history-detail-row__value">{formatCoverRouteTitle(item.cover)}</strong>
          </div>
          <div className="cover-history-detail-row">
            <span className="cover-history-detail-row__label">Vehicle</span>
            <strong className="cover-history-detail-row__value">{formatCoverVehicle(item.cover)}</strong>
          </div>
          <div className="cover-history-detail-row">
            <span className="cover-history-detail-row__label">Plan</span>
            <strong className="cover-history-detail-row__value">{formatCoverPlanLine(item.cover)}</strong>
          </div>
          <div className="cover-history-detail-row">
            <span className="cover-history-detail-row__label">Started</span>
            <strong className="cover-history-detail-row__value">
              {formatCoverDateTime(item.cover.startedAt || item.cover.createdAt)}
            </strong>
          </div>
          <div className="cover-history-detail-row cover-history-detail-row--last">
            <span className="cover-history-detail-row__label">Expires</span>
            <strong className="cover-history-detail-row__value">{formatCoverDateTime(item.cover.endsAt)}</strong>
          </div>
        </section>

        <section className="cover-history-detail-actions">
          <button type="button" className="cover-history-detail-action cover-history-detail-action--secondary">
            <FileText size={18} strokeWidth={2.2} color="#007A3D" aria-hidden="true" />
            <span>View receipt</span>
          </button>
          {item.hasClaim ? (
            <button
              type="button"
              className="cover-history-detail-action cover-history-detail-action--claim"
              onClick={() => setScreen?.('claim')}
            >
              View linked claim
            </button>
          ) : (
            <button
              type="button"
              className="cover-history-detail-action cover-history-detail-action--claim"
              onClick={() => openClaimFlow?.(1)}
            >
              Report accident
            </button>
          )}
        </section>

        <p className="cover-history-detail-note">Status: {statusLabel}</p>

        <BottomScrollSpacer height={170} />
      </div>
    </main>
  );
}
