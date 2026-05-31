import React from 'react';
import { PageHeader, EmptyState, Card } from '../components/admin/ui.jsx';

export default function LiveOpsPage() {
  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      <PageHeader title="Live Operations" description="Field operations and incident command." />
      <Card>
        <EmptyState
          title="Live ops dashboard coming soon"
          description="Real-time field operations, incident dispatch, and responder management will appear here once the operations module is connected."
        />
      </Card>
    </div>
  );
}
