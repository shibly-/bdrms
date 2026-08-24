"use client";

import { FormEvent, useMemo, useState } from "react";
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

type BillingRow = GasBillDetailRow;

export default function ResidentGasBillingHistoryPage() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [rows, setRows] = useState<BillingRow[]>([]);
  const [err, setErr] = useState("");
  const [sortKey, setSortKey] = useState<BillingSortKey>("billingDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [detailBill, setDetailBill] = useState<BillingRow | null>(null);

  async function loadHistory(e?: FormEvent) {
    e?.preventDefault();
    try {
      setErr("");
      const params = new URLSearchParams(month ? { month } : {}).toString();
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
      subtitle="Your personal gas billing history."
      menu={[
        { href: "/user", label: "Overview" },
        { href: "/user/profile", label: "Profile" },
        { href: "/user/gas-billing-history", label: "Gas Billing History" },
      ]}
    >
      {err ? (
        <section className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-200">
          {err}
        </section>
      ) : null}

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 font-semibold">Filter</h2>
        <form className="grid gap-3 md:grid-cols-3" onSubmit={loadHistory}>
          <input type="month" className="rounded-md border border-zinc-300 p-2" value={month} onChange={(e) => setMonth(e.target.value)} />
          <button className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white">Apply</button>
        </form>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 font-semibold">My Bills</h2>
        <BillingHistoryList
          rows={sortedRows}
          sortKey={sortKey}
          sortDir={sortDir}
          onToggleSort={toggleSort}
          onOpenDetails={setDetailBill}
        />
      </section>

      <GasBillDetailModal bill={detailBill} onClose={() => setDetailBill(null)} />
    </AppShell>
  );
}
