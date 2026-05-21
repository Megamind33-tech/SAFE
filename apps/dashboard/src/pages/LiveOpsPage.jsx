import React, { useMemo, useState } from 'react';

function Segmented({ options, value, onChange }) {
  return (
    <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={[
              'px-3 py-2 rounded-xl text-xs font-black transition-colors',
              active ? 'bg-safe-ink text-white' : 'text-slate-600 hover:bg-slate-50',
            ].join(' ')}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function FieldOpsView() {
  const incidents = useMemo(
    () => [
      {
        id: 'INC-8492',
        severity: 'Critical',
        title: 'Multi-Vehicle Collision',
        location: 'I-95 Northbound, Mile 42',
        time: '12m ago',
        tone: 'bad',
      },
      {
        id: 'INC-8490',
        severity: 'Flagged',
        title: 'Property Damage Report',
        location: '1420 Downtown Ave',
        time: '45m ago',
        tone: 'warn',
      },
      {
        id: 'INC-8488',
        severity: 'Standard',
        title: 'Roadside Assistance',
        location: 'Kafue Road, Southbound',
        time: '2h ago',
        tone: 'neutral',
      },
    ],
    []
  );

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(2,6,23,0.04)] flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="h-12 w-12 rounded-full bg-slate-200 border border-slate-300 overflow-hidden" />
            <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-white" />
          </div>
          <div>
            <div className="text-sm font-black text-safe-ink">Agent J. Smith</div>
            <div className="text-xs font-semibold text-slate-500">Unit 42 · Sector Alpha</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
            <button type="button" className="px-3 py-2 rounded-xl bg-white text-xs font-black text-safe-ink shadow-sm">
              Active
            </button>
            <button type="button" className="px-3 py-2 rounded-xl text-xs font-black text-slate-600 hover:bg-white">
              Standby
            </button>
          </div>
          <button type="button" className="rounded-xl bg-safe-electric px-4 py-2.5 text-xs font-black text-safe-ink shadow-sm inline-flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              add
            </span>
            Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-lg font-black tracking-tight text-safe-ink">Active Incidents</div>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-600">3 Assigned</span>
          </div>

          <div className="space-y-3">
            {incidents.map((i) => (
              <article
                key={i.id}
                className={[
                  'rounded-2xl border bg-white p-4 shadow-[0_10px_30px_rgba(2,6,23,0.04)] relative overflow-hidden',
                  'border-slate-200 hover:border-slate-300 transition-colors cursor-pointer',
                ].join(' ')}
              >
                <div
                  className={[
                    'absolute left-0 top-0 bottom-0 w-1',
                    i.tone === 'bad' ? 'bg-red-500' : i.tone === 'warn' ? 'bg-amber-400' : 'bg-slate-300',
                  ].join(' ')}
                />
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={[
                          'rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider',
                          i.tone === 'bad'
                            ? 'bg-red-50 text-red-700'
                            : i.tone === 'warn'
                              ? 'bg-amber-50 text-amber-800'
                              : 'bg-slate-50 text-slate-600',
                        ].join(' ')}
                      >
                        {i.severity}
                      </span>
                      <span className="text-[11px] font-black text-slate-500">{i.id}</span>
                    </div>
                    <div className="mt-2 text-sm font-black text-safe-ink">{i.title}</div>
                    <div className="mt-1 text-xs font-semibold text-slate-500 inline-flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                        location_on
                      </span>
                      {i.location}
                    </div>
                  </div>
                  <div
                    className={[
                      'shrink-0 text-xs font-black inline-flex items-center gap-1',
                      i.tone === 'bad' ? 'text-red-600' : 'text-slate-500',
                    ].join(' ')}
                  >
                    <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                      timer
                    </span>
                    {i.time}
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <button type="button" className="flex-1 rounded-xl bg-safe-ink px-4 py-2.5 text-xs font-black text-white hover:bg-safe-midnight">
                    Update Status
                  </button>
                  <button
                    type="button"
                    className="h-10 w-10 rounded-xl border border-slate-200 bg-white grid place-items-center text-safe-ink hover:bg-slate-50"
                    title="Directions"
                  >
                    <span className="material-symbols-outlined" aria-hidden="true">
                      directions
                    </span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div className="text-lg font-black tracking-tight text-safe-ink">Sector Overview</div>

          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-[0_10px_30px_rgba(2,6,23,0.04)]">
            <div className="h-60 bg-slate-100 relative">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(7,20,43,0.12),transparent_55%),radial-gradient(circle_at_70%_60%,rgba(255,199,0,0.18),transparent_60%)]" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="relative grid place-items-center">
                  <div className="absolute h-24 w-24 rounded-full bg-safe-ink/10 animate-ping" />
                  <div className="h-10 w-10 rounded-full bg-safe-ink text-white grid place-items-center shadow">
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                      my_location
                    </span>
                  </div>
                </div>
              </div>
              <div className="absolute top-10 right-10 h-3.5 w-3.5 rounded-full bg-red-500 border-2 border-white shadow" />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(2,6,23,0.04)]">
            <div className="text-[11px] font-black uppercase tracking-widest text-slate-500">Proximity Alerts</div>
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-red-600" aria-hidden="true">
                  warning
                </span>
                <div>
                  <div className="text-sm font-black text-safe-ink">Severe Weather Warning</div>
                  <div className="text-xs font-semibold text-slate-500">Sector Alpha · 2 miles</div>
                </div>
              </div>
              <div className="text-xs font-black text-slate-600">14:00</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function IncidentCommandView() {
  const queue = useMemo(
    () => [
      { id: 'INC-8902', title: 'Multi-Vehicle Collision', location: 'I-95 Northbound, Mile Marker 42', age: '2m ago', tone: 'bad' },
      { id: 'INC-8901', title: 'Commercial Rollover', location: 'Hwy 17 & Industrial Pkwy', age: '8m ago', tone: 'warn' },
      { id: 'INC-8898', title: 'Engine Failure (Hazardous)', location: 'Route 66, Desert stretch', age: '15m ago', tone: 'good' },
      { id: 'INC-8895', title: 'Tire Blowout', location: 'Rest Stop 4, I-80 West', age: '42m ago', tone: 'neutral' },
    ],
    []
  );

  const [activeId, setActiveId] = useState(queue[0]?.id || '');
  const active = queue.find((q) => q.id === activeId) || queue[0];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)_380px] gap-4">
      <aside className="rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(2,6,23,0.04)] overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="text-sm font-black text-safe-ink">Pending Dispatch</div>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-black text-slate-600">{queue.length}</span>
        </div>
        <div className="p-3 space-y-2">
          {queue.map((q) => (
            <button
              key={q.id}
              type="button"
              onClick={() => setActiveId(q.id)}
              className={[
                'w-full text-left rounded-2xl border p-3 transition-colors relative overflow-hidden',
                q.id === activeId ? 'bg-safe-ink/5 border-safe-ink/20' : 'bg-white border-slate-200 hover:bg-slate-50',
              ].join(' ')}
            >
              <div
                className={[
                  'absolute left-0 top-0 bottom-0 w-1',
                  q.tone === 'bad' ? 'bg-red-500' : q.tone === 'warn' ? 'bg-amber-400' : q.tone === 'good' ? 'bg-emerald-500' : 'bg-slate-300',
                ].join(' ')}
              />
              <div className="flex items-start justify-between gap-2 pl-2">
                <div className="text-xs font-black text-safe-ink">{q.id}</div>
                <div className="text-[10px] font-black text-slate-500 inline-flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
                    schedule
                  </span>
                  {q.age}
                </div>
              </div>
              <div className="mt-2 pl-2">
                <div className="text-sm font-black text-safe-ink">{q.title}</div>
                <div className="mt-1 text-xs font-semibold text-slate-500 inline-flex items-start gap-1">
                  <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                    location_on
                  </span>
                  {q.location}
                </div>
              </div>
            </button>
          ))}
        </div>
      </aside>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(2,6,23,0.04)] overflow-hidden relative min-h-[420px]">
        <div className="absolute inset-0 bg-slate-100" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,199,0,0.25),transparent_55%),radial-gradient(circle_at_70%_70%,rgba(7,20,43,0.15),transparent_50%)]" />
        <div className="absolute top-4 left-4 flex gap-2">
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <button type="button" className="h-9 w-9 grid place-items-center border-b border-slate-200 text-slate-600 hover:bg-slate-50" title="Zoom in">
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                add
              </span>
            </button>
            <button type="button" className="h-9 w-9 grid place-items-center text-slate-600 hover:bg-slate-50" title="Zoom out">
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                remove
              </span>
            </button>
          </div>
          <button
            type="button"
            className="h-10 w-10 rounded-2xl border border-slate-200 bg-white grid place-items-center text-slate-600 hover:bg-slate-50 shadow-sm"
            title="Recenter"
          >
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
              my_location
            </span>
          </button>
        </div>

        <div className="absolute top-[40%] left-[55%] -translate-x-1/2 -translate-y-1/2">
          <div className="relative grid place-items-center">
            <div className="absolute h-12 w-12 rounded-full bg-red-500/25 animate-ping" />
            <div className="h-11 w-11 rounded-full bg-red-600 text-white grid place-items-center shadow border-2 border-white">
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                warning
              </span>
            </div>
          </div>
          <div className="mt-2 rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs font-black text-safe-ink shadow-sm inline-flex items-center gap-2">
            {active?.id}
            <span className="text-red-600">Critical</span>
          </div>
        </div>
      </section>

      <aside className="rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(2,6,23,0.04)] overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm font-black text-safe-ink">{active?.id}</div>
              <div className="mt-1 text-lg font-black tracking-tight text-safe-ink">{active?.title}</div>
              <div className="mt-2 text-xs font-semibold text-slate-500 inline-flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                  location_on
                </span>
                {active?.location}
              </div>
            </div>
            <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-black text-red-700 inline-flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
                emergency
              </span>
              Critical
            </span>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="text-[11px] font-black uppercase tracking-widest text-slate-500">Location Data</div>
            <div className="mt-2 text-sm font-semibold text-slate-700">Weather: Raining · Visibility Low</div>
            <div className="mt-1 text-xs font-semibold text-slate-500">Lat: 39.1023 · Lng: -76.8834</div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase tracking-widest text-slate-500">
              Nearby Responders
            </div>
            <div className="p-2 space-y-2">
              {[
                { title: 'Highway Patrol (Unit 4B)', meta: '2.1 mi · ETA 4 mins', icon: 'local_police', action: 'Dispatch', primary: true },
                { title: 'County EMS', meta: '4.5 mi · ETA 9 mins', icon: 'medical_services', action: 'Alert' },
                { title: 'Heavy Tow (Class C)', meta: '12.0 mi · ETA 25 mins', icon: 'agriculture', action: 'Request' },
              ].map((r) => (
                <div key={r.title} className="flex items-center justify-between gap-2 rounded-xl px-2 py-2 hover:bg-slate-50">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-9 w-9 rounded-xl bg-slate-100 border border-slate-200 grid place-items-center text-safe-ink shrink-0">
                      <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                        {r.icon}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-black text-safe-ink">{r.title}</div>
                      <div className="truncate text-xs font-semibold text-slate-500">{r.meta}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={[
                      'shrink-0 rounded-xl px-3 py-2 text-xs font-black',
                      r.primary ? 'bg-safe-ink text-white hover:bg-safe-midnight' : 'border border-slate-200 bg-white text-safe-ink hover:bg-slate-50',
                    ].join(' ')}
                  >
                    {r.action}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button type="button" className="col-span-2 rounded-xl bg-safe-electric px-4 py-2.5 text-xs font-black text-safe-ink shadow-sm">
              Broadcast Emergency
            </button>
            <button type="button" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-safe-ink hover:bg-slate-50">
              Add Note
            </button>
            <button type="button" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-safe-ink hover:bg-slate-50">
              Escalate
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

export default function LiveOpsPage() {
  const [mode, setMode] = useState('field');
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-2xl md:text-3xl font-black tracking-tight text-safe-ink">Operations</div>
        </div>
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: 'field', label: 'Field Ops' },
            { value: 'command', label: 'Incident Command' },
          ]}
        />
      </div>

      {mode === 'command' ? <IncidentCommandView /> : <FieldOpsView />}
    </div>
  );
}
