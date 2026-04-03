import type { QueryIntent } from '../types';

export function parseIntent(query: string): QueryIntent {
  const q = query.toLowerCase();

  // Medication List Intent: "what medicines am I taking", "list my medicines", "show me my meds", "where are my medicines"
  if (/\b(what|where|list|show|all|my|am i taking)\b.*\b(medicine|medicines|medication|medications|meds)\b|taking.*\b(medicine|medicines|medications?\b)/.test(q)) {
    return { type: 'medication_list', original: query };
  }

  // Next Dose Intent: "what's next", "when is my next medicine"
  if (/\b(next|upcoming|due)\b.*\b(dose|medicine|medication)\b|what.*next/.test(q)) {
    return { type: 'next_dose', original: query };
  }

  // Schedule Intent: "what's my schedule", "my daily routine", "tell me my schedule"
  if (/\b(schedule|routine|plan|timing|daily)\b/.test(q)) {
    return { type: 'schedule', original: query };
  }

  // Specific Medicine Intent: "when should I take aspirin"
  // Check for specific medicine names first
  const specificMedicines = ['aspirin', 'paracetamol', 'ibuprofen', 'metformin', 'atorvastatin', 'lisinopril', 'amoxicillin', 'omeprazole'];
  const medicineMatch = q.match(new RegExp(`\\b(${specificMedicines.join('|')})\\b`));
  
  if (medicineMatch || /\b(when|how|dosage|dose|take)\b/.test(q)) {
    return {
      type: 'specific_medicine',
      medicineNames: medicineMatch ? [medicineMatch[1]] : [],
      original: query
    };
  }

  return { type: 'unknown', original: query };
}
