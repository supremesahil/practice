'use client';

import { useCareStore } from '@/store/useCareStore';
import { PrescriptionUpload } from '@/components/PrescriptionUpload';

export default function RefillsPage() {
  const { medicines, scanResult, setScanResult } = useCareStore();
  const lowStock = medicines.filter((medicine) => medicine.stock <= 6);

  return (
    <div className="grid h-full gap-8 xl:grid-cols-[1fr_0.9fr]">
      <PrescriptionUpload result={scanResult} onScanned={setScanResult} />

      <section className="card p-6">
        <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-white/60">Refill Queue</h3>
        <p className="mt-2 text-body text-white/45">Track low-stock medicines and refill action windows.</p>

        <div className="mt-6 space-y-3">
          {lowStock.length ? (
            lowStock.map((medicine) => (
              <article key={medicine.id} className="rounded-2xl bg-[#141b19] p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-label font-semibold text-ink">{medicine.name}</p>
                    <p className="mt-1 text-body text-white/45">
                      {medicine.dosage} | {medicine.time}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-white/35">Remaining</p>
                    <p className="mt-1 text-lg font-bold text-amber-300">{medicine.stock}</p>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-2xl bg-[#141b19] p-6 text-body text-white/45">All medicines have healthy stock coverage right now.</div>
          )}
        </div>
      </section>
    </div>
  );
}

