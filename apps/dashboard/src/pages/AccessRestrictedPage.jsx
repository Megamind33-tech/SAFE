import React from 'react';
import { useDashboardSession } from '../context/DashboardSessionContext.jsx';
import { Card, PageHeader } from '../components/admin/ui.jsx';

export default function AccessRestrictedPage() {
  const { user } = useDashboardSession();

  return (
    <div>
      <PageHeader
        title="Access restricted"
        subtitle="Your staff role does not allow access to this section."
      />
      <Card>
        <p className="text-sm text-slate-600 leading-relaxed">
          Signed in as <strong>{user?.email || user?.role || 'staff user'}</strong> ({user?.role}).
          Contact a super admin if you need additional permissions.
        </p>
      </Card>
    </div>
  );
}
