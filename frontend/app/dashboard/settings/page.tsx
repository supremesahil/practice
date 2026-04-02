'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

const SETTINGS_KEY = 'remote-care-companion-settings';

export default function SettingsPage() {
  const [reduceNotifications, setReduceNotifications] = useState(false);
  const [shareSummaries, setShareSummaries] = useState(true);
  const [demoFallback, setDemoFallback] = useState(true);

  useEffect(() => {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as {
        reduceNotifications: boolean;
        shareSummaries: boolean;
        demoFallback: boolean;
      };
      setReduceNotifications(parsed.reduceNotifications);
      setShareSummaries(parsed.shareSummaries);
      setDemoFallback(parsed.demoFallback);
    } catch {
      window.localStorage.removeItem(SETTINGS_KEY);
    }
  }, []);

  const save = () => {
    window.localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({
        reduceNotifications,
        shareSummaries,
        demoFallback
      })
    );
    toast.success('Settings saved');
  };

  return (
    <section className="grid h-full gap-8 xl:grid-cols-[1fr_0.8fr]">
      <div className="card p-6">
        <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-white/60">Operational Preferences</h3>
        <div className="mt-6 space-y-4">
          {[
            {
              label: 'Reduce non-critical notifications',
              value: reduceNotifications,
              change: setReduceNotifications
            },
            {
              label: 'Share daily summaries with support team',
              value: shareSummaries,
              change: setShareSummaries
            },
            {
              label: 'Allow demo fallback when API is unavailable',
              value: demoFallback,
              change: setDemoFallback
            }
          ].map((item) => (
            <label key={item.label} className="flex items-center justify-between rounded-2xl bg-[#141b19] p-4">
              <span className="text-label font-medium text-ink">{item.label}</span>
              <button
                type="button"
                onClick={() => item.change(!item.value)}
                className={`relative h-7 w-14 rounded-full transition ${item.value ? 'bg-[#26a37a]' : 'bg-[#2b322f]'}`}
                aria-pressed={item.value}
              >
                <span
                  className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${item.value ? 'left-8' : 'left-1'}`}
                />
              </button>
            </label>
          ))}
        </div>

        <button type="button" className="button-primary mt-6" onClick={save}>
          Save settings
        </button>
      </div>

      <div className="card p-6">
        <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-white/60">Environment</h3>
        <div className="mt-6 space-y-3 text-body text-white/55">
          <p>Theme: Ethereal Laboratory dark interface</p>
          <p>Data mode: automatic live API with local demo fallback</p>
          <p>Real-time mode: socket with mock events if unavailable</p>
          <p>Accessibility: keyboard focus, readable contrast, icon plus text labels</p>
        </div>
      </div>
    </section>
  );
}
