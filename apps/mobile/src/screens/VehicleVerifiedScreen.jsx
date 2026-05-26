import { ArrowLeft, BadgeCheck } from 'lucide-react';
import { formatVerifiedTime, toCoverVehicleContext } from '../services/qr.js';

export default function VehicleVerifiedScreen({
  session,
  setScreen,
  qrResult,
  setScannedVehicle,
  openLiveTrip,
  refreshPassengerData,
}) {
  const verified = qrResult?.status === 'verified' ? qrResult : null;
  const eligibility = verified?.coverEligibility;

  if (!verified) {
    return (
      <main className="screen qr-screen">
        <div className="qr-screen__scroll">
          <section className="qr-error-card">
            <h2>This QR code could not be verified.</h2>
            <p>Return to the scanner and try again.</p>
            <button type="button" className="qr-btn qr-btn--primary" onClick={() => setScreen('qrScanner')}>
              Try again
            </button>
          </section>
        </div>
      </main>
    );
  }

  const handleBuyCover = () => {
    setScannedVehicle?.(toCoverVehicleContext(verified));
    setScreen('coverPlans');
  };

  const handleStartTrip = async () => {
    await refreshPassengerData?.(session.token);
    openLiveTrip?.();
  };

  return (
    <main className="screen qr-screen">
      <div className="qr-screen__scroll">
        <header className="qr-header">
          <button type="button" className="qr-header__back" onClick={() => setScreen('qrScanner')}>
            <ArrowLeft size={16} aria-hidden="true" />
            Back
          </button>
          <h1 className="qr-header__title">Vehicle verified</h1>
        </header>

        <section className="qr-verified-card" aria-label="Verified vehicle details">
          <span className="qr-verified-badge">
            <BadgeCheck size={14} aria-hidden="true" />
            Verified
          </span>
          <dl className="qr-verified-details">
            <div>
              <dt>Plate number</dt>
              <dd>{verified.vehicle.plateNumber}</dd>
            </div>
            {verified.route ? (
              <div>
                <dt>Route</dt>
                <dd>
                  {verified.route.originLabel} → {verified.route.destinationLabel}
                </dd>
              </div>
            ) : null}
            {verified.partner?.name ? (
              <div>
                <dt>Operator</dt>
                <dd>{verified.partner.name}</dd>
              </div>
            ) : null}
            <div>
              <dt>Verification status</dt>
              <dd>Vehicle verified</dd>
            </div>
            <div>
              <dt>Last verified</dt>
              <dd>{formatVerifiedTime(verified.verifiedAt)}</dd>
            </div>
          </dl>

          <div className="qr-actions">
            {eligibility?.canStartTripTracking ? (
              <button type="button" className="qr-btn qr-btn--primary" onClick={handleStartTrip}>
                Start trip tracking
              </button>
            ) : (
              <button type="button" className="qr-btn qr-btn--primary" onClick={handleBuyCover}>
                Buy cover for this trip
              </button>
            )}
            <button type="button" className="qr-btn qr-btn--secondary" onClick={() => setScreen('qrScanner')}>
              Scan another QR
            </button>
          </div>
          {eligibility?.reason ? <p className="qr-status-card">{eligibility.reason}</p> : null}
        </section>
      </div>
    </main>
  );
}
