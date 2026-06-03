import React from 'react';
import { useNavigate } from 'react-router-dom';
import { clearDashboardToken } from '../api/dashboardApi.js';
import { Card, PageHeader } from '../components/admin/ui.jsx';
import { useDashboardSession } from '../context/DashboardSessionContext.jsx';

export default function DashboardAccessDeniedPage() {
  const navigate = useNavigate();
  const { error, errorCode, refresh } = useDashboardSession();

  function backToLogin() {
    clearDashboardToken();
    refresh();
    navigate('/login', { replace: true, state: { from: '/' } });
  }

  return (
    <div>
      <PageHeader
        title="Dashboard access blocked"
        description="This account cannot access the operations dashboard yet."
      />
      <Card>
        <p className="text-sm text-slate-600 leading-relaxed">
          {error || 'Please sign in with a company staff account to continue.'}
        </p>
        {errorCode ? (
          <p className="mt-2 text-[11px] font-mono text-slate-400">Code: {errorCode}</p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={backToLogin}
            className="rounded-xl bg-safe-ink px-4 py-2 text-xs font-black text-white hover:bg-safe-midnight"
          >
            Back to login
          </button>
        </div>
      </Card>
    </div>
  );
}
