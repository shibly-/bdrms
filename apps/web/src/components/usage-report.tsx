"use client";

import { FormEvent, useEffect, useState } from "react";
import { BarChart3, Download, Printer, Table2 } from "lucide-react";
import { UsageLineChart, type UsagePeriod, type UsageSeries } from "@/components/usage-line-chart";
import { UsageTable } from "@/components/usage-table";
import { adminFetch } from "@/lib/admin-client";
import { downloadUsageCsv, downloadUsagePdf } from "@/lib/usage-export";
import {
  billingAlertErr,
  billingButton,
  billingH2,
  billingInput,
  billingLabel,
  billingSection,
} from "@/lib/billing-ui";

type Building = { id: number; name: string; buildingNo: string | null; isActive?: number };
type Granularity = "weekly" | "monthly";

type UsageResponse = {
  buildingName: string;
  buildingNo: string | null;
  granularity: Granularity;
  unit: "m3";
  periods: UsagePeriod[];
  series: UsageSeries[];
};

type Props = {
  /** Endpoint returning buildings. Required unless `scope` is `self`. */
  buildingsEndpoint?: string;
  /** `self` hides the building filter and loads only the signed-in resident's flat. */
  scope?: "building" | "self";
};

const exportBtn =
  "inline-flex items-center gap-1 rounded border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium text-zinc-800 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700";

function defaultStartDate(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 5);
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function UsageReport({
  buildingsEndpoint,
  scope = "building",
}: Props) {
  const isSelfScope = scope === "self";
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [buildingId, setBuildingId] = useState<number | "">("");
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(today);
  const [granularity, setGranularity] = useState<Granularity>("monthly");
  const [data, setData] = useState<UsageResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [hasQueried, setHasQueried] = useState(false);
  const [view, setView] = useState<"chart" | "table">("chart");

  useEffect(() => {
    if (isSelfScope || !buildingsEndpoint) return;
    void adminFetch<Building[]>(buildingsEndpoint)
      .then((rows) =>
        setBuildings(rows.filter((b) => Number(b.isActive ?? 1) === 1)),
      )
      .catch((e) =>
        setErr(e instanceof Error ? e.message : "Failed to load buildings."),
      );
  }, [buildingsEndpoint, isSelfScope]);

  async function loadUsage(e?: FormEvent) {
    e?.preventDefault();
    if ((!isSelfScope && !buildingId) || !startDate || !endDate) {
      setErr(
        isSelfScope
          ? "Select a start and end date."
          : "Select a building and a start and end date.",
      );
      setData(null);
      return;
    }
    if (startDate > endDate) {
      setErr("Start date must be on or before end date.");
      setData(null);
      return;
    }
    try {
      setBusy(true);
      setErr("");
      const params = new URLSearchParams({
        startDate,
        endDate,
        granularity,
      });
      if (!isSelfScope && buildingId) {
        params.set("buildingId", String(buildingId));
      }
      const res = await adminFetch<UsageResponse>(`/billing/usage?${params.toString()}`);
      setData(res);
      setHasQueried(true);
    } catch (error) {
      setData(null);
      setErr(error instanceof Error ? error.message : "Failed to load usage.");
    } finally {
      setBusy(false);
    }
  }

  const hasConsumption =
    !!data && data.series.some((s) => s.values.some((v) => v > 0));
  const canExport = hasQueried && !!data && data.series.length > 0;

  return (
    <>
      {err ? <section className={billingAlertErr}>{err}</section> : null}

      <section className={billingSection}>
        <h2 className={billingH2}>Filters</h2>
        <form
          className={`grid gap-2 ${isSelfScope ? "md:grid-cols-4" : "md:grid-cols-5"}`}
          onSubmit={loadUsage}
        >
          {isSelfScope ? null : (
            <label className={billingLabel}>
              Building
              <select
                className={billingInput}
                value={buildingId}
                onChange={(e) => setBuildingId(Number(e.target.value) || "")}
                required
              >
                <option value="">Select Building</option>
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.buildingNo ? `${b.buildingNo} (${b.name})` : b.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className={billingLabel}>
            Start date
            <input
              type="date"
              className={billingInput}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </label>
          <label className={billingLabel}>
            End date
            <input
              type="date"
              className={billingInput}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </label>
          <label className={billingLabel}>
            Projection
            <select
              className={billingInput}
              value={granularity}
              onChange={(e) => setGranularity(e.target.value as Granularity)}
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </label>
          <div className="flex items-end">
            <button className={billingButton} disabled={busy}>
              {busy ? "Loading…" : "Show usage"}
            </button>
          </div>
        </form>
      </section>

      <section className={billingSection}>
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">
            {data
              ? `${isSelfScope ? "Your consumption" : "Consumption by flat"} (${data.granularity === "weekly" ? "weekly" : "monthly"}, ${data.unit === "m3" ? "m³" : data.unit})`
              : isSelfScope
                ? "Your consumption"
                : "Consumption by flat"}
          </h2>
          {canExport ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setView((v) => (v === "chart" ? "table" : "chart"))}
                className={exportBtn}
              >
                {view === "chart" ? (
                  <>
                    <Table2 className="h-3.5 w-3.5" aria-hidden />
                    Show Table
                  </>
                ) : (
                  <>
                    <BarChart3 className="h-3.5 w-3.5" aria-hidden />
                    Show Chart
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => data && downloadUsagePdf(data)}
                className={exportBtn}
              >
                <Printer className="h-3.5 w-3.5" aria-hidden />
                Print PDF
              </button>
              <button
                type="button"
                onClick={() => data && downloadUsageCsv(data)}
                className={exportBtn}
              >
                <Download className="h-3.5 w-3.5" aria-hidden />
                Download CSV
              </button>
            </div>
          ) : null}
        </div>
        {!hasQueried ? (
          <p className="text-sm text-zinc-500">
            {isSelfScope
              ? "Select a date range, then choose Weekly or Monthly to plot your consumption."
              : "Select a building and date range, then choose Weekly or Monthly to plot consumption."}
          </p>
        ) : !data || data.series.length === 0 ? (
          <p className="text-sm text-zinc-500">
            {isSelfScope ? "No usage data found for your flat." : "No flats found for this building."}
          </p>
        ) : view === "table" ? (
          <UsageTable periods={data.periods} series={data.series} unitLabel="m³" />
        ) : (
          <UsageLineChart periods={data.periods} series={data.series} unitLabel="m³" />
        )}
        {hasQueried && data && data.series.length > 0 && !hasConsumption ? (
          <p className="mt-2 text-xs text-zinc-500">
            No meter consumption in this range. Consumption is current reading minus previous reading (m³).
          </p>
        ) : null}
      </section>
    </>
  );
}
