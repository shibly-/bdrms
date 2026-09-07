"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { BillingRatesHeader } from "@/components/billing-rates-header";
import { adminFetch } from "@/lib/admin-client";
import {
  billingAlertErr,
  billingAlertOk,
  billingButton,
  billingInput,
  billingInputReadonly,
  billingLabel,
  billingSection,
} from "@/lib/billing-ui";
import { formatMoney } from "@/lib/format";

const KG_PER_M3 = 1.8315;

type Building = { id: number; name: string; buildingNo: string | null; isActive?: number };

type BuildingFlat = {
  standardUserId: number;
  flatId: number;
  flatNo: string;
  gasMeterNo: string;
  userName: string;
  fullName: string;
  previousReading: number;
};

type BuildingContext = {
  building: { id: number; name: string; buildingNo: string | null };
  billingDate: string;
  unitPrice: number;
  operatingCostPerFlat: number;
  flats: BuildingFlat[];
};

type Props = {
  /** Endpoint returning the list of buildings (admin vs. staff differ). */
  buildingsEndpoint: string;
};

function computeRow(
  previousReading: number,
  currentRaw: string,
  unitPrice: number,
  operatingCostPerFlat: number,
) {
  const current = Number(currentRaw);
  const hasValue = currentRaw.trim() !== "" && Number.isFinite(current);
  const readingIncreased = hasValue && current > previousReading;
  const usageM3 = readingIncreased ? current - previousReading : 0;
  const usageKg = usageM3 * KG_PER_M3;
  // Skip total bill unless current reading is strictly greater than previous.
  const totalBill = readingIncreased
    ? usageKg * unitPrice + operatingCostPerFlat
    : 0;
  return { hasValue, readingIncreased, usageM3, usageKg, totalBill };
}

export function BulkGasBillingForm({ buildingsEndpoint }: Props) {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [buildingId, setBuildingId] = useState<number | "">("");
  const [ctx, setCtx] = useState<BuildingContext | null>(null);
  const [readings, setReadings] = useState<Record<number, string>>({});
  const [loadingCtx, setLoadingCtx] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    void adminFetch<Building[]>(buildingsEndpoint)
      .then((data) =>
        setBuildings(data.filter((b) => Number(b.isActive ?? 1) === 1)),
      )
      .catch((e) =>
        setErr(e instanceof Error ? e.message : "Failed to load buildings."),
      );
  }, [buildingsEndpoint]);

  async function loadContext(id: number) {
    setLoadingCtx(true);
    try {
      const data = await adminFetch<BuildingContext>(
        `/billing/building-context?buildingId=${id}`,
      );
      setCtx(data);
      setReadings(
        Object.fromEntries(
          data.flats.map((f) => [f.flatId, String(f.previousReading ?? 0)]),
        ),
      );
    } catch (e) {
      setCtx(null);
      setErr(e instanceof Error ? e.message : "Failed to load building flats.");
    } finally {
      setLoadingCtx(false);
    }
  }

  async function onBuildingChange(nextId: number | "") {
    setBuildingId(nextId);
    setCtx(null);
    setReadings({});
    setMsg("");
    setErr("");
    if (!nextId) return;
    await loadContext(nextId);
  }

  const unitPrice = ctx?.unitPrice ?? 0;
  const operatingCostPerFlat = ctx?.operatingCostPerFlat ?? 0;

  const billableFlats = useMemo(() => {
    if (!ctx) return [];
    return ctx.flats.filter((f) => {
      const raw = readings[f.flatId] ?? "";
      const n = Number(raw);
      return raw.trim() !== "" && Number.isFinite(n) && n > f.previousReading;
    });
  }, [ctx, readings]);

  const grandTotal = useMemo(() => {
    if (!ctx) return 0;
    return ctx.flats.reduce((sum, f) => {
      const { totalBill } = computeRow(
        f.previousReading,
        readings[f.flatId] ?? "",
        unitPrice,
        operatingCostPerFlat,
      );
      return sum + totalBill;
    }, 0);
  }, [ctx, readings, unitPrice, operatingCostPerFlat]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!ctx || !buildingId) return;
    if (billableFlats.length === 0) {
      setErr(
        "Current reading must be greater than previous reading for at least one flat. Flats with no increase are skipped.",
      );
      return;
    }
    setSubmitting(true);
    setErr("");
    setMsg("");
    try {
      const items = billableFlats.map((f) => ({
        flatId: f.flatId,
        currentReading: Number(readings[f.flatId]),
      }));
      const skippedCount = ctx.flats.length - items.length;
      const res = await adminFetch<{ createdCount: number; billingDate: string }>(
        "/billing/generate-building",
        {
          method: "POST",
          body: JSON.stringify({ buildingId, items }),
        },
      );
      const skippedNote =
        skippedCount > 0
          ? ` ${skippedCount} flat(s) skipped (current reading not greater than previous).`
          : "";
      setMsg(
        `Created ${res.createdCount} gas bill(s) dated ${res.billingDate} for ${ctx.building.name}.${skippedNote}`,
      );
      // Refresh so previous readings reflect the newly created bills. Uses
      // loadContext (not onBuildingChange) to preserve the success message.
      await loadContext(buildingId);
    } catch (error) {
      setErr(
        error instanceof Error ? error.message : "Failed to create gas bills.",
      );
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
  }

  return (
    <>
      {err ? <section className={billingAlertErr}>{err}</section> : null}
      {msg ? <section className={billingAlertOk}>{msg}</section> : null}

      <form onSubmit={submit} className="space-y-3">
        <section className={billingSection}>
          <BillingRatesHeader buildingId={buildingId} />
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            <label className={billingLabel}>
              Building
              <select
                className={billingInput}
                value={buildingId}
                onChange={(e) => onBuildingChange(Number(e.target.value) || "")}
                required
              >
                <option value="">Select Building</option>
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.buildingNo ? `${b.buildingNo} (${b.name})` : b.name}
                  </option>
                ))}
              </select>
            </label>
            <label className={billingLabel}>
              Gas Meter Reading Date
              <input
                type="date"
                className={`${billingInputReadonly} cursor-not-allowed`}
                value={ctx?.billingDate ?? new Date().toISOString().slice(0, 10)}
                readOnly
                disabled
                title="The reading date is fixed to today and cannot be changed."
              />
            </label>
          </div>
        </section>

        <section className={billingSection}>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold">
              {ctx ? `Flats in ${ctx.building.name}` : "Flats"}
            </h2>
            {ctx ? (
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {ctx.flats.length} billable flat(s)
              </span>
            ) : null}
          </div>

          {loadingCtx ? (
            <p className="text-xs text-zinc-600 dark:text-zinc-300">
              Loading flats…
            </p>
          ) : !ctx ? (
            <p className="text-xs text-zinc-600 dark:text-zinc-300">
              Select a building to list its flats and gas meters.
            </p>
          ) : ctx.flats.length === 0 ? (
            <p className="text-xs text-zinc-600 dark:text-zinc-300">
              No billable flats (flats with a registered resident) were found for
              this building.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 text-left text-[11px] uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                    <th className="py-1.5 pr-2">Flat</th>
                    <th className="py-1.5 pr-2">Gas Meter No</th>
                    <th className="py-1.5 pr-2">Resident</th>
                    <th className="py-1.5 pr-2 text-right">Previous (m³)</th>
                    <th className="py-1.5 pr-2 text-right">Current (m³)</th>
                    <th className="py-1.5 pr-2 text-right">Usage (m³)</th>
                    <th className="py-1.5 pr-2 text-right">Usage (kg)</th>
                    <th className="py-1.5 pl-2 text-right">Total Bill</th>
                  </tr>
                </thead>
                <tbody>
                  {ctx.flats.map((f) => {
                    const raw = readings[f.flatId] ?? "";
                    const { readingIncreased, usageM3, usageKg, totalBill } =
                      computeRow(
                        f.previousReading,
                        raw,
                        unitPrice,
                        operatingCostPerFlat,
                      );
                    return (
                      <tr
                        key={f.flatId}
                        className="border-b border-zinc-100 dark:border-zinc-800/60"
                      >
                        <td className="py-1.5 pr-2 font-medium text-zinc-900 dark:text-zinc-100">
                          {f.flatNo}
                        </td>
                        <td className="py-1.5 pr-2 tabular-nums text-zinc-700 dark:text-zinc-300">
                          {f.gasMeterNo}
                        </td>
                        <td className="py-1.5 pr-2 text-zinc-700 dark:text-zinc-300">
                          {f.fullName}
                          <span className="ml-1 text-[11px] text-zinc-400">
                            ({f.userName})
                          </span>
                        </td>
                        <td className="py-1.5 pr-2 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                          {f.previousReading.toFixed(3)}
                        </td>
                        <td className="py-1.5 pr-2 text-right">
                          <input
                            type="number"
                            step="0.001"
                            min={f.previousReading}
                            inputMode="decimal"
                            aria-label={`Current reading for flat ${f.flatNo}`}
                            className={`w-24 rounded border px-1.5 py-0.5 text-right tabular-nums dark:bg-zinc-950 ${
                              readingIncreased
                                ? "border-zinc-300 dark:border-zinc-700"
                                : "border-amber-300 dark:border-amber-700/60"
                            }`}
                            value={raw}
                            onChange={(e) =>
                              setReadings((prev) => ({
                                ...prev,
                                [f.flatId]: e.target.value,
                              }))
                            }
                            required
                          />
                        </td>
                        <td className="py-1.5 pr-2 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                          {readingIncreased ? usageM3.toFixed(3) : "—"}
                        </td>
                        <td className="py-1.5 pr-2 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                          {readingIncreased ? usageKg.toFixed(3) : "—"}
                        </td>
                        <td className="py-1.5 pl-2 text-right font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                          {readingIncreased ? formatMoney(totalBill) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-zinc-200 dark:border-zinc-800">
                    <td
                      colSpan={7}
                      className="py-2 pr-2 text-right text-xs font-medium text-zinc-600 dark:text-zinc-300"
                    >
                      Grand total
                    </td>
                    <td className="py-2 pl-2 text-right text-sm font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
                      {formatMoney(grandTotal)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {ctx && ctx.flats.length > 0 ? (
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {billableFlats.length > 0
                  ? `Current reading defaults to previous. ${billableFlats.length} of ${ctx.flats.length} flat(s) will be billed. Unchanged readings are skipped.`
                  : "Current reading defaults to previous. Raise at least one current reading above previous to generate a bill."}
              </p>
              <button
                type="submit"
                disabled={billableFlats.length === 0 || submitting}
                className={`${billingButton} disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {submitting
                  ? "Generating bills…"
                  : `Generate Bills for ${billableFlats.length} Flat(s)`}
              </button>
            </div>
          ) : null}
        </section>
      </form>
    </>
  );
}
