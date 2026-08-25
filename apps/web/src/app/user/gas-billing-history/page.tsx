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
import { downloadBillingHistoryCsv } from "@/lib/billing-history-csv";
import {
  billingAlertErr,
  billingButton,
  billingH2,
  billingInput,
  billingSection,
} from "@/lib/billing-ui";

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
      const params = new URLSearchParams(month ? { month } : {});
      params.set("status", "paid,cancelled");
      const res = await adminFetch<{ items: BillingRow[] }>(`/billing/history?${params.toString()}`);
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
      subtitle="Your personal gas billing history."
      menu={[
        { href: "/user", label: "Overview" },
        { href: "/user/profile", label: "Profile" },
        { href: "/user/gas-billing-history", label: "Gas Billing History" },
      ]}
      compact
    >
      {err ? <section className={billingAlertErr}>{err}</section> : null}

      <section className={billingSection}>
        <h2 className={billingH2}>Filter</h2>
        <form className="grid gap-2 md:grid-cols-3" onSubmit={loadHistory}>
          <input type="month" className={billingInput} value={month} onChange={(e) => setMonth(e.target.value)} />
          <button className={billingButton}>Apply</button>
        </form>
      </section>

      <section className={billingSection}>
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">My Bills</h2>
          <button
            type="button"
            onClick={() => downloadBillingHistoryCsv(sortedRows, "my-gas-bills")}
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
        />
      </section>

      <GasBillDetailModal bill={detailBill} onClose={() => setDetailBill(null)} />
    </AppShell>
  );
}
