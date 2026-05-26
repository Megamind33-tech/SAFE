/**
 * @param {{
 *   title: string;
 *   subtitle: string;
 *   checked: boolean;
 *   disabled?: boolean;
 *   loading?: boolean;
 *   onChange: (next: boolean) => void;
 * }} props
 */
export default function NotificationToggleRow({
  title,
  subtitle,
  checked,
  disabled = false,
  loading = false,
  onChange,
}) {
  return (
    <div className={`notification-toggle-row${disabled ? ' notification-toggle-row--disabled' : ''}`}>
      <div className="notification-toggle-row__text">
        <strong className="notification-toggle-row__title">{title}</strong>
        <span className="notification-toggle-row__subtitle">{subtitle}</span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={title}
        className={`notification-toggle-row__switch${checked ? ' notification-toggle-row__switch--on' : ''}`}
        disabled={disabled || loading}
        onClick={() => onChange(!checked)}
      >
        <span className="notification-toggle-row__thumb" aria-hidden="true" />
      </button>
    </div>
  );
}
