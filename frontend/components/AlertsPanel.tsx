'use client';

import { BellRing, Siren, X } from 'lucide-react';
import { cn, formatTimestamp } from '@/lib/utils';
import type { AlertItem } from '@/lib/types';

interface AlertsPanelProps {
  alerts: AlertItem[];
  onDismiss: (id: string) => void;
}

export function AlertsPanel({ alerts, onDismiss }: AlertsPanelProps) {
  return (
    <section className="rounded-xl border border-red-500/10 bg-[#2a1313]/30 p-6" id="alerts" aria-labelledby="alerts-panel-title">
      <div className="flex items-center justify-between">
        <div>
          <h2 id="alerts-panel-title" className="text-title font-semibold text-red-100">
            High-priority alerts
          </h2>
          <p className="text-body text-red-100/60">Prioritize missed doses, inactivity, and emergency events.</p>
        </div>
        <BellRing className="h-5 w-5 text-red-300" aria-hidden="true" />
      </div>

      <div className="mt-5 space-y-3">
        {alerts.length ? (
          alerts.map((alert) => {
            const sos = alert.type === 'sos';
            return (
              <article
                key={alert.id}
                className={cn(
                  'rounded-xl border p-4',
                  sos ? 'animate-pulseSoft border-rose-500/25 bg-rose-500/10' : 'border-white/5 bg-[#161d1b]'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3">
                    <div className={cn('mt-0.5 rounded-full p-2', sos ? 'bg-rose-500/15 text-rose-300' : 'bg-[#1d2623] text-[#68dbae]')}>
                      {sos ? <Siren className="h-4 w-4" aria-hidden="true" /> : <BellRing className="h-4 w-4" aria-hidden="true" />}
                    </div>
                    <div>
                      <p className="text-label font-semibold text-ink">{alert.title}</p>
                      <p className="mt-1 text-body text-white/60">{alert.message}</p>
                      <p className="mt-2 text-xs text-white/35">{formatTimestamp(alert.timestamp)}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="inline-flex min-h-[36px] items-center justify-center rounded-lg border border-white/10 px-3 text-body text-white/45"
                    onClick={() => onDismiss(alert.id)}
                    aria-label={`Dismiss alert ${alert.title}`}
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </article>
            );
          })
        ) : (
          <div className="rounded-xl border border-dashed border-white/10 p-6 text-body text-white/45">No active alerts right now.</div>
        )}
      </div>
    </section>
  );
}
