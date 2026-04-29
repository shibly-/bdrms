"use client";

import { FormEvent, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { adminFetch } from "@/lib/admin-client";

type BillingRow = {
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
};

export default function ResidentGasBillingHistoryPage() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [rows, setRows] = useState<BillingRow[]>([]);
  const [err, setErr] = useState("");
  const [sortKey, setSortKey] = useState<"billingDate" | "gasMeterNo" | "totalBill">("billingDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

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

  function toggleSort(next: "billingDate" | "gasMeterNo" | "totalBill") {
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
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left">
                <th><button onClick={() => toggleSort("billingDate")} className="font-semibold">Date</button></th>
                <th><button onClick={() => toggleSort("gasMeterNo")} className="font-semibold">Meter</button></th>
                <th>Building</th>
                <th>Flat</th>
                <th>Previous</th>
                <th>Current</th>
                <th>Usage (m³)</th>
                <th>Unit Price</th>
                <th><button onClick={() => toggleSort("totalBill")} className="font-semibold">Total Bill</button></th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((r) => (
                <tr key={r.billId} className="border-b border-zinc-100">
                  <td className="py-2">{r.billingDate}</td>
                  <td>{r.gasMeterNo}</td>
                  <td>{r.buildingName}</td>
                  <td>{r.flatNo}</td>
                  <td>{r.previousReading}</td>
                  <td>{r.currentReading}</td>
                  <td>{r.usageQuantity}</td>
                  <td>{r.unitPrice}</td>
                  <td>{r.totalBill}</td>
                </tr>
              ))}
              {sortedRows.length === 0 ? (
                <tr>
                  <td className="py-3 text-zinc-500" colSpan={9}>No billing rows found.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
