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
import { adminFetch } from "@/lib/admin-client";
import { downloadBillingHistoryCsv } from "@/lib/billing-history-csv";
import {
  billingAlertErr,
  billingButton,
  billingH2,
  billingInput,
  billingSection,
} from "@/lib/billing-ui";
import { STAFF_NAV } from "@/lib/staff-nav";

type BillingRow = GasBillDetailRow;
type Building = { id: number; name: string; buildingNo: string | null };
type Flat = { id: number; flatNo: string; buildingId: number };

export default function StaffGasBillingHistoryPage() {
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
    void adminFetch<Building[]>("/auth/buildings")
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
      const params = new URLSearchParams(Object.entries(filters).filter(([, v]) => String(v).length > 0));
      params.set("status", "paid,cancelled");
      const res = await adminFetch<{ items: BillingRow[] }>(`/billing/history?${params.toString()}`);
      setRows(res.items ?? []);
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Failed to load billing history.");
    }
  }

  async function openBillById(billId: number) {
    try {
      const row = await adminFetch<BillingRow>(`/billing/bill/${billId}`);
      setDetailBill(row);
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Failed to load bill.");
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
      let cmp: number;
      if (sortKey === "billId") {
        cmp = a.billId - b.billId;
      } else if (sortKey === "totalBill") {
        cmp = Number(a.totalBill) - Number(b.totalBill);
      } else if (sortKey === "billingDate") {
        cmp = String(a.billingDate).localeCompare(String(b.billingDate));
      } else {
        cmp = String(a[sortKey] ?? "").localeCompare(String(b[sortKey] ?? ""));
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [rows, sortKey, sortDir]);

  return (
    <AppShell
      title="Gas Billing History"
      subtitle="Staff view of generated gas bills with search filters."
      menu={STAFF_NAV}
      compact
    >
      {err ? <section className={billingAlertErr}>{err}</section> : null}
      <section className={billingSection}>
        <h2 className={billingH2}>Filters</h2>
        <form className="grid gap-2 md:grid-cols-6" onSubmit={loadHistory}>
          <input type="month" className={billingInput} value={filters.month} onChange={(e) => setFilters((v) => ({ ...v, month: e.target.value }))} />
          <input className={billingInput} placeholder="User Name" value={filters.userName} onChange={(e) => setFilters((v) => ({ ...v, userName: e.target.value }))} />
          <input className={billingInput} placeholder="Gas Meter No" value={filters.gasMeterNo} onChange={(e) => setFilters((v) => ({ ...v, gasMeterNo: e.target.value }))} />
          <select className={billingInput} value={filters.buildingId} onChange={(e) => setFilters((v) => ({ ...v, buildingId: e.target.value, flatId: "" }))}>
            <option value="">Building No</option>
            {buildings.map((b) => <option key={b.id} value={b.id}>{b.buildingNo ? `${b.buildingNo} (${b.name})` : b.name}</option>)}
          </select>
          <select className={billingInput} value={filters.flatId} onChange={(e) => setFilters((v) => ({ ...v, flatId: e.target.value }))}>
            <option value="">Flat No</option>
            {flats.map((f) => <option key={f.id} value={f.id}>{f.flatNo}</option>)}
          </select>
          <button className={billingButton}>Apply Filters</button>
        </form>
      </section>
      <section className={billingSection}>
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Billing List</h2>
          <button
            type="button"
            onClick={() => downloadBillingHistoryCsv(sortedRows)}
            disabled={sortedRows.length === 0}
            className="rounded border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium text-zinc-800 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
          >
            Download CSV
          </button>
        </div>
        <BillingHistoryList
          rows={sortedRows}
          sortKey={sortKey}
          sortDir={sortDir}
          onToggleSort={toggleSort}
          onOpenDetails={setDetailBill}
          showUser
        />
      </section>

      <GasBillDetailModal
        bill={detailBill}
        onClose={() => setDetailBill(null)}
        onOpenBill={openBillById}
      />
    </AppShell>
  );
}
