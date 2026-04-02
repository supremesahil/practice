'use client';

import { create } from 'zustand';
import { createMedicine, fetchBurnoutSuggestion, fetchDashboardData } from '@/lib/api';
import { DEMO_CARETAKERS } from '@/lib/demo-data';
import { loadDemoSnapshot, saveDemoSnapshot } from '@/lib/storage';
import type { AlertItem, BurnoutPoint, Caretaker, Medicine, ParsedAiInsight, Patient, ScanResult } from '@/lib/types';

interface CareStore {
  patient: Patient | null;
  medicines: Medicine[];
  alerts: AlertItem[];
  caretakers: Caretaker[];
  burnout: BurnoutPoint[];
  parsedInsight: ParsedAiInsight | null;
  scanResult: ScanResult | null;
  demoMode: boolean;
  connected: boolean;
  loading: boolean;
  sosOpen: boolean;
  initialize: () => Promise<void>;
  setConnected: (connected: boolean) => void;
  addMedicine: (medicine: Omit<Medicine, 'id' | 'status'>) => Promise<void>;
  pushAlert: (alert: AlertItem) => void;
  dismissAlert: (id: string) => void;
  openSos: () => void;
  closeSos: () => void;
  setParsedInsight: (insight: ParsedAiInsight | null) => void;
  setScanResult: (result: ScanResult | null) => void;
  updateSupportSuggestion: (mood: string) => Promise<string>;
}

export const useCareStore = create<CareStore>((set, get) => ({
  patient: null,
  medicines: [],
  alerts: [],
  caretakers: DEMO_CARETAKERS,
  burnout: [],
  parsedInsight: null,
  scanResult: null,
  demoMode: false,
  connected: false,
  loading: true,
  sosOpen: false,
  initialize: async () => {
    const data = await fetchDashboardData();
    const snapshot = loadDemoSnapshot();

    set({
      patient: data.patient,
      medicines: data.medicines,
      alerts: data.alerts,
      burnout: data.burnout,
      caretakers: snapshot.caretakers,
      demoMode: data.demoMode,
      loading: false
    });
  },
  setConnected: (connected) => set({ connected }),
  addMedicine: async (medicine) => {
    const created = await createMedicine(medicine);
    const medicines = [created, ...get().medicines];
    set({ medicines });

    const snapshot = loadDemoSnapshot();
    snapshot.medicines = medicines;
    saveDemoSnapshot(snapshot);
  },
  pushAlert: (alert) => {
    const alerts = [alert, ...get().alerts];
    set({ alerts });

    const snapshot = loadDemoSnapshot();
    snapshot.alerts = alerts;
    saveDemoSnapshot(snapshot);
  },
  dismissAlert: (id) => {
    const alerts = get().alerts.filter((alert) => alert.id !== id);
    set({ alerts });

    const snapshot = loadDemoSnapshot();
    snapshot.alerts = alerts;
    saveDemoSnapshot(snapshot);
  },
  openSos: () => set({ sosOpen: true }),
  closeSos: () => set({ sosOpen: false }),
  setParsedInsight: (parsedInsight) => set({ parsedInsight }),
  setScanResult: (scanResult) => set({ scanResult }),
  updateSupportSuggestion: async (mood) => {
    const result = await fetchBurnoutSuggestion(mood);
    return result.suggestion;
  }
}));
