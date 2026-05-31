import React from 'react';
import { PageHeader, EmptyState, Card } from '../components/admin/ui.jsx';

export default function FraudPage() {
  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      <PageHeader title="Regulatory Center" description="National compliance, certifications, and flagged incident monitoring." />
      <Card>
        <EmptyState
          title="Compliance dashboard coming soon"
          description="Real-time compliance scores, incident tracking, and regulatory reporting will appear here once the analytics pipeline is connected."
        />
      </Card>
    </div>
  );
}
