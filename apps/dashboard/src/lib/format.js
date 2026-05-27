export function fmtDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

export function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { dateStyle: 'medium' });
}

export function classNames(...parts) {
  return parts.filter(Boolean).join(' ');
}

export function filterRows(rows, search, keys) {
  const q = search.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((row) =>
    keys.some((key) => {
      const val = key.split('.').reduce((acc, k) => acc?.[k], row);
      return val != null && String(val).toLowerCase().includes(q);
    }),
  );
}
