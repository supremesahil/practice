'use client';

import { useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { sleep } from '@/lib/utils';

interface SOSOverlayProps {
  open: boolean;
  onClose: () => void;
}

const steps = ['Calling...', 'Sending alert...', 'Sharing location...'];

export function SOSOverlay({ open, onClose }: SOSOverlayProps) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!open) {
      setStep(0);
      return;
    }

    let active = true;

    const run = async () => {
      for (let index = 0; index < steps.length; index += 1) {
        if (!active) {
          return;
        }
        setStep(index);
        await sleep(1400);
      }
    };

    void run();

    return () => {
      active = false;
    };
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#07100d]/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="sos-overlay-title">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#141b19] p-6 text-center shadow-card">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/15 text-rose-300">
          <ShieldAlert className="h-8 w-8" aria-hidden="true" />
        </div>
        <h2 id="sos-overlay-title" className="mt-4 text-title font-semibold text-ink">
          Emergency protocol active
        </h2>
        <p className="mt-2 text-body text-white/55">Immediate support actions are being completed for the patient.</p>

        <div className="mt-6 space-y-3">
          {steps.map((item, index) => (
            <div
              key={item}
              className={`rounded-xl border px-4 py-3 text-left ${index === step ? 'border-rose-500/25 bg-rose-500/10 text-rose-200' : 'border-white/10 bg-[#1b2421] text-white/45'}`}
            >
              {item}
            </div>
          ))}
        </div>

        <button type="button" className="button-danger mt-6 w-full" onClick={onClose}>
          Close emergency view
        </button>
      </div>
    </div>
  );
}
