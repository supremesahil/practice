'use client';

import { AlertCircle, Clock3, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Medicine } from '@/lib/types';

interface MedicineTableProps {
  medicines: Medicine[];
  onAdd: () => void;
}

const statusClasses: Record<Medicine['status'], string> = {
  taken: 'border-[#68dbae]/20 bg-[#68dbae]/10 text-[#86f8c9]',
  missed: 'border-rose-500/20 bg-rose-500/10 text-rose-300',
  pending: 'border-white/10 bg-[#242b29] text-white/65'
};

export function MedicineTable({ medicines, onAdd }: MedicineTableProps) {
  return (
    <section className="space-y-6" id="logs" aria-labelledby="medicine-table-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="medicine-table-title" className="text-[28px] font-extrabold tracking-tight text-ink">
            Daily Regimen
          </h2>
          <p className="text-body text-white/45">Current view: today&apos;s schedule, stock levels, and completion states.</p>
        </div>
        <button type="button" className="button-primary inline-flex items-center justify-center gap-2" onClick={onAdd}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add medicine
        </button>
      </div>

      <div className="space-y-3">
        {medicines.map((medicine) => (
          <article
            key={medicine.id}
            className={cn(
              'group flex flex-col justify-between gap-4 rounded-xl border border-white/5 p-5 transition hover:bg-[#242b29]',
              medicine.status === 'taken' ? 'bg-[#161d1b]/60 opacity-80' : 'bg-[#1a211f]'
            )}
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-5">
                <div
                  className={cn(
                    'flex h-12 w-12 items-center justify-center rounded-xl',
                    medicine.status === 'taken'
                      ? 'bg-[#242b29] text-white/40'
                      : medicine.status === 'missed'
                        ? 'bg-rose-500/10 text-rose-300'
                        : 'bg-[#68dbae]/10 text-[#68dbae]'
                  )}
                >
                  <Plus className="h-5 w-5 rotate-45" aria-hidden="true" />
                </div>
                <div>
                  <h4 className={cn('text-sm font-bold', medicine.status === 'taken' && 'line-through')}>{medicine.name} <span className="font-normal text-white/35">{medicine.dosage}</span></h4>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/40">
                    <Clock3 className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
                    {medicine.status === 'taken' ? 'Logged' : medicine.status === 'missed' ? 'Missed' : 'Next'}: {medicine.time}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {medicine.stock <= 6 ? (
                  <div className="inline-flex items-center gap-1 rounded-full border border-amber-500/15 bg-amber-500/10 px-3 py-1 text-xs text-amber-300">
                    <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    Refill soon
                  </div>
                ) : null}
                <span className={cn('inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize', statusClasses[medicine.status])}>
                  {medicine.status}
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
