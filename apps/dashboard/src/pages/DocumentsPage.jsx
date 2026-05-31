import React from 'react';
import { PageHeader, EmptyState, Card } from '../components/admin/ui.jsx';

export default function DocumentsPage() {
  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      <PageHeader title="Documents" description="Claims document and media management." />
      <Card>
        <EmptyState
          title="Document management coming soon"
          description="Document upload, review, AI tagging, and claims attachment will appear here once the document service is connected."
        />
      </Card>
    </div>
  );
}
