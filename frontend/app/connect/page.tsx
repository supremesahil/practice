'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { HelpCircle, Link2, ShieldCheck, Syringe, Wifi } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ConnectPage() {
  const [manualId, setManualId] = useState('');
  const [connected, setConnected] = useState(false);
  const deviceId = useMemo(() => 'RCC-RK-2204', []);

  useEffect(() => {
    const timer = window.setTimeout(() => setConnected(true), 2200);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-[10%] -top-[20%] h-[50%] w-[50%] rounded-full bg-[#68dbae]/5 blur-[120px]" />
        <div className="absolute -bottom-[20%] -right-[10%] h-[50%] w-[50%] rounded-full bg-[#26a37a]/5 blur-[120px]" />
      </div>

      <header className="absolute top-0 z-10 flex h-20 w-full items-center justify-center">
        <div className="flex items-center gap-3">
          <Syringe className="h-7 w-7 text-[#68dbae]" />
          <span className="text-xl font-bold uppercase tracking-[0.18em] text-ink">Aetheris Care</span>
        </div>
      </header>

      <section className="relative z-10 flex w-full max-w-xl flex-col items-center">
        <div className="mb-10 space-y-3 text-center">
          <h1 className="text-4xl font-extrabold tracking-[-0.02em] text-ink md:text-5xl">Establish Connection</h1>
          <p className="mx-auto max-w-md text-label text-white/55">
            Position the QR code within the frame to link the patient&apos;s Remote Care Companion bio-hub device.
          </p>
        </div>

        <div className="glass-panel w-full rounded-[2.5rem] bg-[#161d1b]/60 p-8 shadow-[0_12px_32px_rgba(0,0,0,0.4)] md:p-12">
          <div className="mx-auto mb-10 aspect-square w-full max-w-[280px] overflow-hidden rounded-[28px] bg-[#09100e]">
            <div className="relative flex h-full items-center justify-center">
              <div className="absolute inset-0 rounded-[28px] shadow-[inset_0_0_0_1px_rgba(104,219,174,0.15),inset_0_0_22px_rgba(104,219,174,0.06)]" />
              <div className="absolute left-6 top-6 h-8 w-8 rounded-tl-lg border-l-2 border-t-2 border-[#68dbae]" />
              <div className="absolute right-6 top-6 h-8 w-8 rounded-tr-lg border-r-2 border-t-2 border-[#68dbae]" />
              <div className="absolute bottom-6 left-6 h-8 w-8 rounded-bl-lg border-b-2 border-l-2 border-[#68dbae]" />
              <div className="absolute bottom-6 right-6 h-8 w-8 rounded-br-lg border-b-2 border-r-2 border-[#68dbae]" />
              <div className="absolute left-0 top-1/4 h-[2px] w-full bg-gradient-to-r from-transparent via-[#68dbae] to-transparent shadow-[0_0_15px_#68dbae]" />
              <div className="grid grid-cols-6 gap-1 opacity-45">
                {Array.from({ length: 36 }).map((_, index) => (
                  <span
                    key={index}
                    className={`h-7 w-7 rounded-sm ${index % 2 === 0 || index % 5 === 0 || index % 7 === 0 ? 'bg-[#dce9e3]' : 'bg-[#214036]'}`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex flex-col items-center space-y-3">
              <div className="flex items-center gap-3">
                <div className={`h-2 w-2 rounded-full ${connected ? 'bg-[#86f8c9]' : 'animate-pulse bg-[#68dbae]'}`} />
                <span className="text-sm font-semibold uppercase tracking-[0.18em] text-[#68dbae]/85">
                  {connected ? 'Connection established' : 'Waiting for connection'}
                </span>
              </div>
              <div className="h-1 w-64 overflow-hidden rounded-full bg-[#242b29]">
                <div className={`h-full rounded-full bg-gradient-to-r from-[#68dbae] to-[#26a37a] shadow-[0_0_8px_rgba(104,219,174,0.4)] ${connected ? 'w-full' : 'w-2/3'}`} />
              </div>
              <p className="text-sm font-semibold text-ink">Device ID: {deviceId}</p>
            </div>

            <div className="flex justify-center gap-8 py-2">
              <div className="flex items-center gap-2 text-white/45">
                <ShieldCheck className="h-4 w-4" />
                <span className="text-[10px] font-bold uppercase tracking-[0.16em]">Secure Pair</span>
              </div>
              <div className="flex items-center gap-2 text-white/45">
                <Link2 className="h-4 w-4" />
                <span className="text-[10px] font-bold uppercase tracking-[0.16em]">Active Link</span>
              </div>
              <div className="hidden items-center gap-2 text-white/45 sm:flex">
                <Wifi className="h-4 w-4" />
                <span className="text-[10px] font-bold uppercase tracking-[0.16em]">Bio Sync</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 w-full">
          <div className="mb-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-white/30">Or Enter Manually</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <div className="mx-auto flex w-full max-w-sm flex-col gap-4">
            <input
              className="input-base rounded-3xl bg-[#161d1b] py-5 text-center text-lg font-bold tracking-[0.5em]"
              value={manualId}
              maxLength={8}
              onChange={(event) => setManualId(event.target.value.toUpperCase())}
              placeholder="8-DIGIT ID"
              aria-label="Manual device ID"
            />

            <button
              type="button"
              className="button-primary rounded-3xl py-5 uppercase tracking-[0.2em]"
              onClick={() => {
                if (!manualId.trim()) {
                  toast.error('Enter a valid device ID');
                  return;
                }
                setConnected(true);
                toast.success('Device connected successfully');
              }}
            >
              Verify Identity
            </button>

            <Link href="/dashboard" className="button-secondary inline-flex items-center justify-center rounded-3xl uppercase tracking-[0.16em]">
              Open Dashboard
            </Link>
          </div>
        </div>

        <footer className="mt-12">
          <button type="button" className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-white/35 transition hover:text-[#68dbae]">
            <HelpCircle className="h-4 w-4" />
            Unable to connect?
          </button>
        </footer>
      </section>
    </main>
  );
}
