'use client';

import { Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ConnectionState } from '@/lib/types';

interface ConnectionStatusProps {
  state: ConnectionState;
  compact?: boolean;
}

export function ConnectionStatus({ state, compact = false }: ConnectionStatusProps) {
  const connected = state === 'connected';

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-2 text-body font-medium',
        connected
          ? 'border-[#68dbae]/20 bg-[#68dbae]/10 text-[#86f8c9]'
          : 'border-amber-400/20 bg-amber-500/10 text-amber-300',
        compact && 'px-2.5 py-1.5 text-xs'
      )}
      aria-live="polite"
    >
      {connected ? <Wifi className="h-4 w-4" aria-hidden="true" /> : <WifiOff className="h-4 w-4" aria-hidden="true" />}
      <span>{connected ? 'Connected' : 'Waiting'}</span>
    </div>
  );
}
