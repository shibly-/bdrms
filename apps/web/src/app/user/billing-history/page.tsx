"use client";

import { FormEvent, useMemo, useState } from "react";
import { Download, Printer } from "lucide-react";
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
import { USER_NAV } from "@/lib/user-nav";
import { downloadBillingHistoryPdf } from "@/lib/bill-pdf";
import { downloadBillingHistoryCsv } from "@/lib/billing-history-csv";
import {
  billingAlertErr,
  billingButton,
  billingH2,
  billingInput,
  billingSection,
} from "@/lib/billing-ui";

const exportBtn =
  "inline-flex items-center gap-1 rounded border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium text-zinc-800 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700";

type BillingRow = GasBillDetailRow;

export default function ResidentBillingHistoryPage() {
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
        cmp = String(a[sortKey] ?? "").localeCompare(String(b[sortKey] ?? ""), undefined, {
          numeric: true,
          sensitivity: "base",
        });
      }
      if (cmp === 0) cmp = a.billId - b.billId;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [rows, sortKey, sortDir]);

  return (
    <AppShell
      title="Billing History"
      subtitle="Your personal gas billing history."
      menu={USER_NAV}
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
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                downloadBillingHistoryPdf(sortedRows, {
                  fileName: "my-gas-bills",
                  showUser: false,
                })
              }
              disabled={sortedRows.length === 0}
              className={exportBtn}
            >
              <Printer className="h-3.5 w-3.5" aria-hidden />
              Print PDF
            </button>
            <button
              type="button"
              onClick={() => downloadBillingHistoryCsv(sortedRows, "my-gas-bills")}
              disabled={sortedRows.length === 0}
              className={exportBtn}
            >
              <Download className="h-3.5 w-3.5" aria-hidden />
              Download CSV
            </button>
          </div>
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
