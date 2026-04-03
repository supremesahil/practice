import { processVoiceQuery } from '../services/geminiService';
import type { VoiceQueryInput, GeminiResponse, MedicineReminder } from '../types';

export async function handleVoiceQuery(
  input: VoiceQueryInput,
  remindersData: MedicineReminder[]
): Promise<GeminiResponse> {
  try {
    const response = await processVoiceQuery(input, remindersData);
    return response;
  } catch (error) {
    console.error('Voice query error:', error);
    return {
      success: false,
      text: 'Sorry, something went wrong processing your request.'
    };
  }
}
