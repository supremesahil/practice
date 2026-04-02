'use client';

import { Clock3, HeartPulse, ShieldCheck, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { CaregiverSupportCard } from '@/components/CaregiverSupportCard';
import { CaretakerGrid } from '@/components/CaretakerGrid';
import { PatientOverviewCard } from '@/components/PatientOverviewCard';
import { useCareStore } from '@/store/useCareStore';

export default function DashboardPage() {
  const { patient, burnout, caretakers, medicines, updateSupportSuggestion } = useCareStore();

  if (!patient) {
    return null;
  }

  const nextMedicine = medicines.find((medicine) => medicine.status === 'pending') ?? medicines[0];
  const onlineCaretakers = caretakers.filter((person) => person.status === 'online').length;
  const stats = [
    { label: 'Today adherence', value: `${patient.adherence}%`, icon: ShieldCheck },
    { label: 'Next reminder', value: nextMedicine?.time ?? 'No schedule', icon: Clock3 },
    { label: 'Care team online', value: `${onlineCaretakers}`, icon: Users },
    { label: 'Wellness trend', value: burnout.at(-1)?.score ? `${burnout.at(-1)?.score}%` : 'Stable', icon: HeartPulse }
  ];

  return (
    <div className="grid h-full gap-8 lg:grid-cols-[1.05fr_0.95fr]">
      <section className="space-y-8">
        <PatientOverviewCard patient={patient} onSosHistory={() => toast('Showing recent emergency activity')} />

        <div className="grid gap-4 md:grid-cols-2">
          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <article key={stat.label} className="card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/35">{stat.label}</p>
                    <p className="mt-3 text-[30px] font-bold tracking-tight text-ink">{stat.value}</p>
                  </div>
                  <div className="rounded-2xl bg-[#1d2623] p-3 text-[#68dbae]">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="space-y-8">
        <CaregiverSupportCard points={burnout} onRequestSuggestion={updateSupportSuggestion} />
        <CaretakerGrid caretakers={caretakers} />
      </section>
    </div>
  );
}
