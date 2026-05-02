"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { BillingMeterImageCell } from "@/components/billing-meter-image-cell";
import {
  GasBillDetailModal,
  type GasBillDetailRow,
} from "@/components/gas-bill-detail-modal";
import { adminFetch } from "@/lib/admin-client";

type BillingRow = GasBillDetailRow;
type Building = { id: number; name: string; buildingNo: string | null };
type Flat = { id: number; flatNo: string; buildingId: number };

export default function GasBillingHistoryPage() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [flats, setFlats] = useState<Flat[]>([]);
  const [filters, setFilters] = useState({
    month: new Date().toISOString().slice(0, 7),
    userName: "",
    gasMeterNo: "",
    buildingId: "",
    flatId: "",
  });
  const [rows, setRows] = useState<BillingRow[]>([]);
  const [err, setErr] = useState("");
  const [sortKey, setSortKey] = useState<"billingDate" | "userName" | "gasMeterNo" | "totalBill">("billingDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [detailBill, setDetailBill] = useState<BillingRow | null>(null);

  useEffect(() => {
    void adminFetch<Building[]>("/admin/buildings")
      .then(setBuildings)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!filters.buildingId) {
      setFlats([]);
      return;
    }
    void adminFetch<Flat[]>(`/auth/buildings/${filters.buildingId}/flats`)
      .then(setFlats)
      .catch(() => setFlats([]));
  }, [filters.buildingId]);

  async function loadHistory(e?: FormEvent) {
    e?.preventDefault();
    try {
      setErr("");
      const params = new URLSearchParams(
        Object.entries(filters).filter(([, v]) => String(v).length > 0),
      ).toString();
      const res = await adminFetch<{ items: BillingRow[] }>(`/billing/history?${params}`);
      setRows(res.items ?? []);
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Failed to load billing history.");
    }
  }

  function toggleSort(next: "billingDate" | "userName" | "gasMeterNo" | "totalBill") {
    if (sortKey === next) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(next);
    setSortDir("asc");
  }

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const cmp =
        sortKey === "totalBill"
          ? Number(a.totalBill) - Number(b.totalBill)
          : String(a[sortKey] ?? "").localeCompare(String(b[sortKey] ?? ""));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [rows, sortKey, sortDir]);

  return (
    <AppShell
      title="Gas Billing History"
      subtitle="Admin view of generated gas bills with search filters."
      menu={[
        { href: "/admin", label: "Overview" },
        { href: "/admin/buildings", label: "Buildings" },
        { href: "/admin/flats", label: "Flats/Apartments" },
        { href: "/admin/users", label: "Standard Users" },
        { href: "/admin/staff", label: "Staff Users" },
        { href: "/admin/gas-billing-form", label: "Gas Billing Form" },
        { href: "/admin/gas-billing-history", label: "Gas Billing History" },
        { href: "/admin/config", label: "Configuration" },
      ]}
    >
      {err ? (
        <section className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-200">
          {err}
        </section>
      ) : null}

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 font-semibold">Filters</h2>
        <form className="grid gap-3 md:grid-cols-6" onSubmit={loadHistory}>
          <input type="month" className="rounded-md border border-zinc-300 p-2" value={filters.month} onChange={(e) => setFilters((v) => ({ ...v, month: e.target.value }))} />
          <input className="rounded-md border border-zinc-300 p-2" placeholder="User Name" value={filters.userName} onChange={(e) => setFilters((v) => ({ ...v, userName: e.target.value }))} />
          <input className="rounded-md border border-zinc-300 p-2" placeholder="Gas Meter No" value={filters.gasMeterNo} onChange={(e) => setFilters((v) => ({ ...v, gasMeterNo: e.target.value }))} />
          <select
            className="rounded-md border border-zinc-300 p-2"
            value={filters.buildingId}
            onChange={(e) =>
              setFilters((v) => ({ ...v, buildingId: e.target.value, flatId: "" }))
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
            className="rounded-md border border-zinc-300 p-2"
            value={filters.flatId}
            onChange={(e) => setFilters((v) => ({ ...v, flatId: e.target.value }))}
          >
            <option value="">Flat No</option>
            {flats.map((f) => (
              <option key={f.id} value={f.id}>{f.flatNo}</option>
            ))}
          </select>
          <button className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white">Apply Filters</button>
        </form>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 font-semibold">Billing List</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left">
                <th><button onClick={() => toggleSort("billingDate")} className="font-semibold">Date</button></th>
                <th><button onClick={() => toggleSort("userName")} className="font-semibold">User</button></th>
                <th><button onClick={() => toggleSort("gasMeterNo")} className="font-semibold">Meter</button></th>
                <th>Building</th>
                <th>Flat</th>
                <th>Previous</th>
                <th>Current</th>
                <th>Usage (m³)</th>
                <th>Unit Price</th>
                <th><button onClick={() => toggleSort("totalBill")} className="font-semibold">Total Bill</button></th>
                <th>Meter image</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((r) => (
                <tr key={r.billId} className="border-b border-zinc-100">
                  <td className="py-2">{r.billingDate}</td>
                  <td>{r.fullName} ({r.userName})</td>
                  <td>{r.gasMeterNo}</td>
                  <td>{r.buildingName}</td>
                  <td>{r.flatNo}</td>
                  <td>{r.previousReading}</td>
                  <td>{r.currentReading}</td>
                  <td>{r.usageQuantity}</td>
                  <td>{r.unitPrice}</td>
                  <td>{r.totalBill}</td>
                  <td className="align-middle">
                    <BillingMeterImageCell src={r.ocrImageUrl} />
                  </td>
                  <td className="align-middle">
                    <button
                      type="button"
                      onClick={() => setDetailBill(r)}
                      className="rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                    >
                      Details
                    </button>
                  </td>
                </tr>
              ))}
              {sortedRows.length === 0 ? (
                <tr>
                  <td className="py-3 text-zinc-500" colSpan={12}>No billing rows found.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <GasBillDetailModal bill={detailBill} onClose={() => setDetailBill(null)} />
    </AppShell>
  );
}
