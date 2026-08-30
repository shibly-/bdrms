"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  Download,
  Loader2,
  Printer,
  X,
} from "lucide-react";
import {
  GasBillDetailModal,
  type GasBillDetailRow,
} from "@/components/gas-bill-detail-modal";
import { adminFetch } from "@/lib/admin-client";
import { downloadUnpaidBillsPdf } from "@/lib/bill-pdf";
import { downloadBillingHistoryCsv } from "@/lib/billing-history-csv";
import {
  billingAlertErr,
  billingAlertOk,
  billingButton,
  billingH2,
  billingInput,
  billingSection,
} from "@/lib/billing-ui";
import { formatBillDateTime, formatMoney } from "@/lib/format";

type UnpaidSortKey =
  | "billId"
  | "billingDate"
  | "fullName"
  | "buildingName"
  | "flatNo"
  | "gasMeterNo";

const exportBtn =
  "inline-flex items-center gap-1 rounded border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium text-zinc-800 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700";

function cmpText(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
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
  columnKey: UnpaidSortKey;
  sortKey: UnpaidSortKey;
  sortDir: "asc" | "desc";
  onToggle: (key: UnpaidSortKey) => void;
  align?: "left" | "right";
}) {
  const active = sortKey === columnKey;
  return (
    <th
      className={`px-2 py-1.5 ${align === "right" ? "text-right" : "text-left"}`}
    >
      <button
        type="button"
        onClick={() => onToggle(columnKey)}
        className={`inline-flex items-center gap-1 uppercase tracking-wide transition hover:text-zinc-900 dark:hover:text-zinc-100 ${
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

type Building = { id: number; name: string; buildingNo: string | null; isActive?: number };
type Flat = { id: number; flatNo: string; buildingId: number };

type Props = {
  /** Endpoint returning the list of buildings for the filter dropdown. */
  buildingsEndpoint: string;
  /** Only Admin users may mark bills as paid / update them. */
  isAdmin: boolean;
};

export function UnpaidGasBills({ buildingsEndpoint, isAdmin }: Props) {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [flats, setFlats] = useState<Flat[]>([]);
  const [filters, setFilters] = useState({
    month: "",
    gasMeterNo: "",
    buildingId: "",
    flatId: "",
  });
  const [rows, setRows] = useState<GasBillDetailRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [detailBill, setDetailBill] = useState<GasBillDetailRow | null>(null);
  const [editBill, setEditBill] = useState<GasBillDetailRow | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [sortKey, setSortKey] = useState<UnpaidSortKey>("billId");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  function toggleSort(next: UnpaidSortKey) {
    if (sortKey === next) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(next);
    setSortDir("asc");
  }

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      let cmp: number;
      if (sortKey === "billId") {
        cmp = a.billId - b.billId;
      } else if (sortKey === "billingDate") {
        cmp =
          new Date(a.billingDate).getTime() - new Date(b.billingDate).getTime();
        if (!Number.isFinite(cmp) || cmp === 0) {
          cmp = cmpText(String(a.billingDate), String(b.billingDate));
        }
      } else if (sortKey === "fullName") {
        cmp = cmpText(a.fullName, b.fullName);
        if (cmp === 0) cmp = cmpText(a.userName, b.userName);
      } else {
        cmp = cmpText(String(a[sortKey] ?? ""), String(b[sortKey] ?? ""));
      }
      if (cmp === 0) cmp = a.billId - b.billId;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [rows, sortKey, sortDir]);

  useEffect(() => {
    void adminFetch<Building[]>(buildingsEndpoint)
      .then((data) =>
        setBuildings(data.filter((b) => Number(b.isActive ?? 1) === 1)),
      )
      .catch(() => {});
  }, [buildingsEndpoint]);

  useEffect(() => {
    if (!filters.buildingId) {
      setFlats([]);
      return;
    }
    void adminFetch<Flat[]>(`/auth/buildings/${filters.buildingId}/flats`)
      .then(setFlats)
      .catch(() => setFlats([]));
  }, [filters.buildingId]);

  const loadUnpaid = useMemo(
    () =>
      async function load(e?: FormEvent) {
        e?.preventDefault();
        setLoading(true);
        setErr("");
        try {
          const params = new URLSearchParams(
            Object.entries(filters).filter(([, v]) => String(v).length > 0),
          );
          params.set("status", "unpaid");
          const res = await adminFetch<{ items: GasBillDetailRow[] }>(
            `/billing/history?${params.toString()}`,
          );
          setRows(res.items ?? []);
        } catch (error) {
          setErr(
            error instanceof Error
              ? error.message
              : "Failed to load unpaid bills.",
          );
        } finally {
          setLoading(false);
        }
      },
    [filters],
  );

  useEffect(() => {
    void loadUnpaid();
    // Load once on mount; filters trigger reload via the Apply button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openBillById(billId: number) {
    try {
      const row = await adminFetch<GasBillDetailRow>(`/billing/bill/${billId}`);
      setDetailBill(row);
    } catch (error) {
      setErr(
        error instanceof Error ? error.message : "Failed to load bill details.",
      );
    }
  }

  async function markPaid(billId: number) {
    setBusyId(billId);
    setErr("");
    setMsg("");
    try {
      await adminFetch(`/billing/${billId}/mark-paid`, { method: "POST" });
      setMsg(`Bill #${billId} marked as paid.`);
      await loadUnpaid();
    } catch (error) {
      setErr(
        error instanceof Error ? error.message : "Failed to mark bill as paid.",
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-3">
      {err ? <section className={billingAlertErr}>{err}</section> : null}
      {msg ? <section className={billingAlertOk}>{msg}</section> : null}

      <section className={billingSection}>
        <h2 className={billingH2}>Filters</h2>
        <form className="grid gap-2 md:grid-cols-5" onSubmit={loadUnpaid}>
          <input
            type="month"
            className={billingInput}
            value={filters.month}
            onChange={(e) => setFilters((v) => ({ ...v, month: e.target.value }))}
          />
          <input
            className={billingInput}
            placeholder="Gas Meter No"
            value={filters.gasMeterNo}
            onChange={(e) =>
              setFilters((v) => ({ ...v, gasMeterNo: e.target.value }))
            }
          />
          <select
            className={billingInput}
            value={filters.buildingId}
            onChange={(e) =>
              setFilters((v) => ({
                ...v,
                buildingId: e.target.value,
                flatId: "",
              }))
            }
          >
            <option value="">Building No</option>
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.buildingNo ? `${b.buildingNo} (${b.name})` : b.name}
              </option>
            ))}
          </select>
          <select
            className={`${billingInput} disabled:cursor-not-allowed disabled:opacity-60`}
            value={filters.flatId}
            disabled={!filters.buildingId}
            onChange={(e) =>
              setFilters((v) => ({ ...v, flatId: e.target.value }))
            }
          >
            <option value="">Flat No</option>
            {flats.map((f) => (
              <option key={f.id} value={f.id}>
                {f.flatNo}
              </option>
            ))}
          </select>
          <button className={billingButton}>Apply Filters</button>
        </form>
      </section>

      <section className={billingSection}>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Unpaid Bills</h2>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {rows.length} bill{rows.length === 1 ? "" : "s"}
            </span>
            <button
              type="button"
              onClick={() => downloadUnpaidBillsPdf(sortedRows)}
              disabled={sortedRows.length === 0}
              className={exportBtn}
            >
              <Printer className="h-3.5 w-3.5" aria-hidden />
              Print PDF
            </button>
            <button
              type="button"
              onClick={() =>
                downloadBillingHistoryCsv(sortedRows, "unpaid-gas-bills")
              }
              disabled={sortedRows.length === 0}
              className={exportBtn}
            >
              <Download className="h-3.5 w-3.5" aria-hidden />
              Download CSV
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-6 text-xs text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-md border border-dashed border-zinc-200 py-6 text-center text-xs text-zinc-500 dark:border-zinc-800">
            No unpaid bills found.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-zinc-200 dark:border-zinc-800">
            <table className="min-w-full text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                <tr className="border-b border-zinc-200 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                  <SortHeader
                    label="Id"
                    columnKey="billId"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onToggle={toggleSort}
                    align="right"
                  />
                  <SortHeader
                    label="Date"
                    columnKey="billingDate"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onToggle={toggleSort}
                  />
                  <SortHeader
                    label="User"
                    columnKey="fullName"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onToggle={toggleSort}
                  />
                  <SortHeader
                    label="Building"
                    columnKey="buildingName"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onToggle={toggleSort}
                  />
                  <SortHeader
                    label="Flat"
                    columnKey="flatNo"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onToggle={toggleSort}
                  />
                  <SortHeader
                    label="Meter"
                    columnKey="gasMeterNo"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onToggle={toggleSort}
                  />
                  <th className="px-2 py-1.5 text-right">Current</th>
                  <th className="px-2 py-1.5 text-right">Total</th>
                  <th className="px-2 py-1.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {sortedRows.map((r) => (
                  <tr
                    key={r.billId}
                    className="transition hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40"
                  >
                    <td className="whitespace-nowrap px-2 py-1.5 text-right font-medium text-zinc-500 tabular-nums dark:text-zinc-400">
                      #{r.billId}
                    </td>
                    <td className="whitespace-nowrap px-2 py-1.5 text-zinc-700 tabular-nums dark:text-zinc-200">
                      {formatBillDateTime(r.billingDate)}
                    </td>
                    <td className="px-2 py-1.5 text-zinc-700 dark:text-zinc-200">
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">
                        {r.fullName}
                      </span>
                      <span className="ml-1 text-zinc-400 dark:text-zinc-500">
                        ({r.userName})
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-zinc-700 dark:text-zinc-200">
                      {r.buildingName}
                    </td>
                    <td className="px-2 py-1.5 text-zinc-700 dark:text-zinc-200">
                      {r.flatNo}
                    </td>
                    <td className="whitespace-nowrap px-2 py-1.5 text-zinc-700 dark:text-zinc-200">
                      {r.gasMeterNo}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-zinc-700 dark:text-zinc-200">
                      {r.currentReading}
                    </td>
                    <td className="px-2 py-1.5 text-right font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                      {formatMoney(r.totalBill)}
                    </td>
                    <td className="px-2 py-1.5">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setDetailBill(r)}
                          className="rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                        >
                          Details
                        </button>
                        {isAdmin ? (
                          <>
                            <button
                              type="button"
                              onClick={() => setEditBill(r)}
                              className="rounded-md border border-blue-300 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 transition hover:bg-blue-100 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-300"
                            >
                              Update
                            </button>
                            <button
                              type="button"
                              disabled={busyId === r.billId}
                              onClick={() => markPaid(r.billId)}
                              className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {busyId === r.billId ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : null}
                              Mark As Paid
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <GasBillDetailModal
        bill={detailBill}
        onClose={() => setDetailBill(null)}
        onOpenBill={openBillById}
      />

      {editBill ? (
        <UpdateBillModal
          bill={editBill}
          onClose={() => setEditBill(null)}
          onUpdated={async (newBillId) => {
            setEditBill(null);
            setMsg(
              `Bill #${editBill.billId} cancelled and replaced by new unpaid bill #${newBillId}.`,
            );
            await loadUnpaid();
          }}
        />
      ) : null}
    </div>
  );
}

function UpdateBillModal({
  bill,
  onClose,
  onUpdated,
}: {
  bill: GasBillDetailRow;
  onClose: () => void;
  onUpdated: (newBillId: number) => void | Promise<void>;
}) {
  const [currentReading, setCurrentReading] = useState(bill.currentReading);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!reason.trim()) {
      setErr("An update reason is required.");
      return;
    }
    setSubmitting(true);
    setErr("");
    try {
      const res = await adminFetch<{ billId: number }>(
        `/billing/${bill.billId}/update`,
        {
          method: "POST",
          body: JSON.stringify({
            currentReading: Number(currentReading),
            updateReason: reason.trim(),
          }),
        },
      );
      await onUpdated(res.billId);
    } catch (error) {
      setErr(
        error instanceof Error ? error.message : "Failed to update bill.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-zinc-900"
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <h2 className="font-semibold">Update Bill #{bill.billId}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4 px-5 py-5">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {bill.fullName} · {bill.buildingName} · Flat {bill.flatNo} · Meter{" "}
            {bill.gasMeterNo}
          </p>
          {err ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-200">
              {err}
            </div>
          ) : null}
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-200">
              Previous reading (m³)
            </label>
            <input
              disabled
              value={bill.previousReading}
              className="w-full rounded-md border border-zinc-200 bg-zinc-100 p-2 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-200">
              Current reading (m³)
            </label>
            <input
              type="number"
              step="0.001"
              min="0"
              required
              value={currentReading}
              onChange={(e) => setCurrentReading(e.target.value)}
              className="w-full rounded-md border border-zinc-300 p-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-200">
              Update reason <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              maxLength={200}
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this bill being corrected?"
              className="w-full rounded-md border border-zinc-300 p-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
            <p className="mt-1 text-right text-xs text-zinc-400">
              {reason.length}/200
            </p>
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save update
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
