'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { simulateAiParse } from '@/lib/api';
import type { ParsedAiInsight } from '@/lib/types';

interface AIInputBoxProps {
  insight: ParsedAiInsight | null;
  onParsed: (result: ParsedAiInsight) => void;
}

export function AIInputBox({ insight, onParsed }: AIInputBoxProps) {
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);

  return (
    <section className="card relative overflow-hidden p-8" aria-labelledby="ai-input-title">
      <div className="pointer-events-none absolute right-4 top-2 text-[120px] font-black leading-none text-white/[0.03]">AI</div>
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-[#68dbae]" aria-hidden="true" />
        <h2 id="ai-input-title" className="text-sm font-bold uppercase tracking-[0.12em] text-[#68dbae]">
          AI Care Assistant
        </h2>
      </div>
      <p className="mt-3 text-body text-white/55">Type a quick observation and get a structured follow-up suggestion.</p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          className="input-base flex-1"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Example: Patient felt dizzy after breakfast medication"
          aria-label="Enter care note for AI parsing"
        />
        <button
          type="button"
          className="button-primary sm:min-w-[140px]"
          disabled={!value.trim() || loading}
          onClick={async () => {
            setLoading(true);
            const result = await simulateAiParse(value);
            onParsed(result);
            setLoading(false);
            setValue('');
          }}
        >
          {loading ? 'Parsing...' : 'Send'}
        </button>
      </div>

      {insight ? (
        <div className="mt-4 rounded-xl border border-white/10 bg-[#141b19] p-4">
          <p className="text-label font-semibold text-ink">{insight.title}</p>
          <p className="mt-2 text-body text-white/60">{insight.details}</p>
        </div>
      ) : null}
    </section>
  );
}
