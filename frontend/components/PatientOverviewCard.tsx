'use client';

import { MessageSquare, PhoneCall, ShieldAlert } from 'lucide-react';
import type { Patient } from '@/lib/types';

interface PatientOverviewCardProps {
  patient: Patient;
  onSosHistory: () => void;
}

export function PatientOverviewCard({ patient, onSosHistory }: PatientOverviewCardProps) {
  return (
    <section className="card vital-glow p-8" aria-labelledby="patient-overview-title">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[#1f2b26] text-xl font-semibold text-[#68dbae]">
            {patient.avatar}
          </div>
          <div>
            <h2 id="patient-overview-title" className="text-[28px] font-extrabold tracking-tight text-ink">
              {patient.name}
            </h2>
            <span className="mt-2 inline-flex rounded bg-[#295043]/40 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#a5d0bf]">
              Status: Stable
            </span>
            <p className="mt-3 text-label text-white/65">{patient.age} years | {patient.condition}</p>
            <p className="mt-1 text-body text-white/45">Last seen {patient.lastSeen}</p>
          </div>
        </div>

        <div className="grid min-w-[220px] grid-cols-2 gap-3">
          <div className="rounded-lg bg-[#141b19] p-4">
            <p className="text-[10px] uppercase tracking-[0.16em] text-white/40">Adherence</p>
            <div className="mt-2 flex items-end gap-2">
              <span className="text-[28px] font-bold text-[#68dbae]">{patient.adherence}%</span>
            </div>
          </div>
          <div className="rounded-lg bg-[#141b19] p-4">
            <p className="text-[10px] uppercase tracking-[0.16em] text-white/40">Device</p>
            <div className="mt-2 flex items-end gap-2">
              <span className="text-[18px] font-bold text-ink">Live</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 h-2 rounded-full bg-[#0f1513]" aria-hidden="true">
        <div className="h-2 rounded-full bg-[#68dbae]" style={{ width: `${patient.adherence}%` }} />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <button type="button" className="button-primary inline-flex items-center justify-center gap-2" aria-label="Call patient">
          <PhoneCall className="h-4 w-4" aria-hidden="true" />
          Initiate Call
        </button>
        <button type="button" className="button-secondary inline-flex items-center justify-center gap-2 bg-[#242b29]" aria-label="Message patient">
          <MessageSquare className="h-4 w-4" aria-hidden="true" />
          Message
        </button>
        <button
          type="button"
          className="button-secondary inline-flex items-center justify-center gap-2 bg-[#242b29]"
          aria-label="View SOS history"
          onClick={onSosHistory}
        >
          <ShieldAlert className="h-4 w-4" aria-hidden="true" />
          SOS History
        </button>
      </div>
    </section>
  );
}

