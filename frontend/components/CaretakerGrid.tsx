'use client';

import { cn } from '@/lib/utils';
import type { Caretaker } from '@/lib/types';

interface CaretakerGridProps {
  caretakers: Caretaker[];
}

const statusColors: Record<Caretaker['status'], string> = {
  online: 'bg-emerald-500',
  busy: 'bg-amber-500',
  offline: 'bg-slate-300'
};

export function CaretakerGrid({ caretakers }: CaretakerGridProps) {
  return (
    <section className="card p-6">
      <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-white/65">Backup Network</h2>
      <p className="mt-2 text-body text-white/45">Keep the support network visible for rapid handoffs.</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {caretakers.map((person) => (
          <article key={person.id} className="rounded-xl border border-white/5 bg-[#141b19] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-label font-semibold text-ink">{person.name}</p>
                <p className="text-body text-white/45">{person.role}</p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full bg-[#202826] px-3 py-1 text-xs font-medium text-ink">
                <span className={cn('h-2.5 w-2.5 rounded-full', statusColors[person.status])} aria-hidden="true" />
                {person.status}
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
