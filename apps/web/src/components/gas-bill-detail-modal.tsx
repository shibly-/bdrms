"use client";

import { useEffect } from "react";
import { Flame, Gauge, ImageIcon, ReceiptText, User, X } from "lucide-react";
import { isPersistedMeterImageUrl } from "@/components/billing-meter-image-cell";
import { formatMoney } from "@/lib/format";

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

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
      <header className="flex items-center gap-2 border-b border-zinc-200 bg-zinc-50 px-4 py-2.5 dark:border-zinc-800 dark:bg-zinc-800/50">
        <Icon className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {title}
        </h3>
      </header>
      <dl className="divide-y divide-zinc-100 px-4 dark:divide-zinc-800">
        {children}
      </dl>
    </section>
  );
}

function Row({
  label,
  value,
  emphasize = false,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5 text-sm">
      <dt className="text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd
        className={
          emphasize
            ? "text-right font-semibold text-zinc-900 tabular-nums dark:text-zinc-50"
            : "text-right font-medium text-zinc-800 tabular-nums dark:text-zinc-100"
        }
      >
        {value}
      </dd>
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
        className="absolute inset-0 bg-black/50 backdrop-blur-sm dark:bg-black/70"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="gas-bill-detail-title"
        className="relative z-10 flex max-h-[min(92vh,760px)] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 dark:bg-zinc-900 dark:ring-white/10"
      >
        {/* Branded header */}
        <div className="relative shrink-0 bg-gradient-to-br from-zinc-900 to-zinc-700 px-6 py-5 text-white dark:from-zinc-800 dark:to-zinc-900">
          <div className="flex items-center gap-3 pr-10">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
              <Flame className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <h2
                id="gas-bill-detail-title"
                className="truncate text-lg font-semibold tracking-tight"
              >
                Gas Bill
              </h2>
              <p className="mt-0.5 text-xs text-zinc-300">
                Invoice #{bill.billId} &middot; {bill.billingDate}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 rounded-lg p-1.5 text-zinc-300 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {/* Total payable hero */}
          <div className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-zinc-50 px-5 py-4 dark:border-zinc-800 dark:bg-zinc-800/40">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Total payable
              </p>
              <p className="mt-1 text-3xl font-bold tracking-tight text-zinc-900 tabular-nums dark:text-zinc-50">
                {formatMoney(bill.totalBill)}
              </p>
            </div>
            <div className="text-right text-xs text-zinc-500 dark:text-zinc-400">
              <p className="tabular-nums">{bill.usageQuantity} m³ used</p>
              <p className="tabular-nums">@ {formatMoney(bill.unitPrice)}/unit</p>
            </div>
          </div>

          <Section title="Resident & location" icon={User}>
            <Row label="Full name" value={bill.fullName} />
            <Row label="User name" value={bill.userName} />
            <Row label="Building" value={bill.buildingName} />
            <Row label="Flat" value={bill.flatNo} />
            <Row label="Gas meter no." value={bill.gasMeterNo} />
          </Section>

          <Section title="Meter readings" icon={Gauge}>
            <Row label="Previous reading (m³)" value={bill.previousReading} />
            <Row label="Current reading (m³)" value={bill.currentReading} />
            <Row label="Usage (m³)" value={bill.usageQuantity} />
            <Row label="Usage (kg)" value={usageKg.toFixed(3)} />
          </Section>

          <Section title="Charges" icon={ReceiptText}>
            <Row label="Unit price" value={formatMoney(bill.unitPrice)} />
            <Row label="Usage (m³)" value={bill.usageQuantity} />
            <Row
              label="Total bill"
              value={formatMoney(bill.totalBill)}
              emphasize
            />
          </Section>

          <Section title="Meter image (at billing)" icon={ImageIcon}>
            <div className="py-3">
              {hasImage ? (
                <a
                  href={imageSrc ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block overflow-hidden rounded-lg border border-zinc-200 transition hover:opacity-90 dark:border-zinc-700"
                >
                  <img
                    src={imageSrc ?? undefined}
                    alt="Gas meter capture stored with this bill"
                    className="max-h-64 w-full object-contain"
                  />
                </a>
              ) : (
                <div className="flex items-center gap-3 rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-4 py-6 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400">
                  <ImageIcon className="h-5 w-5 shrink-0" aria-hidden />
                  No meter image was stored for this bill.
                </div>
              )}
            </div>
          </Section>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-zinc-200 bg-zinc-50 px-6 py-3.5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            Bill #{bill.billId}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
