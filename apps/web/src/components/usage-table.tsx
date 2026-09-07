"use client";

import type { UsagePeriod, UsageSeries } from "@/components/usage-line-chart";

type Props = {
  periods: UsagePeriod[];
  series: UsageSeries[];
  unitLabel?: string;
};

function formatM3(value: number): string {
  return value.toFixed(3);
}

export function UsageTable({ periods, series, unitLabel = "m³" }: Props) {
  if (periods.length === 0) {
    return (
      <p className="text-sm text-zinc-500">No periods in the selected range.</p>
    );
  }

  const periodTotals = periods.map((_, i) =>
    series.reduce((sum, s) => sum + (s.values[i] ?? 0), 0),
  );
  const grandTotal = periodTotals.reduce((sum, v) => sum + v, 0);

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
      <table className="min-w-full text-sm">
        <thead className="bg-zinc-50 dark:bg-zinc-800/50">
          <tr className="border-b border-zinc-200 dark:border-zinc-800">
            <th className="sticky left-0 z-10 whitespace-nowrap bg-zinc-50 px-2 py-1.5 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
              Flat
            </th>
            {periods.map((p) => (
              <th
                key={p.key}
                className="whitespace-nowrap px-2 py-1.5 text-right text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
              >
                {p.label}
              </th>
            ))}
            <th className="whitespace-nowrap px-2 py-1.5 text-right text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Total ({unitLabel})
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {series.map((s) => {
            const rowTotal = s.values.reduce((sum, v) => sum + v, 0);
            return (
              <tr
                key={s.flatId}
                className="transition hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40"
              >
                <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-2 py-1.5 font-medium text-zinc-900 dark:bg-zinc-900 dark:text-zinc-50">
                  {s.flatNo}
                </td>
                {s.values.map((v, i) => (
                  <td
                    key={`${s.flatId}-${periods[i]?.key ?? i}`}
                    className="whitespace-nowrap px-2 py-1.5 text-right text-zinc-700 tabular-nums dark:text-zinc-200"
                  >
                    {formatM3(v)}
                  </td>
                ))}
                <td className="whitespace-nowrap px-2 py-1.5 text-right font-semibold text-zinc-900 tabular-nums dark:text-zinc-50">
                  {formatM3(rowTotal)}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/50">
            <td className="sticky left-0 z-10 whitespace-nowrap bg-zinc-50 px-2 py-1.5 font-semibold text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50">
              All flats
            </td>
            {periodTotals.map((v, i) => (
              <td
                key={`total-${periods[i]?.key ?? i}`}
                className="whitespace-nowrap px-2 py-1.5 text-right font-semibold text-zinc-900 tabular-nums dark:text-zinc-50"
              >
                {formatM3(v)}
              </td>
            ))}
            <td className="whitespace-nowrap px-2 py-1.5 text-right font-semibold text-zinc-900 tabular-nums dark:text-zinc-50">
              {formatM3(grandTotal)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
