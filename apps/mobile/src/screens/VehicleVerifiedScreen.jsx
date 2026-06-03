import { useEffect, useState } from 'react';
import { ArrowLeft, BadgeCheck, ImageIcon } from 'lucide-react';
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
  const [vehiclePhotoFailed, setVehiclePhotoFailed] = useState(false);

  const operatorName = verified?.partner?.name || verified?.vehicle?.operatorName || '—';
  const verifiedVehicle = verified
    ? {
        registrationNumber: verified.vehicle?.plateNumber ?? '—',
        route: verified.route ? `${verified.route.originLabel} → ${verified.route.destinationLabel}` : null,
        operatorName,
        safeStickerId: verified.code || verified.qrCodeId || null,
        verificationTime: verified.verifiedAt,
        vehiclePhotoUrl:
          verified.vehiclePhotoUrl ||
          verified.vehicle?.vehiclePhotoUrl ||
          verified.vehicle?.photoUrl ||
          verified.vehicle?.imageUrl ||
          verified.vehicle?.photo ||
          verified.vehicle?.image ||
          null,
        vehicleImage: verified.vehicleImage || verified.vehicle?.vehicleImage || null,
        vehicleType: verified.vehicle?.vehicleType || verified.vehicleType || null,
        vehicleColor: verified.vehicle?.vehicleColor || verified.vehicleColor || null,
        driverName: verified.driver?.fullName || verified.driverName || null,
        driverPhotoUrl: verified.driver?.photoUrl || verified.driverPhotoUrl || null,
        status: eligibility?.canStartTripTracking ? 'Vehicle verified' : 'SAFE approved',
      }
    : null;

  const vehiclePhotoSrc =
    typeof verifiedVehicle?.vehiclePhotoUrl === 'string' && verifiedVehicle.vehiclePhotoUrl.trim()
      ? verifiedVehicle.vehiclePhotoUrl.trim()
      : typeof verifiedVehicle?.vehicleImage === 'string' && verifiedVehicle.vehicleImage.trim()
        ? verifiedVehicle.vehicleImage.trim()
        : null;

  useEffect(() => {
    setVehiclePhotoFailed(false);
  }, [vehiclePhotoSrc]);

  const canShowVehiclePhoto = Boolean(vehiclePhotoSrc) && !vehiclePhotoFailed;

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
          <div
            className="qr-verified-hero"
            style={{
              aspectRatio: '16 / 9',
              borderRadius: 18,
              overflow: 'hidden',
              background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.04) 0%, rgba(15, 23, 42, 0.02) 100%)',
              border: '1px solid rgba(15, 23, 42, 0.08)',
            }}
            aria-label="Verified vehicle photo"
          >
            {canShowVehiclePhoto ? (
              <img
                src={vehiclePhotoSrc}
                alt={`Vehicle photo for ${verifiedVehicle.registrationNumber}`}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                loading="eager"
                onError={(event) => {
                  setVehiclePhotoFailed(true);
                }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  color: '#64748b',
                  fontWeight: 700,
                  fontSize: 13,
                  padding: 12,
                  textAlign: 'center',
                }}
              >
                <ImageIcon size={18} aria-hidden="true" />
                <span>Vehicle photo unavailable</span>
              </div>
            )}
          </div>
          <span className="qr-verified-badge">
            <BadgeCheck size={14} aria-hidden="true" />
            {verifiedVehicle.status}
          </span>
          {eligibility?.canStartTripTracking ? (
            <p className="qr-verified-cover-note">Your SAFE cover is active for this vehicle.</p>
          ) : null}
          <dl className="qr-verified-details">
            <div>
              <dt>Registration</dt>
              <dd>{verifiedVehicle.registrationNumber}</dd>
            </div>
            {verifiedVehicle.route ? (
              <div>
                <dt>Route</dt>
                <dd>{verifiedVehicle.route}</dd>
              </div>
            ) : null}
            <div>
              <dt>Operator/company</dt>
              <dd>{verifiedVehicle.operatorName}</dd>
            </div>
            {verifiedVehicle.vehicleType ? (
              <div>
                <dt>Vehicle type</dt>
                <dd>{verifiedVehicle.vehicleType}</dd>
              </div>
            ) : null}
            {verifiedVehicle.vehicleColor ? (
              <div>
                <dt>Vehicle color</dt>
                <dd>{verifiedVehicle.vehicleColor}</dd>
              </div>
            ) : null}
            {verifiedVehicle.driverName ? (
              <div>
                <dt>Driver</dt>
                <dd style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {verifiedVehicle.driverPhotoUrl ? (
                    <img
                      src={verifiedVehicle.driverPhotoUrl}
                      alt=""
                      aria-hidden="true"
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '1px solid rgba(15, 23, 42, 0.12)',
                        flex: '0 0 auto',
                      }}
                      loading="lazy"
                      onError={(event) => {
                        event.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : null}
                  <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{verifiedVehicle.driverName}</span>
                </dd>
              </div>
            ) : null}
            {verifiedVehicle.safeStickerId ? (
              <div>
                <dt>SAFE sticker ID</dt>
                <dd>{verifiedVehicle.safeStickerId}</dd>
              </div>
            ) : null}
            <div>
              <dt>Verification time</dt>
              <dd>{formatVerifiedTime(verifiedVehicle.verificationTime)}</dd>
            </div>
          </dl>

          <div className="qr-actions">
            {eligibility?.canStartTripTracking ? (
              <>
                <button type="button" className="qr-btn qr-btn--primary" onClick={handleStartTrip}>
                  Start trip tracking
                </button>
                <button type="button" className="qr-btn qr-btn--secondary" onClick={() => setScreen('active')}>
                  View cover
                </button>
              </>
            ) : (
              <>
                <button type="button" className="qr-btn qr-btn--primary" onClick={handleBuyCover}>
                  Buy cover for this trip
                </button>
                <button type="button" className="qr-btn qr-btn--secondary" onClick={() => setScreen('qrScanner')}>
                  Scan another vehicle
                </button>
              </>
            )}
          </div>
          {eligibility?.reason ? <p className="qr-status-card">{eligibility.reason}</p> : null}
        </section>
      </div>
    </main>
  );
}
