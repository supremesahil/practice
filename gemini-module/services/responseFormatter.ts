import type { MedicineReminder } from '../types';

export function formatMedicineListResponse(reminders: MedicineReminder[]): string {
  if (!reminders || reminders.length === 0) {
    return "You don't have any medicines scheduled.";
  }

  const medicineList = reminders
    .map(r => `${r.medicine} - ${r.dosage} at ${r.time}`)
    .join('. ');

  return `You have ${reminders.length} medicine${reminders.length > 1 ? 's' : ''}. ${medicineList}`;
}

export function formatSpecificMedicineResponse(medicine: MedicineReminder | undefined): string {
  if (!medicine) {
    return "I couldn't find that medicine in your records.";
  }

  return `Take ${medicine.medicine} ${medicine.dosage} at ${medicine.time} every day.`;
}

export function formatNextDoseResponse(medicines: MedicineReminder[]): string {
  if (!medicines || medicines.length === 0) {
    return "No medicines scheduled.";
  }

  const nextMed = medicines[0];
  return `Your next medicine is ${nextMed.medicine} (${nextMed.dosage}) at ${nextMed.time}.`;
}

export function formatScheduleResponse(reminders: MedicineReminder[]): string {
  if (!reminders.length) return "No schedule.";

  const schedule = reminders
    .map(r => `${r.time}: ${r.medicine} ${r.dosage}`)
    .join(', ');

  return `Your daily medicine schedule is: ${schedule}`;
}
