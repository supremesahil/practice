'use client';

import { useRef, useState } from 'react';
import { FileUp, ScanSearch } from 'lucide-react';
import { scanPrescription } from '@/lib/api';
import type { ScanResult } from '@/lib/types';

interface PrescriptionUploadProps {
  result: ScanResult | null;
  onScanned: (result: ScanResult) => void;
}

export function PrescriptionUpload({ result, onScanned }: PrescriptionUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleFile = (file?: File) => {
    if (!file) {
      return;
    }

    setPreview(URL.createObjectURL(file));
  };

  return (
    <section className="card p-6" id="refills" aria-labelledby="prescription-upload-title">
      <h2 id="prescription-upload-title" className="text-sm font-bold uppercase tracking-[0.12em] text-white/65">
        Prescription Upload
      </h2>
      <p className="mt-1 text-body text-white/45">Upload a prescription image and simulate a quick AI medication scan.</p>

      <button
        type="button"
        className={`mt-4 flex min-h-[180px] w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-6 text-center ${
          dragActive ? 'border-[#68dbae] bg-[#13201c]' : 'border-white/10 bg-[#141b19]'
        }`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragActive(false);
          handleFile(event.dataTransfer.files?.[0]);
        }}
      >
        <FileUp className="h-8 w-8 text-brand" aria-hidden="true" />
        <span className="text-label font-medium text-ink">Drag and drop or browse prescription</span>
        <span className="text-body text-muted">Supports image previews for demo-ready upload states.</span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(event) => {
          handleFile(event.target.files?.[0]);
        }}
      />

      {preview ? (
        <div className="mt-4 overflow-hidden rounded-xl border border-cardBorder bg-white p-3">
          <img src={preview} alt="Prescription preview" className="h-48 w-full rounded-lg object-cover" />
        </div>
      ) : null}

      <button
        type="button"
        className="button-primary mt-4 inline-flex items-center justify-center gap-2"
        onClick={async () => {
          setLoading(true);
          const scan = await scanPrescription();
          onScanned(scan);
          setLoading(false);
        }}
      >
        <ScanSearch className="h-4 w-4" aria-hidden="true" />
        {loading ? 'Scanning...' : 'Scan with AI'}
      </button>

      {result ? (
        <div className="mt-4 rounded-xl border border-white/10 bg-[#141b19] p-4">
          <p className="text-label font-semibold text-ink">{result.title}</p>
          <p className="mt-2 text-body text-white/55">{result.summary}</p>
          <ul className="mt-3 space-y-2 text-body text-ink">
            {result.items.map((item) => (
              <li key={item} className="rounded-lg bg-[#1b2421] px-3 py-2">
                {item}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
