import React, { useEffect, useState } from 'react';
import { dashboardPaymentsConfig, dashboardReadiness, loadDashboardToken } from '../api/dashboardApi.js';
import {
  Card,
  LoadingBlock,
  PageHeader,
  StatusBadge,
  WarningBanner,
} from '../components/admin/ui.jsx';

function ConfigRow({ label, configured = true, detail }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-slate-100 text-sm">
      <span className="font-semibold text-safe-ink">{label}</span>
      <div className="text-right">
        {typeof configured === 'boolean' ? <StatusBadge status={configured ? 'active' : 'inactive'} /> : null}
        {detail ? <div className="text-xs text-slate-500 mt-1">{detail}</div> : null}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [readiness, setReadiness] = useState(null);
  const [payments, setPayments] = useState(null);
  const [loading, setLoading] = useState(true);
  const token = loadDashboardToken();

  useEffect(() => {
    if (!token) return;
    Promise.all([dashboardReadiness(token), dashboardPaymentsConfig(token)])
      .then(([r, p]) => {
        setReadiness(r.readiness);
        setPayments(p);
      })
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="space-y-4 max-w-3xl">
      <PageHeader
        title="System configuration"
        description="Operational readiness flags. Secrets are never exposed — only configured / not configured."
      />

      {loading ? <LoadingBlock /> : null}

      {readiness ? (
        <>
          <WarningBanner warnings={readiness.warnings} />

          {readiness.defaultAdminCredentialsLikely ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 font-semibold">
              Default admin credentials may still be active in local seed data. Rotate before pilot.
            </div>
          ) : null}

          <Card>
            <div className="text-sm font-black text-safe-ink mb-3">Environment</div>
            <ConfigRow label="App environment" configured detail={readiness.appEnv} />
            <ConfigRow label="Database" configured detail={readiness.databaseType} />
            <ConfigRow label="Support phone" configured={readiness.supportPhoneConfigured} />
            <ConfigRow label="Support email" configured={readiness.supportEmailConfigured} />
            <ConfigRow label="Terms URL" configured={readiness.legalUrls.terms} />
            <ConfigRow label="Privacy URL" configured={readiness.legalUrls.privacy} />
            <ConfigRow label="Claims policy URL" configured={readiness.legalUrls.claimsPolicy} />
          </Card>

          <Card>
            <div className="text-sm font-black text-safe-ink mb-3">Payments & QR</div>
            <ConfigRow label="Payment gateway" configured={readiness.paymentGatewayEnabled} />
            <ConfigRow
              label="Simulate payment success"
              configured={!readiness.paymentSimulateSuccess}
              detail={readiness.paymentSimulateSuccess ? 'Enabled (dev)' : 'Off'}
            />
            <ConfigRow label="Card payments" configured={readiness.cardPaymentsEnabled} />
            <ConfigRow
              label="QR public base URL"
              configured={readiness.qrPublicBaseUrlConfigured}
              detail={readiness.qrPublicBaseUrlConfigured ? readiness.qrPublicBaseUrl : 'Using default — set SAFE_QR_PUBLIC_BASE_URL'}
            />
            {payments?.webhook ? (
              <div className="pt-3 text-xs text-slate-500">
                Webhook endpoint: POST /api/shared/webhooks/payment — {payments.webhook.note}
              </div>
            ) : null}
          </Card>

          <Card>
            <div className="text-sm font-black text-safe-ink mb-3">Claims & notifications</div>
            <ConfigRow
              label="Claims upload"
              configured={readiness.claimsUploadEnabled}
              detail={readiness.claimsUploadEnabled ? 'Blob storage required in production' : 'Metadata only'}
            />
            <ConfigRow label="SMS notifications" configured={readiness.notificationSmsEnabled} />
            <ConfigRow label="Email notifications" configured={readiness.notificationEmailEnabled} />
            <ConfigRow label="Data export" configured={readiness.dataExportEnabled} />
            <ConfigRow label="Account deletion" configured={readiness.accountDeletionEnabled} />
          </Card>

          <p className="text-xs text-slate-500">See docs/PRODUCTION_READINESS.md for the full deployment checklist.</p>
        </>
      ) : null}
    </div>
  );
}
