import React, { useMemo, useState } from 'react';

function StatusPill({ tone, children, icon }) {
  const cls =
    tone === 'good'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : tone === 'warn'
        ? 'bg-amber-50 text-amber-800 border-amber-200'
        : tone === 'bad'
          ? 'bg-red-50 text-red-700 border-red-200'
          : 'bg-slate-50 text-slate-600 border-slate-200';

  return (
    <span className={['inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-black', cls].join(' ')}>
      {icon ? (
        <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      {children}
    </span>
  );
}

export default function DocumentsPage() {
  const files = useMemo(
    () => [
      {
        id: 'front',
        name: 'CL-2023-8991_FrontBumper.jpg',
        type: 'JPEG Image',
        size: '4.2 MB',
        uploadedAt: 'Oct 24, 2023 14:30',
        status: { label: 'Verified', tone: 'good', icon: null },
        icon: 'image',
        previewUrl: 'https://placehold.co/1200x675/png?text=Evidence+Image',
        claimId: 'CL-2023-8991',
        uploadedBy: 'Sarah Jenkins (Adjuster)',
        location: 'GPS: 40.7128° N, 74.0060° W',
        dimensions: '4032 × 3024 px',
        aiSummary:
          'Image exhibits patterns consistent with frontal impact collision at moderate speed. Primary damage isolated to bumper fascia, grille, and passenger-side headlamp assembly.',
        aiTags: ['Front Bumper', 'Headlight (R)', 'Grille'],
      },
      {
        id: 'police',
        name: 'Police_Report_NYPD_9921.pdf',
        type: 'PDF Document',
        size: '1.8 MB',
        uploadedAt: 'Oct 24, 2023 11:15',
        status: { label: 'Pending Review', tone: 'warn', icon: 'schedule' },
        icon: 'picture_as_pdf',
        previewUrl: 'https://placehold.co/1200x675/png?text=PDF+Preview',
        claimId: 'CL-2023-8991',
        uploadedBy: 'System',
        location: 'N/A',
        dimensions: 'N/A',
        aiSummary: 'Document awaiting validation. OCR index prepared; extraction confidence pending reviewer acceptance.',
        aiTags: ['Police Report', 'Liability'],
      },
      {
        id: 'dashcam',
        name: 'Dashcam_Footage_Oct23.mp4',
        type: 'MP4 Video',
        size: '128.5 MB',
        uploadedAt: 'Oct 23, 2023 09:45',
        status: { label: 'Processing (AI)', tone: 'neutral', icon: 'sync' },
        icon: 'videocam',
        previewUrl: 'https://placehold.co/1200x675/png?text=Video+Preview',
        claimId: 'CL-2023-8991',
        uploadedBy: 'Agent Upload',
        location: 'N/A',
        dimensions: '1920 × 1080 px',
        aiSummary: 'Video analysis in progress (object detection + timeline extraction).',
        aiTags: ['Dashcam', 'Timeline'],
      },
      {
        id: 'rear',
        name: 'CL-2023-8991_RearQuarter.jpg',
        type: 'JPEG Image',
        size: '3.9 MB',
        uploadedAt: 'Oct 22, 2023 16:20',
        status: { label: 'Verified', tone: 'good', icon: null },
        icon: 'image',
        previewUrl: 'https://placehold.co/1200x675/png?text=Evidence+Image',
        claimId: 'CL-2023-8991',
        uploadedBy: 'Agent Upload',
        location: 'N/A',
        dimensions: '4032 × 3024 px',
        aiSummary: 'Secondary damage visible on rear quarter panel; no clear wheel misalignment in this frame.',
        aiTags: ['Rear Quarter', 'Panel'],
      },
      {
        id: 'draft',
        name: 'Draft_Estimate_v1.docx',
        type: 'Word Doc',
        size: '45 KB',
        uploadedAt: 'Oct 20, 2023 10:05',
        status: { label: 'Rejected', tone: 'bad', icon: 'block' },
        icon: 'description',
        previewUrl: 'https://placehold.co/1200x675/png?text=DOCX+Preview',
        claimId: 'CL-2023-8991',
        uploadedBy: 'Underwriting',
        location: 'N/A',
        dimensions: 'N/A',
        aiSummary: 'Rejected due to missing line item references and mismatch with authorized parts list.',
        aiTags: ['Estimate', 'Rejected'],
      },
    ],
    []
  );

  const [selectedId, setSelectedId] = useState(files[0]?.id || '');
  const selected = files.find((f) => f.id === selectedId) || files[0];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <div className="text-2xl md:text-3xl font-black tracking-tight text-safe-ink">Document & Media Center</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)_380px] gap-3">
        <aside className="rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(2,6,23,0.04)] overflow-hidden">
          <div className="p-4 border-b border-slate-200">
            <button
              type="button"
              className="w-full rounded-xl bg-safe-electric px-4 py-2.5 text-xs font-black text-safe-ink shadow-sm inline-flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                upload
              </span>
              Upload Files
            </button>
          </div>

          <div className="p-3 space-y-5">
            <div>
              <div className="px-2 py-2 text-[11px] font-black uppercase tracking-widest text-slate-500">Categories</div>
              <div className="space-y-1">
                <button
                  type="button"
                  className="w-full flex items-center justify-between rounded-xl bg-safe-ink/5 px-3 py-2 text-left text-sm font-black text-safe-ink"
                >
                  <span className="inline-flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                      folder_open
                    </span>
                    All Files
                  </span>
                  <span className="rounded-full bg-safe-ink text-white px-2 py-0.5 text-[11px] font-black">1,204</span>
                </button>
                {[
                  { label: 'Policies', icon: 'policy' },
                  { label: 'Evidence', icon: 'car_crash' },
                  { label: 'Reports', icon: 'assignment' },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    className="w-full flex items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-black text-slate-600 hover:bg-slate-50"
                  >
                    <span className="inline-flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-slate-400" aria-hidden="true">
                        {item.icon}
                      </span>
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="px-2 py-2 text-[11px] font-black uppercase tracking-widest text-slate-500">Status</div>
              <div className="space-y-2 px-2">
                {[
                  { label: 'Verified', checked: true },
                  { label: 'Pending Review', checked: true },
                  { label: 'Processing (AI)', checked: false },
                ].map((s) => (
                  <label key={s.label} className="flex items-center gap-3 text-sm font-semibold text-slate-600">
                    <input
                      type="checkbox"
                      defaultChecked={s.checked}
                      className="h-4 w-4 rounded border-slate-300 text-safe-ink focus:ring-safe-electric/30"
                    />
                    {s.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(2,6,23,0.04)] overflow-hidden min-w-0">
          <div className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="h-9 w-9 rounded-xl grid place-items-center bg-safe-ink/5 text-safe-ink"
                title="List view"
              >
                <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                  view_list
                </span>
              </button>
              <button
                type="button"
                className="h-9 w-9 rounded-xl grid place-items-center text-slate-500 hover:bg-slate-50"
                title="Grid view"
              >
                <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                  grid_view
                </span>
              </button>
              <div className="mx-2 h-5 w-px bg-slate-200" />
              <div className="text-xs font-semibold text-slate-500">Showing {files.length} items in “Evidence”</div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Sort by:</span>
              <select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-safe-ink">
                <option>Date Uploaded (Newest)</option>
                <option>Name (A-Z)</option>
                <option>Size (Largest)</option>
              </select>
            </div>
          </div>

          <div className="max-h-[620px] overflow-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead className="sticky top-0 bg-slate-50 z-10 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 w-12">
                    <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-safe-ink focus:ring-safe-electric/30" />
                  </th>
                  <th className="py-3 px-4 text-[11px] font-black uppercase tracking-widest text-slate-500">File Name</th>
                  <th className="py-3 px-4 text-[11px] font-black uppercase tracking-widest text-slate-500">Type</th>
                  <th className="py-3 px-4 text-[11px] font-black uppercase tracking-widest text-slate-500">Size</th>
                  <th className="py-3 px-4 text-[11px] font-black uppercase tracking-widest text-slate-500">Date Uploaded</th>
                  <th className="py-3 px-4 text-[11px] font-black uppercase tracking-widest text-slate-500">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 text-sm">
                {files.map((f) => {
                  const selectedRow = f.id === selectedId;
                  return (
                    <tr
                      key={f.id}
                      className={[
                        'cursor-pointer transition-colors',
                        selectedRow ? 'bg-safe-ink/5' : 'hover:bg-slate-50',
                      ].join(' ')}
                      onClick={() => setSelectedId(f.id)}
                    >
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={selectedRow}
                          readOnly
                          className="h-4 w-4 rounded border-slate-300 text-safe-ink focus:ring-safe-electric/30"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <span className="material-symbols-outlined text-slate-400 text-[20px]" aria-hidden="true">
                            {f.icon}
                          </span>
                          <span className="font-black text-safe-ink">{f.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-semibold">{f.type}</td>
                      <td className="py-3 px-4 text-slate-600 font-semibold">{f.size}</td>
                      <td className="py-3 px-4 text-slate-600 font-semibold">{f.uploadedAt}</td>
                      <td className="py-3 px-4">
                        <StatusPill tone={f.status.tone} icon={f.status.icon}>
                          {f.status.label}
                        </StatusPill>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="hidden xl:flex rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(2,6,23,0.04)] overflow-hidden flex-col min-w-0">
          <div className="h-14 border-b border-slate-200 flex items-center justify-between px-4">
            <div className="min-w-0">
              <div className="truncate text-sm font-black text-safe-ink">{selected?.name || 'Preview'}</div>
              <div className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Preview</div>
            </div>
            <div className="flex items-center gap-1">
              {[
                { title: 'Download', icon: 'download' },
                { title: 'More', icon: 'more_vert' },
              ].map((a) => (
                <button
                  key={a.title}
                  type="button"
                  className="h-9 w-9 rounded-xl grid place-items-center text-slate-500 hover:bg-slate-50"
                  title={a.title}
                >
                  <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                    {a.icon}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 space-y-3.5 overflow-auto">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden aspect-video">
              {selected?.previewUrl ? (
                <img src={selected.previewUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full grid place-items-center text-sm font-semibold text-slate-500">No preview</div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-black uppercase tracking-widest text-slate-500">File Details</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="grid grid-cols-3 gap-y-3 text-xs">
                  <div className="text-slate-500 font-semibold">Claim ID</div>
                  <div className="col-span-2 font-black text-safe-ink">{selected?.claimId || '—'}</div>
                  <div className="text-slate-500 font-semibold">Uploaded By</div>
                  <div className="col-span-2 font-semibold text-slate-700">{selected?.uploadedBy || '—'}</div>
                  <div className="text-slate-500 font-semibold">Location</div>
                  <div className="col-span-2 font-semibold text-slate-700">{selected?.location || '—'}</div>
                  <div className="text-slate-500 font-semibold">Dimensions</div>
                  <div className="col-span-2 font-semibold text-slate-700">{selected?.dimensions || '—'}</div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-safe-ink" aria-hidden="true">
                  memory
                </span>
                <div className="text-[11px] font-black uppercase tracking-widest text-safe-ink">SAFE AI Analysis</div>
              </div>
              <div className="mt-3 text-sm font-semibold text-slate-600 leading-relaxed">{selected?.aiSummary || ''}</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(selected?.aiTags || []).map((t) => (
                  <span key={t} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-black text-slate-600">
                    {t}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button type="button" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-safe-ink hover:bg-slate-50">
                Request Retake
              </button>
              <button type="button" className="rounded-xl bg-safe-ink px-4 py-2.5 text-xs font-black text-white hover:bg-safe-midnight">
                Attach to Report
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

