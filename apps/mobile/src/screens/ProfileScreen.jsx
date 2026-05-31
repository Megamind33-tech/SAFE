import {
  Bell,
  ChevronRight,
  FileText,
  QrCode,
  Settings,
  ShieldCheck,
  Users,
  WalletCards,
} from 'lucide-react';
import safeShieldIcon from '../assets/real/safe_shield_clean.png';
import BottomScrollSpacer from '../components/BottomScrollSpacer.jsx';
import {
  isUserVerified,
  resolveClaimsCount,
  resolveCurrentPlanLabel,
  resolveTripsCoveredCount,
  resolveUserName,
} from '../utils/activeCover.js';

const SAFE_GREEN = '#007A3D';
const ICON_SIZE = 21;
const ICON_STROKE = 2;

function userInitials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return 'SM';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function formatPhoneDisplay(phone) {
  if (!phone) return 'Phone not added';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length >= 12 && digits.startsWith('260')) {
    return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
  }
  return phone;
}

function ProfileMenuIcon({ Icon }) {
  return (
    <span className="profile-menu-card__icon" aria-hidden="true">
      <Icon size={ICON_SIZE} strokeWidth={ICON_STROKE} color={SAFE_GREEN} />
    </span>
  );
}

const MENU_ITEMS = [
  {
    key: 'scanQr',
    title: 'Scan vehicle QR',
    subtitle: 'Verify your minibus before buying cover',
    icon: QrCode,
    screen: 'qrScanner',
  },
  {
    key: 'history',
    title: 'Cover history',
    subtitle: 'Receipts and active covers',
    icon: FileText,
    screen: 'history',
    useHistory: true,
  },
  {
    key: 'payments',
    title: 'Payment methods',
    subtitle: 'Mobile Money and card payments',
    icon: WalletCards,
    screen: 'profilePayments',
  },
  {
    key: 'contacts',
    title: 'Trusted contacts',
    subtitle: 'Emergency contact list',
    icon: Users,
    screen: 'trustedContacts',
  },
  {
    key: 'notifications',
    title: 'Notifications',
    subtitle: 'Trip and claim updates',
    icon: Bell,
    screen: 'notifications',
  },
  {
    key: 'help',
    title: 'Help and safety',
    subtitle: 'Support and accident guidance',
    icon: ShieldCheck,
    screen: 'helpSafety',
  },
  {
    key: 'settings',
    title: 'Settings',
    subtitle: 'Privacy and account preferences',
    icon: Settings,
    screen: 'settings',
  },
];

export default function ProfileScreen({
  cityLabel = 'Lusaka',
  openHistory,
  setScreen,
  coversHistory = [],
  claimsList = [],
  activeCover,
  session,
}) {
  const user = session?.user ?? null;
  const userName = resolveUserName(user);
  const phone = user?.phone || null;
  const displayName = userName || (user ? 'SAFE member' : 'Guest');
  const verified = isUserVerified(user);
  const tripsCount = resolveTripsCoveredCount(coversHistory, user);
  const claimsCount = resolveClaimsCount(claimsList, user);
  const planLabel = resolveCurrentPlanLabel(activeCover);

  const handleMenuClick = (item) => {
    if (item.useHistory) {
      openHistory?.('profile');
      return;
    }
    setScreen?.(item.screen);
  };

  return (
    <main className="screen profile-screen profile-screen-board">
      <div className="profile-screen-scroll">
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

        <section className="profile-screen-board__title-area">
          <h1 className="profile-screen-board__title">Profile</h1>
          <p className="profile-screen-board__subtitle">Manage your SAFE account and trip protection.</p>
        </section>

        <article className="profile-identity-card">
          <div className="profile-identity-card__avatar" aria-hidden="true">
            {userInitials(userName)}
          </div>
          <div className="profile-identity-card__body">
            <h2 className="profile-identity-card__name">{displayName}</h2>
            <p className="profile-identity-card__phone">{formatPhoneDisplay(phone)}</p>
          </div>
        </article>

        <section className="profile-stats-grid" aria-label="Account stats">
          <div className="profile-stat-card">
            <strong className="profile-stat-card__value">{tripsCount}</strong>
            <span className="profile-stat-card__label">Trips covered</span>
          </div>
          <div className="profile-stat-card">
            <strong className="profile-stat-card__value">{claimsCount}</strong>
            <span className="profile-stat-card__label">Claims</span>
          </div>
          <div className="profile-stat-card">
            <strong className="profile-stat-card__value">{planLabel}</strong>
            <span className="profile-stat-card__label">Current plan</span>
          </div>
        </section>

        <nav className="profile-menu-list" aria-label="Profile settings">
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                type="button"
                className="profile-menu-card"
                onClick={() => handleMenuClick(item)}
              >
                <ProfileMenuIcon Icon={Icon} />
                <span className="profile-menu-card__text">
                  <span className="profile-menu-card__title">{item.title}</span>
                  <span className="profile-menu-card__subtitle">{item.subtitle}</span>
                </span>
                <ChevronRight className="profile-menu-card__chevron" size={20} strokeWidth={2.25} aria-hidden="true" />
              </button>
            );
          })}
        </nav>

        <BottomScrollSpacer height={160} />
      </div>
    </main>
  );
}
