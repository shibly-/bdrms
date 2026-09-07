"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  Download,
  Printer,
} from "lucide-react";
import { adminFetch } from "@/lib/admin-client";
import {
  billingAlertErr,
  billingButton,
  billingH2,
  billingInput,
  billingLabel,
  billingSection,
} from "@/lib/billing-ui";
import { formatBillDateTime, formatMoney } from "@/lib/format";
import {
  downloadLoadingHistoryCsv,
  downloadLoadingHistoryPdf,
} from "@/lib/load-history-export";
import { gasPricePerKg, gasPricePerM3 } from "@/lib/load-pricing";
import type { LoadRow, LoadStatus } from "@/lib/load-types";
import { loadBuildingLabel } from "@/lib/load-types";

const exportBtn =
  "inline-flex items-center gap-1 rounded border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium text-zinc-800 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700";

type LoadSortKey = "id" | "status" | "createdAt" | "updatedAt";
type DateField = "createdAt" | "updatedAt";
type Building = { id: number; name: string; buildingNo: string | null; isActive?: number };

const STATUS_STYLES: Record<LoadStatus, string> = {
  running:
    "bg-sky-100 text-sky-700 ring-sky-200 dark:bg-sky-950/30 dark:text-sky-300 dark:ring-sky-900/40",
  consumed:
    "bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-900/40",
  cancelled:
    "bg-red-100 text-red-700 ring-red-200 dark:bg-red-950/30 dark:text-red-300 dark:ring-red-900/40",
};

function StatusBadge({ status }: { status: LoadStatus }) {
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${STATUS_STYLES[status]}`}
    >
      {label}
    </span>
  );
}

function localDateKey(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function SortHeader({
  label,
  columnKey,
  sortKey,
  sortDir,
  onToggle,
  align = "left",
}: {
  label: string;
  columnKey: LoadSortKey;
  sortKey: LoadSortKey;
  sortDir: "asc" | "desc";
  onToggle: (key: LoadSortKey) => void;
  align?: "left" | "right";
}) {
  const active = sortKey === columnKey;
  return (
    <th
      className={`px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      <button
        type="button"
        onClick={() => onToggle(columnKey)}
        className={`inline-flex items-center gap-1 transition hover:text-zinc-900 dark:hover:text-zinc-100 ${
          align === "right" ? "flex-row-reverse" : ""
        }`}
      >
        <span>{label}</span>
        {active ? (
          sortDir === "asc" ? (
            <ArrowUp className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <ArrowDown className="h-3.5 w-3.5" aria-hidden />
          )
        ) : (
          <ChevronsUpDown
            className="h-3.5 w-3.5 text-zinc-300 dark:text-zinc-600"
            aria-hidden
          />
        )}
      </button>
    </th>
  );
}

export function LoadingHistoryList({
  buildingsEndpoint,
}: {
  buildingsEndpoint: string;
}) {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [rows, setRows] = useState<LoadRow[]>([]);
  const [err, setErr] = useState("");
  const [buildingId, setBuildingId] = useState("");
  const [dateField, setDateField] = useState<DateField>("createdAt");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [applied, setApplied] = useState({
    buildingId: "",
    dateField: "createdAt" as DateField,
    startDate: "",
    endDate: "",
  });
  const [sortKey, setSortKey] = useState<LoadSortKey>("id");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    void adminFetch<Building[]>(buildingsEndpoint)
      .then((data) =>
        setBuildings(data.filter((b) => Number(b.isActive ?? 1) === 1)),
      )
      .catch(() => {});
    void adminFetch<{ items: LoadRow[] }>("/loads/history")
      .then((res) => setRows(res.items ?? []))
      .catch((e) =>
        setErr(e instanceof Error ? e.message : "Failed to load history."),
      );
  }, [buildingsEndpoint]);

  function applyFilters(e: FormEvent) {
    e.preventDefault();
    if (startDate && endDate && startDate > endDate) {
      setErr("Start date must be on or before end date.");
      return;
    }
    setErr("");
    setApplied({ buildingId, dateField, startDate, endDate });
  }

  function toggleSort(next: LoadSortKey) {
    if (sortKey === next) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(next);
    setSortDir(next === "id" ? "desc" : "asc");
  }

  const visibleRows = useMemo(() => {
    const filtered = rows.filter((r) => {
      if (applied.buildingId && String(r.buildingId) !== applied.buildingId) {
        return false;
      }
      if (!applied.startDate && !applied.endDate) return true;
      const key = localDateKey(r[applied.dateField]);
      if (!key) return false;
      if (applied.startDate && key < applied.startDate) return false;
      if (applied.endDate && key > applied.endDate) return false;
      return true;
    });
    return [...filtered].sort((a, b) => {
      let cmp: number;
      if (sortKey === "id") {
        cmp = a.id - b.id;
      } else if (sortKey === "status") {
        cmp = a.status.localeCompare(b.status);
      } else {
        cmp =
          new Date(a[sortKey]).getTime() - new Date(b[sortKey]).getTime();
        if (!Number.isFinite(cmp) || cmp === 0) {
          cmp = String(a[sortKey]).localeCompare(String(b[sortKey]));
        }
      }
      if (cmp === 0) cmp = a.id - b.id;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [rows, applied, sortKey, sortDir]);

  return (
    <>
      {err ? <section className={billingAlertErr}>{err}</section> : null}

      <section className={billingSection}>
        <h2 className={billingH2}>Filters</h2>
        <form
          className="grid gap-2 md:grid-cols-5"
          onSubmit={applyFilters}
        >
          <label className={billingLabel}>
            Building
            <select
              className={billingInput}
              value={buildingId}
              onChange={(e) => setBuildingId(e.target.value)}
            >
              <option value="">All buildings</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.buildingNo ? `${b.buildingNo} (${b.name})` : b.name}
                </option>
              ))}
            </select>
          </label>
          <label className={billingLabel}>
            Date field
            <select
              className={billingInput}
              value={dateField}
              onChange={(e) => setDateField(e.target.value as DateField)}
            >
              <option value="createdAt">Loading Date</option>
              <option value="updatedAt">Update Date</option>
            </select>
          </label>
          <label className={billingLabel}>
            Start date
            <input
              type="date"
              className={billingInput}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </label>
          <label className={billingLabel}>
            End date
            <input
              type="date"
              className={billingInput}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </label>
          <div className="flex items-end">
            <button className={billingButton}>Apply Filters</button>
          </div>
        </form>
      </section>

      <section className={billingSection}>
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Loads</h2>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => downloadLoadingHistoryPdf(visibleRows)}
              disabled={visibleRows.length === 0}
              className={exportBtn}
            >
              <Printer className="h-3.5 w-3.5" aria-hidden />
              Print PDF
            </button>
            <button
              type="button"
              onClick={() => downloadLoadingHistoryCsv(visibleRows)}
              disabled={visibleRows.length === 0}
              className={exportBtn}
            >
              <Download className="h-3.5 w-3.5" aria-hidden />
              Download CSV
            </button>
          </div>
        </div>
        {visibleRows.length === 0 ? (
          <p className="text-sm text-zinc-500">
            {rows.length === 0
              ? "No loads yet."
              : "No loads match the selected filters."}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <SortHeader
                    label="Id"
                    columnKey="id"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onToggle={toggleSort}
                    align="right"
                  />
                  <th className="px-2 py-1.5 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Building
                  </th>
                  <th className="px-2 py-1.5 text-right text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Quantity (KG)
                  </th>
                  <th className="px-2 py-1.5 text-right text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Cost (BDT)
                  </th>
                  <th className="px-2 py-1.5 text-right text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Gas Price Per KG
                  </th>
                  <th className="px-2 py-1.5 text-right text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Gas Price Per m³
                  </th>
                  <SortHeader
                    label="Status"
                    columnKey="status"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onToggle={toggleSort}
                  />
                  <SortHeader
                    label="Loading Date"
                    columnKey="createdAt"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onToggle={toggleSort}
                  />
                  <SortHeader
                    label="Update Date"
                    columnKey="updatedAt"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onToggle={toggleSort}
                  />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {visibleRows.map((r) => {
                  const priceKg = gasPricePerKg(r.costBdt, r.quantityKg);
                  const priceM3 = gasPricePerM3(priceKg);
                  return (
                    <tr
                      key={r.id}
                      className="transition hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40"
                    >
                      <td className="whitespace-nowrap px-2 py-1.5 text-right font-medium text-zinc-500 tabular-nums dark:text-zinc-400">
                        #{r.id}
                      </td>
                      <td className="whitespace-nowrap px-2 py-1.5 text-zinc-700 dark:text-zinc-200">
                        {loadBuildingLabel(r)}
                      </td>
                      <td className="whitespace-nowrap px-2 py-1.5 text-right text-zinc-700 tabular-nums dark:text-zinc-200">
                        {r.quantityKg.toFixed(3)}
                      </td>
                      <td className="whitespace-nowrap px-2 py-1.5 text-right text-zinc-700 tabular-nums dark:text-zinc-200">
                        {formatMoney(r.costBdt)}
                      </td>
                      <td className="whitespace-nowrap px-2 py-1.5 text-right text-zinc-700 tabular-nums dark:text-zinc-200">
                        {priceKg == null ? "—" : formatMoney(priceKg)}
                      </td>
                      <td className="whitespace-nowrap px-2 py-1.5 text-right text-zinc-700 tabular-nums dark:text-zinc-200">
                        {priceM3 == null ? "—" : formatMoney(priceM3)}
                      </td>
                      <td className="px-2 py-1.5">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="whitespace-nowrap px-2 py-1.5 text-zinc-700 tabular-nums dark:text-zinc-200">
                        {formatBillDateTime(r.createdAt)}
                      </td>
                      <td className="whitespace-nowrap px-2 py-1.5 text-zinc-700 tabular-nums dark:text-zinc-200">
                        {formatBillDateTime(r.updatedAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
