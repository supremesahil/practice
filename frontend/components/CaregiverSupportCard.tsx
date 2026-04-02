'use client';

import { useState } from 'react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { BurnoutPoint } from '@/lib/types';

interface CaregiverSupportCardProps {
  points: BurnoutPoint[];
  onRequestSuggestion: (mood: string) => Promise<string>;
}

const moods = ['Calm', 'Focused', 'Tired', 'Stressed', 'Overwhelmed'];

export function CaregiverSupportCard({ points, onRequestSuggestion }: CaregiverSupportCardProps) {
  const [mood, setMood] = useState('Focused');
  const [suggestion, setSuggestion] = useState('Stable support load. Keep handoffs clear and use evening check-ins sparingly.');
  const [loading, setLoading] = useState(false);

  return (
    <section className="card p-6" aria-labelledby="caregiver-support-title">
      <div className="mb-4 flex items-center justify-between">
        <h2 id="caregiver-support-title" className="text-sm font-bold uppercase tracking-[0.12em] text-white/65">
          Caregiver Well-being
        </h2>
        <span className="rounded bg-[#68dbae]/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#68dbae]">
          Optimal
        </span>
      </div>
      <p className="mt-1 text-body text-white/50">
        Monitor support load and turn mood check-ins into practical suggestions.
      </p>

      <div className="mt-4 flex flex-wrap gap-2" role="radiogroup" aria-label="Select mood">
        {moods.map((option) => (
          <button
            key={option}
            type="button"
            className={mood === option ? 'button-primary' : 'button-secondary'}
            aria-pressed={mood === option}
            onClick={() => setMood(option)}
          >
            {option}
          </button>
        ))}
      </div>

      <div className="mt-5 h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points}>
            <XAxis dataKey="day" stroke="#5C7A6D" fontSize={12} />
            <YAxis stroke="#5C7A6D" fontSize={12} />
            <Tooltip />
            <Line type="monotone" dataKey="score" stroke="#1D9E75" strokeWidth={3} dot={{ fill: '#1D9E75', r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <button
        type="button"
        className="button-primary mt-3"
        onClick={async () => {
          setLoading(true);
          const next = await onRequestSuggestion(mood);
          setSuggestion(next);
          setLoading(false);
        }}
      >
        {loading ? 'Checking...' : 'Get support suggestion'}
      </button>

      <div className="mt-4 rounded-xl border border-white/5 bg-[#141b19] p-4">
        <p className="text-label font-semibold text-ink">Suggested action</p>
        <p className="mt-2 text-body italic text-white/60">{suggestion}</p>
      </div>
    </section>
  );
}
