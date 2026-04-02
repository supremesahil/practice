'use client';

import { Activity, ShieldAlert } from 'lucide-react';
import { AlertsPanel } from '@/components/AlertsPanel';
import { useCareStore } from '@/store/useCareStore';

export default function AlertsPage() {
  const { alerts, dismissAlert } = useCareStore();
  const sosCount = alerts.filter((alert) => alert.type === 'sos').length;

  return (
    <div className="grid h-full gap-8 xl:grid-cols-[0.8fr_1.2fr]">
      <section className="space-y-4">
        <article className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/35">Total active alerts</p>
              <p className="mt-3 text-[34px] font-bold tracking-tight text-ink">{alerts.length}</p>
            </div>
            <Activity className="h-6 w-6 text-[#68dbae]" />
          </div>
        </article>

        <article className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/35">Emergency incidents</p>
              <p className="mt-3 text-[34px] font-bold tracking-tight text-red-200">{sosCount}</p>
            </div>
            <ShieldAlert className="h-6 w-6 text-red-300" />
          </div>
        </article>
      </section>

      <AlertsPanel alerts={alerts} onDismiss={dismissAlert} />
    </div>
  );
}
