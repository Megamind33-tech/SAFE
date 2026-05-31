import React, { useEffect, useState } from 'react';
import { dashboardDocuments, loadDashboardToken } from '../api/dashboardApi.js';
import {
  Card,
  DataTable,
  ErrorCard,
  FilterTabs,
  LoadingBlock,
  MetricCard,
  PageHeader,
  SearchInput,
  StatusBadge,
} from '../components/admin/ui.jsx';
import { fmtDateTime, filterRows } from '../lib/format.js';

const TYPE_OPTIONS = [
  { value: '', label: 'All types' },
  { value: 'police_report', label: 'Police report' },
  { value: 'medical_note', label: 'Medical note' },
  { value: 'photo', label: 'Photo' },
  { value: 'other', label: 'Other' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
];

function docTypeLabel(type) {
  const map = {
    police_report: 'Police report',
    medical_note: 'Medical note',
    photo: 'Photo',
    other: 'Other',
  };
  return map[type] ?? type ?? '—';
}

const COLUMNS = [
  { key: 'filename', label: 'Filename', render: (r) => r.filename || '—' },
  { key: 'type', label: 'Type', render: (r) => docTypeLabel(r.type) },
  { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  { key: 'claim', label: 'Claim ref', render: (r) => r.claimReference || '—' },
  { key: 'claimStatus', label: 'Claim status', render: (r) => <StatusBadge status={r.claimStatus} /> },
  {
    key: 'passenger',
    label: 'Passenger',
    render: (r) => r.passengerName || r.passengerPhone || '—',
  },
  { key: 'uploaded', label: 'Uploaded', render: (r) => fmtDateTime(r.createdAt) },
];

export default function DocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const token = loadDashboardToken();

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    dashboardDocuments(token, {
      type: typeFilter || undefined,
      status: statusFilter || undefined,
    })
      .then((d) => {
        setDocuments(d.documents || []);
        setTotal(d.total ?? 0);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token, typeFilter, statusFilter]);

  const visible = filterRows(documents, search, [
    'filename',
    'claimReference',
    'passengerName',
    'passengerPhone',
    'type',
    'status',
  ]);

  const pending = documents.filter((d) => d.status === 'pending').length;
  const accepted = documents.filter((d) => d.status === 'accepted').length;
  const rejected = documents.filter((d) => d.status === 'rejected').length;

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      <PageHeader
        title="Documents"
        description="Claims document and media management. Review, accept, or reject submitted files."
      />

      {loading ? <LoadingBlock /> : null}
      {error ? <ErrorCard message={error} /> : null}

      {!loading && !error ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard label="Total documents" value={total} />
            <MetricCard label="Pending review" value={pending} />
            <MetricCard label="Accepted" value={accepted} />
            <MetricCard label="Rejected" value={rejected} />
          </div>

          <SearchInput value={search} onChange={setSearch} placeholder="Search by filename, claim ref, or passenger…" />

          <FilterTabs value={typeFilter} onChange={setTypeFilter} options={TYPE_OPTIONS} />
          <FilterTabs value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} />

          <Card padding={false}>
            <DataTable
              columns={COLUMNS}
              rows={visible}
              emptyTitle="No documents found"
            />
          </Card>
        </>
      ) : null}
    </div>
  );
}
