'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AlertTriangle, Bell, LayoutDashboard, Pill, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Logs', href: '/dashboard/logs', icon: Bell },
  { label: 'Refills', href: '/dashboard/refills', icon: Pill },
  { label: 'Alerts', href: '/dashboard/alerts', icon: AlertTriangle },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings }
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <aside className="glass-panel flex h-full min-h-screen w-full max-w-[260px] flex-col bg-[#0e1513]/80 px-4 py-8 shadow-[inset_-1px_0_0_rgba(255,255,255,0.04)]">
      <div className="mb-12 px-4">
        <p className="text-lg font-black text-[#68dbae]">Caretaker</p>
        <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/40">Precision Health</p>
      </div>

      <nav aria-label="Primary" className="flex flex-1 flex-col gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;

          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                'flex min-h-[48px] items-center gap-3 rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-[0.08em] transition',
                active
                  ? 'border-r-2 border-[#68dbae] bg-gradient-to-br from-[#1D9E75]/20 to-transparent text-[#68dbae]'
                  : 'text-white/60 hover:bg-[#242b29]/50 hover:text-white'
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-8 px-2 pt-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <div className="mt-3 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-brand/20 bg-[#1c2622] text-sm font-semibold text-[#68dbae]">
            AS
          </div>
          <div>
            <p className="text-label font-semibold text-ink">Dr. Aris Thorne</p>
            <p className="text-body text-white/45">ID: AC-9920</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
