"use client";

import { useMemo, useState } from "react";
import { ScanLine, ReceiptText } from "lucide-react";

export default function StaffPage() {
  const [previousReading, setPreviousReading] = useState<number>(0);
  const [currentReading, setCurrentReading] = useState<number>(0);
  const [unitPrice, setUnitPrice] = useState<number>(12.5);
  const billingDate = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const usage = Math.max(0, currentReading - previousReading);
  const total = usage * unitPrice;

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <h1 className="text-2xl font-bold">Staff Portal</h1>
      <section className="rounded-xl border p-5">
        <h2 className="mb-4 flex items-center gap-2 font-semibold">
          <ReceiptText className="h-4 w-4" /> Gas Meter Bill Generation
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm">Billing Date<input className="mt-1 w-full rounded-md border p-2" value={billingDate} readOnly /></label>
          <label className="text-sm">Operation Area<input className="mt-1 w-full rounded-md border p-2" value="Area-01" readOnly /></label>
          <label className="text-sm">Previous Reading<input type="number" className="mt-1 w-full rounded-md border p-2" value={previousReading} onChange={(e) => setPreviousReading(Number(e.target.value))} /></label>
          <label className="text-sm">Current Reading<input type="number" className="mt-1 w-full rounded-md border p-2" value={currentReading} onChange={(e) => setCurrentReading(Number(e.target.value))} /></label>
          <label className="text-sm">Gas Unit Price<input type="number" className="mt-1 w-full rounded-md border p-2" value={unitPrice} onChange={(e) => setUnitPrice(Number(e.target.value))} /></label>
          <label className="text-sm">OCR Image Scan (Placeholder)
            <button className="mt-1 flex w-full items-center justify-center gap-2 rounded-md border p-2 text-sm">
              <ScanLine className="h-4 w-4" /> Scan meter image
            </button>
          </label>
        </div>
        <div className="mt-4 rounded-md bg-zinc-50 p-3 text-sm">
          Usage Quantity = {usage.toFixed(3)} | Total Bill = {total.toFixed(2)}
        </div>
      </section>

      <section className="rounded-xl border p-5">
        <h2 className="mb-3 font-semibold">Current Month Billing List</h2>
        <p className="text-sm text-zinc-600">Table/list placeholder for monthly meter bills.</p>
      </section>
    </main>
  );
}
