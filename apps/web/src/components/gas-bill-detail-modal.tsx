"use client";

import { useEffect } from "react";
import { isPersistedMeterImageUrl } from "@/components/billing-meter-image-cell";

export type GasBillDetailRow = {
  billId: number;
  billingDate: string;
  userName: string;
  fullName: string;
  gasMeterNo: string;
  buildingName: string;
  flatNo: string;
  previousReading: string;
  currentReading: string;
  usageQuantity: string;
  unitPrice: string;
  totalBill: string;
  ocrImageUrl: string | null;
};

type Props = {
  bill: GasBillDetailRow | null;
  onClose: () => void;
};

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-x-3 gap-y-1 border-b border-zinc-100 py-2 text-sm last:border-b-0 dark:border-zinc-800">
      <dt className="text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd className="font-medium text-zinc-900 dark:text-zinc-100">{value}</dd>
    </div>
  );
}

export function GasBillDetailModal({ bill, onClose }: Props) {
  useEffect(() => {
    if (!bill) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [bill, onClose]);

  if (!bill) return null;

  const usageM3 = Number(bill.usageQuantity);
  const usageKg = Number.isFinite(usageM3) ? usageM3 * 1.8315 : 0;
  const imageSrc = bill.ocrImageUrl;
  const hasImage = isPersistedMeterImageUrl(imageSrc);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 dark:bg-black/60"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="gas-bill-detail-title"
        className="relative z-10 flex max-h-[min(90vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <h2 id="gas-bill-detail-title" className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Bill details
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Close
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <dl className="mb-4">
            <DetailItem label="Bill ID" value={String(bill.billId)} />
            <DetailItem label="Billing date" value={bill.billingDate} />
            <DetailItem label="User name" value={bill.userName} />
            <DetailItem label="Full name" value={bill.fullName} />
            <DetailItem label="Gas meter no." value={bill.gasMeterNo} />
            <DetailItem label="Building" value={bill.buildingName} />
            <DetailItem label="Flat" value={bill.flatNo} />
            <DetailItem label="Previous reading (m³)" value={bill.previousReading} />
            <DetailItem label="Current reading (m³)" value={bill.currentReading} />
            <DetailItem label="Usage (m³)" value={bill.usageQuantity} />
            <DetailItem label="Usage (kg)" value={usageKg.toFixed(3)} />
            <DetailItem label="Unit price" value={bill.unitPrice} />
            <DetailItem label="Total bill" value={bill.totalBill} />
          </dl>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Meter image (at billing)
            </p>
            {hasImage ? (
              <a
                href={imageSrc}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <img
                  src={imageSrc}
                  alt="Gas meter capture stored with this bill"
                  className="max-h-64 w-full rounded-lg border border-zinc-200 object-contain dark:border-zinc-700"
                />
              </a>
            ) : (
              <p className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400">
                No meter image was stored for this bill.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
