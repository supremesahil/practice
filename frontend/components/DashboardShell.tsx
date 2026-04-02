'use client';

import { PropsWithChildren, useEffect, useState } from 'react';
import { Bell, Search, TriangleAlert, UserCircle2 } from 'lucide-react';
import { usePathname } from 'next/navigation';
import toast from 'react-hot-toast';
import { SidebarNav } from '@/components/SidebarNav';
import { ConnectionStatus } from '@/components/ConnectionStatus';
import { SOSOverlay } from '@/components/SOSOverlay';
import { submitSos } from '@/lib/api';
import { connectCareSocket } from '@/lib/socket';
import { useCareStore } from '@/store/useCareStore';

const pageMeta: Record<string, { eyebrow: string; title: string }> = {
  '/dashboard': { eyebrow: 'Dashboard', title: 'Connected patient overview' },
  '/dashboard/logs': { eyebrow: 'Logs', title: 'Medication timeline and AI notes' },
  '/dashboard/refills': { eyebrow: 'Refills', title: 'Prescription scans and stock management' },
  '/dashboard/alerts': { eyebrow: 'Alerts', title: 'Active incidents and emergency monitoring' },
  '/dashboard/settings': { eyebrow: 'Settings', title: 'Operational preferences and environment' }
};

export function DashboardShell({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const meta = pageMeta[pathname] ?? pageMeta['/dashboard'];
  const {
    alerts,
    connected,
    demoMode,
    loading,
    patient,
    sosOpen,
    initialize,
    closeSos,
    openSos,
    pushAlert,
    setConnected
  } = useCareStore();
  const [demoNotified, setDemoNotified] = useState(false);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    const cleanup = connectCareSocket(
      (alert) => {
        pushAlert(alert);
        toast(alert.type === 'sos' ? 'Emergency alert received' : 'New alert received');
      },
      (alert) => {
        pushAlert(alert);
        openSos();
        toast.error('SOS triggered for the patient');
      },
      setConnected
    );

    return cleanup;
  }, [openSos, pushAlert, setConnected]);

  useEffect(() => {
    if (!loading && demoMode && !demoNotified) {
      toast.error('API unavailable. Demo mode loaded from local storage.');
      setDemoNotified(true);
    }
  }, [demoMode, demoNotified, loading]);

  if (loading || !patient) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="card w-full max-w-md p-8 text-center">
          <p className="text-title font-semibold text-ink">Loading dashboard...</p>
          <p className="mt-2 text-body text-white/50">Preparing patient data, medicine schedule, and live alerts.</p>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="flex h-screen overflow-hidden bg-background text-ink">
        <div className="hidden md:block">
          <SidebarNav />
        </div>

        <section className="flex min-h-screen flex-1 flex-col overflow-hidden">
          <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-white/5 bg-[#161d1b]/70 px-4 shadow-[0_12px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl md:px-8">
            <div className="flex items-center gap-8">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-ink">Aetheris Care</h1>
              </div>
              <nav className="hidden items-center gap-6 lg:flex">
                <span className="text-sm font-bold text-[#68dbae]">{meta.eyebrow}</span>
                <span className="text-sm text-white/55">{patient.name}</span>
                <span className="text-sm text-white/55">{patient.condition}</span>
              </nav>
            </div>

            <div className="flex items-center gap-3">
              <label className="hidden items-center gap-2 rounded-full border border-white/10 bg-[#161d1b] px-4 py-2 lg:flex">
                <Search className="h-4 w-4 text-white/45" aria-hidden="true" />
                <input className="bg-transparent text-xs text-ink outline-none placeholder:text-white/30" placeholder="Quick find patient..." />
              </label>
              <button type="button" className="rounded-full p-2 text-white/60 transition hover:text-[#68dbae]" aria-label="Notifications">
                <Bell className="h-5 w-5" />
              </button>
              <button type="button" className="rounded-full p-2 text-white/60 transition hover:text-[#68dbae]" aria-label="Profile">
                <UserCircle2 className="h-5 w-5" />
              </button>
            </div>
          </header>

          <div className="mx-auto flex w-full max-w-[1600px] items-start justify-between gap-4 px-4 pt-6 md:px-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#68dbae]">{meta.eyebrow}</p>
              <h2 className="mt-2 text-[30px] font-bold tracking-tight text-ink">{meta.title}</h2>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <ConnectionStatus state={connected ? 'connected' : 'waiting'} />
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl bg-red-500/10 px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-red-200 transition hover:bg-red-500/20"
                onClick={async () => {
                  openSos();
                  try {
                    await submitSos();
                  } catch {
                    pushAlert({
                      id: `manual-sos-${Date.now()}`,
                      type: 'sos',
                      title: 'SOS triggered',
                      message: 'Emergency support was triggered from demo mode.',
                      timestamp: new Date().toISOString()
                    });
                    toast.error('Using local emergency simulation');
                  }
                }}
              >
                <TriangleAlert className="h-4 w-4" />
                SOS
              </button>
              <div className="rounded-xl bg-[#141b19] px-4 py-3 text-right">
                <p className="text-[10px] uppercase tracking-[0.16em] text-white/35">Active alerts</p>
                <p className="text-sm font-bold text-red-100">{alerts.length}</p>
              </div>
            </div>
          </div>

          <div className="no-scrollbar mx-auto w-full max-w-[1600px] flex-1 overflow-y-auto px-4 pb-8 pt-6 md:px-8">{children}</div>
        </section>
      </main>

      <SOSOverlay open={sosOpen} onClose={closeSos} />
    </>
  );
}
