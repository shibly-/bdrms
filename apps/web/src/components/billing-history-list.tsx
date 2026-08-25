"use client";

import { ArrowDown, ArrowUp, ChevronsUpDown, FileText } from "lucide-react";
import type {
  BillStatus,
  GasBillDetailRow,
} from "@/components/gas-bill-detail-modal";
import { formatBillDateTime, formatMoney } from "@/lib/format";

export type BillingSortKey =
  | "billId"
  | "billingDate"
  | "userName"
  | "gasMeterNo"
  | "totalBill";

type Props = {
  rows: GasBillDetailRow[];
  sortKey: BillingSortKey;
  sortDir: "asc" | "desc";
  onToggleSort: (key: BillingSortKey) => void;
  onOpenDetails: (row: GasBillDetailRow) => void;
  /** Show the resident (full name / user name) column. Hidden on the resident's own page. */
  showUser?: boolean;
};

function SortIndicator({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  if (!active) {
    return <ChevronsUpDown className="h-3.5 w-3.5 text-zinc-300 dark:text-zinc-600" aria-hidden />;
  }
  return dir === "asc" ? (
    <ArrowUp className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-300" aria-hidden />
  ) : (
    <ArrowDown className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-300" aria-hidden />
  );
}

function HeaderCell({
  label,
  sortable,
  activeKey,
  columnKey,
  dir,
  onToggleSort,
  align = "left",
}: {
  label: string;
  sortable?: boolean;
  activeKey: BillingSortKey;
  columnKey?: BillingSortKey;
  dir: "asc" | "desc";
  onToggleSort: (key: BillingSortKey) => void;
  align?: "left" | "right";
}) {
  const base =
    "px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400";
  const alignCls = align === "right" ? "text-right" : "text-left";
  if (!sortable || !columnKey) {
    return <th className={`${base} ${alignCls}`}>{label}</th>;
  }
  const active = activeKey === columnKey;
  return (
    <th className={`${base} ${alignCls}`}>
      <button
        type="button"
        onClick={() => onToggleSort(columnKey)}
        className={`inline-flex items-center gap-1 transition hover:text-zinc-900 dark:hover:text-zinc-100 ${
          align === "right" ? "flex-row-reverse" : ""
        }`}
      >
        <span>{label}</span>
        <SortIndicator active={active} dir={dir} />
      </button>
    </th>
  );
}

const STATUS_STYLES: Record<BillStatus, string> = {
  unpaid:
    "bg-amber-100 text-amber-700 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:ring-amber-900/40",
  paid: "bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-900/40",
  cancelled:
    "bg-red-100 text-red-700 ring-red-200 dark:bg-red-950/30 dark:text-red-300 dark:ring-red-900/40",
};

function StatusBadge({ status }: { status?: BillStatus }) {
  if (!status) {
    return <span className="text-zinc-400 dark:text-zinc-500">—</span>;
  }
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${STATUS_STYLES[status]}`}
    >
      {label}
    </span>
  );
}

function StatPair({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-zinc-50 px-2.5 py-1.5 dark:bg-zinc-800/50">
      <dt className="text-[11px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
        {label}
      </dt>
      <dd className="mt-0.5 font-medium text-zinc-800 tabular-nums dark:text-zinc-100">
        {value}
      </dd>
    </div>
  );
}

export function BillingHistoryList({
  rows,
  sortKey,
  sortDir,
  onToggleSort,
  onOpenDetails,
  showUser = false,
}: Props) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-200 py-12 text-center dark:border-zinc-800">
        <FileText className="h-6 w-6 text-zinc-300 dark:text-zinc-600" aria-hidden />
        <p className="text-sm text-zinc-500 dark:text-zinc-400">No billing rows found.</p>
        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          Adjust the filters above and try again.
        </p>
      </div>
    );
  }

  const sortOptions: { key: BillingSortKey; label: string }[] = [
    { key: "billId", label: "Id" },
    { key: "billingDate", label: "Date" },
    ...(showUser ? [{ key: "userName" as const, label: "User" }] : []),
    { key: "gasMeterNo", label: "Meter" },
    { key: "totalBill", label: "Total bill" },
  ];

  return (
    <div>
      {/* Mobile sort control */}
      <div className="mb-3 flex items-center gap-2 md:hidden">
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          Sort by
        </span>
        <select
          value={sortKey}
          onChange={(e) => onToggleSort(e.target.value as BillingSortKey)}
          className="flex-1 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          {sortOptions.map((o) => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => onToggleSort(sortKey)}
          aria-label={`Toggle sort direction (currently ${sortDir === "asc" ? "ascending" : "descending"})`}
          className="inline-flex items-center gap-1 rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
        >
          {sortDir === "asc" ? (
            <ArrowUp className="h-4 w-4" aria-hidden />
          ) : (
            <ArrowDown className="h-4 w-4" aria-hidden />
          )}
        </button>
      </div>

      {/* Mobile card list */}
      <ul className="space-y-3 md:hidden">
        {rows.map((r) => (
          <li
            key={r.billId}
            className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
                  Bill #{r.billId}
                </p>
                <p className="text-sm font-semibold text-zinc-900 tabular-nums dark:text-zinc-50">
                  {formatBillDateTime(r.billingDate)}
                </p>
                <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                  {showUser ? `${r.fullName} · ` : ""}
                  {r.buildingName} · Flat {r.flatNo}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[11px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                  Total
                </p>
                <p className="text-base font-bold text-zinc-900 tabular-nums dark:text-zinc-50">
                  {formatMoney(r.totalBill)}
                </p>
              </div>
            </div>

            <div className="px-4 py-3">
              <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
                Meter <span className="font-medium text-zinc-700 dark:text-zinc-200">{r.gasMeterNo}</span>
                <span className="mx-1.5 text-zinc-300 dark:text-zinc-600">|</span>
                Unit <span className="font-medium text-zinc-700 tabular-nums dark:text-zinc-200">{formatMoney(r.unitPrice)}</span>
              </p>
              <dl className="grid grid-cols-3 gap-2 text-xs">
                <StatPair label="Previous" value={r.previousReading} />
                <StatPair label="Current" value={r.currentReading} />
                <StatPair label="Usage m³" value={r.usageQuantity} />
              </dl>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-zinc-100 px-4 py-3 dark:border-zinc-800">
              <StatusBadge status={r.status} />
              <button
                type="button"
                onClick={() => onOpenDetails(r)}
                className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                View details
              </button>
            </div>
          </li>
        ))}
      </ul>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-xl border border-zinc-200 md:block dark:border-zinc-800">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-800/50">
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              <HeaderCell label="Id" sortable columnKey="billId" align="right" activeKey={sortKey} dir={sortDir} onToggleSort={onToggleSort} />
              <HeaderCell label="Date" sortable columnKey="billingDate" activeKey={sortKey} dir={sortDir} onToggleSort={onToggleSort} />
              {showUser ? (
                <HeaderCell label="User" sortable columnKey="userName" activeKey={sortKey} dir={sortDir} onToggleSort={onToggleSort} />
              ) : null}
              <HeaderCell label="Meter" sortable columnKey="gasMeterNo" activeKey={sortKey} dir={sortDir} onToggleSort={onToggleSort} />
              <HeaderCell label="Building" activeKey={sortKey} dir={sortDir} onToggleSort={onToggleSort} />
              <HeaderCell label="Flat" activeKey={sortKey} dir={sortDir} onToggleSort={onToggleSort} />
              <HeaderCell label="Previous" align="right" activeKey={sortKey} dir={sortDir} onToggleSort={onToggleSort} />
              <HeaderCell label="Current" align="right" activeKey={sortKey} dir={sortDir} onToggleSort={onToggleSort} />
              <HeaderCell label="Usage m³" align="right" activeKey={sortKey} dir={sortDir} onToggleSort={onToggleSort} />
              <HeaderCell label="Unit price" align="right" activeKey={sortKey} dir={sortDir} onToggleSort={onToggleSort} />
              <HeaderCell label="Total bill" sortable columnKey="totalBill" align="right" activeKey={sortKey} dir={sortDir} onToggleSort={onToggleSort} />
              <HeaderCell label="Status" activeKey={sortKey} dir={sortDir} onToggleSort={onToggleSort} />
              <HeaderCell label="Actions" align="right" activeKey={sortKey} dir={sortDir} onToggleSort={onToggleSort} />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {rows.map((r) => (
              <tr
                key={r.billId}
                className="transition hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40"
              >
                <td className="whitespace-nowrap px-2 py-1.5 text-right font-medium text-zinc-500 tabular-nums dark:text-zinc-400">#{r.billId}</td>
                <td className="whitespace-nowrap px-2 py-1.5 text-zinc-700 tabular-nums dark:text-zinc-200">{formatBillDateTime(r.billingDate)}</td>
                {showUser ? (
                  <td className="px-2 py-1.5 text-zinc-700 dark:text-zinc-200">
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">{r.fullName}</span>
                    <span className="ml-1 text-zinc-400 dark:text-zinc-500">({r.userName})</span>
                  </td>
                ) : null}
                <td className="whitespace-nowrap px-2 py-1.5 text-zinc-700 dark:text-zinc-200">{r.gasMeterNo}</td>
                <td className="px-2 py-1.5 text-zinc-700 dark:text-zinc-200">{r.buildingName}</td>
                <td className="px-2 py-1.5 text-zinc-700 dark:text-zinc-200">{r.flatNo}</td>
                <td className="px-2 py-1.5 text-right text-zinc-700 tabular-nums dark:text-zinc-200">{r.previousReading}</td>
                <td className="px-2 py-1.5 text-right text-zinc-700 tabular-nums dark:text-zinc-200">{r.currentReading}</td>
                <td className="px-2 py-1.5 text-right text-zinc-700 tabular-nums dark:text-zinc-200">{r.usageQuantity}</td>
                <td className="px-2 py-1.5 text-right text-zinc-700 tabular-nums dark:text-zinc-200">{formatMoney(r.unitPrice)}</td>
                <td className="px-2 py-1.5 text-right font-semibold text-zinc-900 tabular-nums dark:text-zinc-50">{formatMoney(r.totalBill)}</td>
                <td className="px-2 py-1.5">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-2 py-1.5 text-right">
                  <button
                    type="button"
                    onClick={() => onOpenDetails(r)}
                    className="rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                  >
                    Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
