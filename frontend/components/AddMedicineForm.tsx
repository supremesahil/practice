'use client';

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const medicineSchema = z.object({
  name: z.string().min(2, 'Enter a medicine name'),
  dosage: z.string().min(2, 'Enter a dosage'),
  time: z.string().min(2, 'Enter a reminder time'),
  stock: z.coerce.number().min(1, 'Stock must be at least 1')
});

type MedicineFormValues = z.infer<typeof medicineSchema>;

interface AddMedicineFormProps {
  open: boolean;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (values: MedicineFormValues) => Promise<void>;
}

export function AddMedicineForm({ open, submitting, onClose, onSubmit }: AddMedicineFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<MedicineFormValues>({
    resolver: zodResolver(medicineSchema),
    defaultValues: {
      name: '',
      dosage: '',
      time: '',
      stock: 10
    }
  });

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="add-medicine-title">
      <div className="card w-full max-w-lg p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="add-medicine-title" className="text-title font-semibold text-ink">
              Add medicine
            </h2>
            <p className="text-body text-white/50">Create a new medicine reminder for the active patient.</p>
          </div>
          <button type="button" className="button-secondary px-3" onClick={onClose} aria-label="Close add medicine form">
            Close
          </button>
        </div>

        <form
          className="mt-5 space-y-4"
          onSubmit={handleSubmit(async (values) => {
            await onSubmit(values);
            reset();
          })}
        >
          <label className="block">
            <span className="mb-2 block text-label font-medium text-ink">Medicine name</span>
            <input className="input-base" {...register('name')} aria-invalid={Boolean(errors.name)} />
            {errors.name ? <span className="mt-1 block text-xs text-rose-300">{errors.name.message}</span> : null}
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-label font-medium text-ink">Dosage</span>
              <input className="input-base" {...register('dosage')} aria-invalid={Boolean(errors.dosage)} />
              {errors.dosage ? <span className="mt-1 block text-xs text-rose-300">{errors.dosage.message}</span> : null}
            </label>

            <label className="block">
              <span className="mb-2 block text-label font-medium text-ink">Time</span>
              <input className="input-base" {...register('time')} placeholder="08:00 AM" aria-invalid={Boolean(errors.time)} />
              {errors.time ? <span className="mt-1 block text-xs text-rose-300">{errors.time.message}</span> : null}
            </label>
          </div>

          <label className="block">
            <span className="mb-2 block text-label font-medium text-ink">Available stock</span>
            <input className="input-base" type="number" {...register('stock')} aria-invalid={Boolean(errors.stock)} />
            {errors.stock ? <span className="mt-1 block text-xs text-rose-300">{errors.stock.message}</span> : null}
          </label>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" className="button-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="button-primary" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save medicine'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
