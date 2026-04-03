import { parseIntent } from './intentParser';
import {
  formatMedicineListResponse,
  formatSpecificMedicineResponse,
  formatNextDoseResponse,
  formatScheduleResponse
} from './responseFormatter';
import type { VoiceQueryInput, GeminiResponse, MedicineReminder } from '../types';

export async function processVoiceQuery(
  input: VoiceQueryInput,
  reminders: MedicineReminder[]
): Promise<GeminiResponse> {
  const intent = parseIntent(input.query);
  let responseText = '';

  switch (intent.type) {
    case 'medication_list':
      responseText = formatMedicineListResponse(reminders);
      break;

    case 'specific_medicine':
      const medicine = reminders.find(r =>
        intent.medicineNames?.some(name =>
          r.medicine.toLowerCase().includes(name)
        )
      );
      responseText = formatSpecificMedicineResponse(medicine);
      break;

    case 'next_dose':
      responseText = formatNextDoseResponse(reminders);
      break;

    case 'schedule':
      responseText = formatScheduleResponse(reminders);
      break;

    default:
      responseText = "I didn't understand that. Try asking about your medicines, schedule, or next dose.";
  }

  return {
    success: true,
    text: responseText,
    medicines: reminders.map(r => ({
      name: r.medicine,
      dosage: r.dosage,
      time: r.time
    }))
  };
}
