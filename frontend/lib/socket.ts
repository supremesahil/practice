'use client';

import { io, Socket } from 'socket.io-client';
import type { AlertItem } from '@/lib/types';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? 'ws://localhost:4000';

export const connectCareSocket = (
  onAlert: (alert: AlertItem) => void,
  onSos: (alert: AlertItem) => void,
  onConnectionChange: (connected: boolean) => void
) => {
  let socket: Socket | null = null;
  let alertTimeout: number | undefined;
  let sosTimeout: number | undefined;

  const startMockEvents = () => {
    alertTimeout = window.setTimeout(() => {
      onAlert({
        id: `mock-alert-${Date.now()}`,
        type: 'missed',
        title: 'Missed reminder detected',
        message: 'Ramesh Kumar did not confirm the scheduled insulin dose.',
        timestamp: new Date().toISOString()
      });
    }, 10000);

    sosTimeout = window.setTimeout(() => {
      onSos({
        id: `mock-sos-${Date.now()}`,
        type: 'sos',
        title: 'SOS triggered',
        message: 'Emergency response steps are required immediately.',
        timestamp: new Date().toISOString()
      });
    }, 60000);
  };

  let fallbackStarted = false;
  const beginFallback = () => {
    if (fallbackStarted) {
      return;
    }
    fallbackStarted = true;
    onConnectionChange(false);
    startMockEvents();
  };

  try {
    socket = io(SOCKET_URL, {
      transports: ['websocket'],
      timeout: 3500,
      reconnectionAttempts: 1
    });

    socket.on('connect', () => {
      onConnectionChange(true);
    });

    socket.on('connect_error', () => {
      beginFallback();
    });

    socket.on('alert:new', (payload) => {
      onAlert({
        id: payload.id ?? `alert-${Date.now()}`,
        type: payload.type ?? 'missed',
        title: payload.type === 'sos' ? 'Emergency alert' : 'New care alert',
        message: payload.message,
        timestamp: payload.timestamp ?? new Date().toISOString()
      });
    });

    socket.on('sos:triggered', (payload) => {
      onSos({
        id: payload.id ?? `sos-${Date.now()}`,
        type: 'sos',
        title: 'SOS triggered',
        message: payload.message ?? 'Emergency assistance was triggered for the patient.',
        timestamp: payload.timestamp ?? new Date().toISOString()
      });
    });
  } catch {
    beginFallback();
  }

  return () => {
    socket?.disconnect();
    if (alertTimeout) {
      window.clearTimeout(alertTimeout);
    }
    if (sosTimeout) {
      window.clearTimeout(sosTimeout);
    }
  };
};
