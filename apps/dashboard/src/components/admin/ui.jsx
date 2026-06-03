import React from 'react';
import { Link } from 'react-router-dom';

export function PageHeader({ title, description, breadcrumbs = [], actions }) {
  return (
    <div className="mb-4 space-y-2">
      {breadcrumbs.length > 0 ? (
        <nav className="text-xs font-semibold text-slate-500 flex flex-wrap items-center gap-1">
          {breadcrumbs.map((crumb, i) => (
            <span key={`${crumb.label}-${i}`} className="inline-flex items-center gap-1">
              {i > 0 ? <span className="text-slate-300">/</span> : null}
              {crumb.to ? (
                <Link to={crumb.to} className="hover:text-safe-ink">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-slate-700">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      ) : null}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-safe-ink break-words">{title}</h1>
          {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}

export function Card({ children, className = '', padding = true }) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(2,6,23,0.03)] ${padding ? 'p-4' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

export function StatusBadge({ status, className = '' }) {
  const normalized = String(status ?? 'unknown').toLowerCase();
  const styles = {
    active: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    live: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    succeeded: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    approved: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    paid: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    resolved: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    verified: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    pending: 'bg-amber-50 text-amber-800 border-amber-200',
    submitted: 'bg-amber-50 text-amber-800 border-amber-200',
    open: 'bg-amber-50 text-amber-800 border-amber-200',
    in_progress: 'bg-sky-50 text-sky-800 border-sky-200',
    under_review: 'bg-sky-50 text-sky-800 border-sky-200',
    needs_action: 'bg-orange-50 text-orange-800 border-orange-200',
    stale: 'bg-orange-50 text-orange-800 border-orange-200',
    failed: 'bg-red-50 text-red-800 border-red-200',
    rejected: 'bg-red-50 text-red-800 border-red-200',
    disabled: 'bg-slate-100 text-slate-600 border-slate-200',
    expired: 'bg-slate-100 text-slate-600 border-slate-200',
    inactive: 'bg-slate-100 text-slate-600 border-slate-200',
    suspended: 'bg-slate-100 text-slate-600 border-slate-200',
    ended: 'bg-slate-100 text-slate-600 border-slate-200',
  };
  const style = styles[normalized] ?? 'bg-slate-50 text-slate-700 border-slate-200';
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${style} ${className}`}
    >
      {String(status).replace(/_/g, ' ')}
    </span>
  );
}

export function EmptyState({ title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="text-sm font-black text-safe-ink">{title}</div>
      {description ? <p className="mt-2 max-w-md text-sm text-slate-500">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function LoadingBlock({ label = 'Loading…' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-3">
      <div className="h-8 w-8 rounded-full border-2 border-slate-200 border-t-safe-ink animate-spin" />
      <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
    </div>
  );
}

export function ErrorCard({ message, onRetry }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-start justify-between gap-4">
      <span>{message}</span>
      {onRetry ? (
        <button type="button" onClick={onRetry} className="shrink-0 text-xs font-black underline">
          Retry
        </button>
      ) : null}
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder = 'Search…' }) {
  return (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full min-w-0 md:w-72 md:max-w-sm rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-safe-ink placeholder:text-slate-400 focus:outline-none focus:border-safe-green focus:ring-2 focus:ring-safe-green/20"
    />
  );
}

export function FilterTabs({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-xl px-3 py-2 text-xs font-black capitalize ${
            value === opt.value ? 'bg-safe-ink text-white' : 'bg-white border border-slate-200 text-slate-600'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function MetricCard({ label, value, sub, to, onClick }) {
  const displayValue =
    value === undefined || value === null || value === '' || String(value).toLowerCase() === 'undefined'
      ? '0'
      : value;
  const inner = (
    <>
      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</div>
      <div className="mt-2 text-3xl font-black tracking-tight text-safe-ink">{displayValue}</div>
      {sub ? <div className="mt-1.5 text-xs font-semibold text-slate-500">{sub}</div> : null}
    </>
  );
  const className =
    'rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(2,6,23,0.03)] hover:shadow-[0_10px_30px_rgba(2,6,23,0.06)] transition-all text-left w-full';
  if (to) {
    return (
      <Link to={to} className={`${className} block hover:border-safe-green/40`}>
        {inner}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {inner}
      </button>
    );
  }
  return <div className={className}>{inner}</div>;
}

export function DataTable({ columns, rows, onRowClick, emptyTitle = 'No records' }) {
  if (!rows.length) {
    return <EmptyState title={emptyTitle} description="Nothing matches the current filters yet." />;
  }
  return (
    <div className="max-w-full overflow-x-auto overscroll-x-contain">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={`px-4 py-3 ${col.className ?? ''}`}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`border-t border-slate-100 ${onRowClick ? 'cursor-pointer hover:bg-slate-50' : ''}`}
            >
              {columns.map((col) => (
                <td key={col.key} className={`px-4 py-3 ${col.className ?? ''}`}>
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DetailPanel({ title, children, onClose }) {
  return (
    <aside className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4 h-fit max-h-none overflow-visible xl:sticky xl:top-16 xl:max-h-[calc(100vh-5rem)] xl:overflow-y-auto">
      <div className="flex items-start justify-between gap-3">
        <div className="text-lg font-black text-safe-ink">{title}</div>
        {onClose ? (
          <button type="button" onClick={onClose} className="text-xs font-bold text-slate-500 hover:text-safe-ink">
            Close
          </button>
        ) : null}
      </div>
      {children}
    </aside>
  );
}

export function WarningBanner({ warnings = [] }) {
  if (!warnings.length) return null;
  return (
    <div className="space-y-2">
      {warnings.map((w) => (
        <div
          key={w.id}
          className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
            w.severity === 'critical'
              ? 'border-red-200 bg-red-50 text-red-800'
              : w.severity === 'warning'
                ? 'border-amber-200 bg-amber-50 text-amber-900'
                : 'border-slate-200 bg-slate-50 text-slate-700'
          }`}
        >
          {w.message}
        </div>
      ))}
    </div>
  );
}
