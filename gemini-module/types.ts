export interface VoiceQueryInput {
  userId: string;
  query: string;
  audioBuffer?: Buffer;
}

export interface GeminiResponse {
  success: boolean;
  text: string;
  audio?: Buffer;
  audioUrl?: string;
  medicines?: Array<{
    name: string;
    dosage: string;
    time: string;
  }>;
}

export interface QueryIntent {
  type: 'medication_list' | 'specific_medicine' | 'next_dose' | 'schedule' | 'unknown';
  medicineNames?: string[];
  original: string;
}

export interface MedicineReminder {
  medicine: string;
  dosage: string;
  time: string;
  quantity: number;
}
