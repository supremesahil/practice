export type ConnectionState = 'connected' | 'waiting';
export type MedicineStatus = 'taken' | 'missed' | 'pending';
export type AlertType = 'sos' | 'missed' | 'inactivity' | 'info';

export interface Patient {
  id: string;
  name: string;
  age: number;
  condition: string;
  lastSeen: string;
  adherence: number;
  avatar: string;
  deviceId: string;
}

export interface Medicine {
  id: string;
  name: string;
  dosage: string;
  time: string;
  status: MedicineStatus;
  stock: number;
}

export interface AlertItem {
  id: string;
  type: AlertType;
  title: string;
  message: string;
  timestamp: string;
  dismissed?: boolean;
}

export interface Caretaker {
  id: string;
  name: string;
  role: string;
  status: 'online' | 'busy' | 'offline';
}

export interface BurnoutPoint {
  day: string;
  score: number;
}

export interface ScanResult {
  title: string;
  summary: string;
  items: string[];
}

export interface ParsedAiInsight {
  title: string;
  details: string;
}
