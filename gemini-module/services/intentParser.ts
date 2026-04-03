import type { QueryIntent } from '../types';

export function parseIntent(query: string): QueryIntent {
  const q = query.toLowerCase();

  // Medication List Intent: "where is my medicine", "list my medicines"
  if (/\b(where|list|show|all|my)\b.*\b(medicine|medicines|medication|medications)\b/.test(q)) {
    return { type: 'medication_list', original: query };
  }

  // Specific Medicine Intent: "when should I take aspirin"
  if (/\b(when|how|dosage|dose|take|aspirin|paracetamol|ibuprofen|metformin|atorvastatin|lisinopril|amoxicillin|omeprazole)\b/.test(q)) {
    const medicineMatch = q.match(/\b(aspirin|paracetamol|ibuprofen|metformin|atorvastatin|lisinopril|amoxicillin|omeprazole|[a-z]+)\b/);
    return {
      type: 'specific_medicine',
      medicineNames: medicineMatch ? [medicineMatch[1]] : [],
      original: query
    };
  }

  // Next Dose Intent: "what's next", "when is my next medicine"
  if (/\b(next|upcoming|due|when)\b.*\b(dose|medicine|medication)\b/.test(q)) {
    return { type: 'next_dose', original: query };
  }

  // Schedule Intent: "what's my schedule", "my daily routine"
  if (/\b(schedule|routine|plan|timing|daily)\b/.test(q)) {
    return { type: 'schedule', original: query };
  }

  return { type: 'unknown', original: query };
}
