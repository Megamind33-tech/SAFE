import React from 'react';
import { PageHeader, EmptyState, Card } from '../components/admin/ui.jsx';

export default function AnalyticsPage() {
  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      <PageHeader title="Executive Analytics" description="Performance and risk monitoring across the SAFE network." />
      <Card>
        <EmptyState
          title="Analytics dashboard coming soon"
          description="Safety index, premium analytics, claim timelines, and escalation metrics will appear here once the analytics pipeline is connected."
        />
      </Card>
    </div>
  );
}
