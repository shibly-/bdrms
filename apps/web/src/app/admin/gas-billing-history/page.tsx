"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import {
  BillingHistoryList,
  type BillingSortKey,
} from "@/components/billing-history-list";
import {
  GasBillDetailModal,
  type GasBillDetailRow,
} from "@/components/gas-bill-detail-modal";
import { useUserRole } from "@/hooks/use-user-role";
import { adminFetch } from "@/lib/admin-client";
import { getAdminNavForRole } from "@/lib/admin-nav";

type BillingRow = GasBillDetailRow;
type Building = { id: number; name: string; buildingNo: string | null };
type Flat = { id: number; flatNo: string; buildingId: number };

export default function GasBillingHistoryPage() {
  const role = useUserRole();
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
  const [sortKey, setSortKey] = useState<BillingSortKey>("billingDate");
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

  function toggleSort(next: BillingSortKey) {
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
      menu={getAdminNavForRole(role)}
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
        <BillingHistoryList
          rows={sortedRows}
          sortKey={sortKey}
          sortDir={sortDir}
          onToggleSort={toggleSort}
          onOpenDetails={setDetailBill}
          showUser
        />
      </section>

      <GasBillDetailModal bill={detailBill} onClose={() => setDetailBill(null)} />
    </AppShell>
  );
}
