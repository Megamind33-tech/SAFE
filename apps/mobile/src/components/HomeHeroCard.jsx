import vehicleAsset from '../assets/safe/transport/green_bus_with_protective_emblem_transparent.png';

function compactValidChip(endsAt) {
  if (!endsAt) return 'Valid • Pending';
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const mins = Math.ceil(diff / 60000);
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    return rem > 0 ? `Valid • ${hrs}h ${rem}m` : `Valid • ${hrs}h`;
  }
  return `Valid • ${mins} mins`;
}

export default function HomeHeroCard({ activeCoverState, isProtected, onScanVehicle }) {
  const statusChip = isProtected ? compactValidChip(activeCoverState?.endsAt) : 'Unprotected';
  const title = isProtected ? 'Active cover' : 'Secure your ride';
  const subtitle = isProtected
    ? 'Validated for this trip'
    : 'Protect your current commute before boarding.';

  return (
    <section
      className="home-hero-card"
      aria-label={isProtected ? 'Active cover' : 'Get covered'}
    >
      <div className="home-hero-card__text">
        <h2 className="home-hero-card__title">{title}</h2>
        <p className="home-hero-card__subtitle">{subtitle}</p>
        <span
          className={`home-hero-card__chip ${
            isProtected ? 'home-hero-card__chip--valid' : 'home-hero-card__chip--unprotected'
          }`}
        >
          {statusChip}
        </span>
        <button className="home-hero-card__cta" type="button" onClick={onScanVehicle}>
          Scan vehicle
        </button>
      </div>

      <div className="home-hero-card__asset">
        <img className="home-hero-card__vehicle" src={vehicleAsset} alt="" aria-hidden="true" />
      </div>
    </section>
  );
}
