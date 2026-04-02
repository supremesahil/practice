import { DEMO_SCAN_RESULT } from '@/lib/demo-data';
import { loadDemoSnapshot, saveDemoSnapshot } from '@/lib/storage';
import type { AlertItem, BurnoutPoint, Medicine, ParsedAiInsight, Patient, ScanResult } from '@/lib/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

const getJson = async <T>(input: RequestInfo, init?: RequestInit): Promise<T> => {
  const response = await fetch(input, init);
  const body = await response.json();

  if (!response.ok || body.success === false) {
    throw new Error(body.message ?? 'Request failed');
  }

  return body as T;
};

export const fetchDashboardData = async (): Promise<{
  patient: Patient;
  medicines: Medicine[];
  alerts: AlertItem[];
  burnout: BurnoutPoint[];
  demoMode: boolean;
}> => {
  try {
    const reminders = await getJson<{ data: Array<{ id: string; medicine: string; dosage: string; time: string; quantity: number }> }>(
      `${API_BASE}/api/reminder/list?userId=patient-ramesh-01`,
      { cache: 'no-store' }
    );

    const snapshot = loadDemoSnapshot();
    const medicines = reminders.data.length
      ? reminders.data.map((item, index) => ({
          id: item.id,
          name: item.medicine,
          dosage: item.dosage,
          time: item.time,
          status: (index % 3 === 0 ? 'taken' : index % 3 === 1 ? 'pending' : 'missed') as Medicine['status'],
          stock: item.quantity
        }))
      : snapshot.medicines;

    return {
      patient: snapshot.patient,
      medicines,
      alerts: snapshot.alerts,
      burnout: snapshot.burnout,
      demoMode: false
    };
  } catch {
    const snapshot = loadDemoSnapshot();
    return {
      patient: snapshot.patient,
      medicines: snapshot.medicines,
      alerts: snapshot.alerts,
      burnout: snapshot.burnout,
      demoMode: true
    };
  }
};

export const createMedicine = async (medicine: Omit<Medicine, 'id' | 'status'>): Promise<Medicine> => {
  try {
    const body = await getJson<{ data: { id: string } }>(`${API_BASE}/api/reminder/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'patient-ramesh-01',
        medicine: medicine.name,
        time: medicine.time,
        dosage: medicine.dosage,
        quantity: medicine.stock
      })
    });

    return {
      ...medicine,
      id: body.data.id,
      status: 'pending'
    };
  } catch {
    const snapshot = loadDemoSnapshot();
    const newMedicine: Medicine = {
      ...medicine,
      id: `med-${Date.now()}`,
      status: 'pending'
    };
    snapshot.medicines = [newMedicine, ...snapshot.medicines];
    saveDemoSnapshot(snapshot);
    return newMedicine;
  }
};

export const submitSos = async () => {
  await getJson(`${API_BASE}/api/sos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: 'patient-ramesh-01',
      message: 'SOS triggered from caretaker dashboard'
    })
  });
};

export const fetchBurnoutSuggestion = async (mood: string): Promise<{ suggestion: string; level: string }> => {
  try {
    const body = await getJson<{ data: { suggestion: string; burnoutLevel: string } }>(`${API_BASE}/api/burnout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'patient-ramesh-01', mood })
    });

    return {
      suggestion: body.data.suggestion,
      level: body.data.burnoutLevel
    };
  } catch {
    const fallback = mood.toLowerCase().includes('stress')
      ? 'Medium burnout risk. Schedule a backup caretaker check-in today.'
      : 'Low burnout risk. Keep the current rhythm and daily touchpoints.';

    return {
      suggestion: fallback,
      level: fallback.includes('Medium') ? 'medium' : 'low'
    };
  }
};

export const simulateAiParse = async (input: string): Promise<ParsedAiInsight> => {
  await new Promise((resolve) => setTimeout(resolve, 700));

  return {
    title: 'Parsed care note',
    details: `Actionable summary: ${input}. Recommended follow-up is to confirm dose timing and hydration within the next check-in.`
  };
};

export const scanPrescription = async (): Promise<ScanResult> => {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return DEMO_SCAN_RESULT;
};
