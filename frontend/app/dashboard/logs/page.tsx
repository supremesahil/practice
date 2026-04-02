'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { AddMedicineForm } from '@/components/AddMedicineForm';
import { AIInputBox } from '@/components/AIInputBox';
import { MedicineTable } from '@/components/MedicineTable';
import { useCareStore } from '@/store/useCareStore';

export default function LogsPage() {
  const { medicines, parsedInsight, addMedicine, setParsedInsight } = useCareStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [savingMedicine, setSavingMedicine] = useState(false);

  return (
    <>
      <div className="grid h-full gap-8 xl:grid-cols-[1.15fr_0.85fr]">
        <MedicineTable medicines={medicines} onAdd={() => setShowAddForm(true)} />
        <AIInputBox insight={parsedInsight} onParsed={setParsedInsight} />
      </div>

      <AddMedicineForm
        open={showAddForm}
        submitting={savingMedicine}
        onClose={() => setShowAddForm(false)}
        onSubmit={async (values) => {
          setSavingMedicine(true);
          try {
            await addMedicine(values);
            toast.success('Medicine added successfully');
            setShowAddForm(false);
          } catch {
            toast.error('Unable to save medicine');
          } finally {
            setSavingMedicine(false);
          }
        }}
      />
    </>
  );
}
