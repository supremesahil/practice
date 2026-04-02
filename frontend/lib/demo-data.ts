import type { AlertItem, BurnoutPoint, Caretaker, Medicine, Patient, ScanResult } from '@/lib/types';

export const DEMO_PATIENT: Patient = {
  id: 'patient-ramesh-01',
  name: 'Ramesh Kumar',
  age: 72,
  condition: 'Diabetes',
  lastSeen: '2 minutes ago',
  adherence: 82,
  avatar: 'RK',
  deviceId: 'RCC-RK-2204'
};

export const DEMO_MEDICINES: Medicine[] = [
  { id: 'med-1', name: 'Metformin', dosage: '500 mg', time: '08:00 AM', status: 'taken', stock: 18 },
  { id: 'med-2', name: 'Insulin Glargine', dosage: '10 units', time: '09:30 AM', status: 'pending', stock: 6 },
  { id: 'med-3', name: 'Aspirin', dosage: '75 mg', time: '01:00 PM', status: 'missed', stock: 12 },
  { id: 'med-4', name: 'Vitamin D3', dosage: '1000 IU', time: '08:00 PM', status: 'pending', stock: 4 }
];

export const DEMO_ALERTS: AlertItem[] = [
  {
    id: 'alert-1',
    type: 'missed',
    title: 'Missed midday dose',
    message: 'Aspirin was not confirmed at 01:00 PM.',
    timestamp: new Date().toISOString()
  },
  {
    id: 'alert-2',
    type: 'info',
    title: 'Low refill window',
    message: 'Vitamin D3 stock is below one week.',
    timestamp: new Date(Date.now() - 1000 * 60 * 18).toISOString()
  }
];

export const DEMO_CARETAKERS: Caretaker[] = [
  { id: 'ct-1', name: 'Anita Singh', role: 'Primary caretaker', status: 'online' },
  { id: 'ct-2', name: 'Dr. Menon', role: 'Consulting physician', status: 'busy' },
  { id: 'ct-3', name: 'Vikram Patel', role: 'Medication support', status: 'online' },
  { id: 'ct-4', name: 'Seema Rao', role: 'Family contact', status: 'offline' }
];

export const DEMO_BURNOUT: BurnoutPoint[] = [
  { day: 'Mon', score: 30 },
  { day: 'Tue', score: 46 },
  { day: 'Wed', score: 42 },
  { day: 'Thu', score: 58 },
  { day: 'Fri', score: 51 },
  { day: 'Sat', score: 40 },
  { day: 'Sun', score: 36 }
];

export const DEMO_SCAN_RESULT: ScanResult = {
  title: 'Prescription scan summary',
  summary: 'Three active medicines were detected with one dosage clarification needed.',
  items: [
    'Metformin 500 mg after breakfast',
    'Insulin Glargine 10 units nightly',
    'Aspirin 75 mg once daily, verify meal timing'
  ]
};
