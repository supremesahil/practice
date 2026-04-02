import { DEMO_ALERTS, DEMO_BURNOUT, DEMO_CARETAKERS, DEMO_MEDICINES, DEMO_PATIENT } from '@/lib/demo-data';
import type { AlertItem, BurnoutPoint, Caretaker, Medicine, Patient } from '@/lib/types';

const CARE_DATA_KEY = 'remote-care-companion-demo';

export interface DemoSnapshot {
  patient: Patient;
  medicines: Medicine[];
  alerts: AlertItem[];
  caretakers: Caretaker[];
  burnout: BurnoutPoint[];
}

export const defaultSnapshot = (): DemoSnapshot => ({
  patient: DEMO_PATIENT,
  medicines: DEMO_MEDICINES,
  alerts: DEMO_ALERTS,
  caretakers: DEMO_CARETAKERS,
  burnout: DEMO_BURNOUT
});

export const loadDemoSnapshot = (): DemoSnapshot => {
  if (typeof window === 'undefined') {
    return defaultSnapshot();
  }

  const raw = window.localStorage.getItem(CARE_DATA_KEY);
  if (!raw) {
    const seed = defaultSnapshot();
    window.localStorage.setItem(CARE_DATA_KEY, JSON.stringify(seed));
    return seed;
  }

  try {
    return JSON.parse(raw) as DemoSnapshot;
  } catch {
    const seed = defaultSnapshot();
    window.localStorage.setItem(CARE_DATA_KEY, JSON.stringify(seed));
    return seed;
  }
};

export const saveDemoSnapshot = (snapshot: DemoSnapshot) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(CARE_DATA_KEY, JSON.stringify(snapshot));
};
