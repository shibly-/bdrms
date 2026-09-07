"use client";

import { FormEvent, useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-client";
import {
  billingAlertErr,
  billingAlertOk,
  billingButton,
  billingH2,
  billingInput,
  billingInputReadonly,
  billingLabel,
  billingSection,
} from "@/lib/billing-ui";
import { formatBillDateTime } from "@/lib/format";
import type { LoadRow } from "@/lib/load-types";

type Building = { id: number; name: string; buildingNo: string | null; isActive?: number };

function qtyLabel(value: number): string {
  return value.toFixed(3);
}

function costLabel(value: number): string {
  return value.toFixed(2);
}

type Props = {
  buildingsEndpoint: string;
};

export function CurrentLoadForm({ buildingsEndpoint }: Props) {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [buildingId, setBuildingId] = useState<number | "">("");
  const [current, setCurrent] = useState<LoadRow | null>(null);
  const [quantityKg, setQuantityKg] = useState("");
  const [costBdt, setCostBdt] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  function applyLoad(load: LoadRow | null) {
    setCurrent(load);
    if (load) {
      setQuantityKg(qtyLabel(load.quantityKg));
      setCostBdt(costLabel(load.costBdt));
    } else {
      setQuantityKg("");
      setCostBdt("");
    }
  }

  useEffect(() => {
    void adminFetch<Building[]>(buildingsEndpoint)
      .then((data) =>
        setBuildings(data.filter((b) => Number(b.isActive ?? 1) === 1)),
      )
      .catch((e) =>
        setErr(e instanceof Error ? e.message : "Failed to load buildings."),
      );
  }, [buildingsEndpoint]);

  useEffect(() => {
    applyLoad(null);
    setMsg("");
    if (!buildingId) return;
    let cancelled = false;
    void adminFetch<{ load: LoadRow | null }>(`/loads/current?buildingId=${buildingId}`)
      .then((res) => {
        if (!cancelled) applyLoad(res.load);
      })
      .catch((e) => {
        if (!cancelled) {
          setErr(e instanceof Error ? e.message : "Failed to load current load.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [buildingId]);

  async function onUpdate(e: FormEvent) {
    e.preventDefault();
    if (busy || !buildingId) return;
    try {
      setBusy(true);
      setErr("");
      setMsg("");
      const res = await adminFetch<{ load: LoadRow; replacedLoadId: number | null }>(
        "/loads/update",
        {
          method: "POST",
          body: JSON.stringify({
            buildingId,
            quantityKg: Number(quantityKg),
            costBdt: Number(costBdt),
          }),
        },
      );
      applyLoad(res.load);
      setMsg(
        res.replacedLoadId
          ? "Current load updated. The previous running load was cancelled."
          : "Current load saved as Running.",
      );
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Failed to update load.");
    } finally {
      setBusy(false);
    }
  }

  async function onConsumed() {
    if (busy || !current || !buildingId) return;
    try {
      setBusy(true);
      setErr("");
      setMsg("");
      await adminFetch("/loads/consumed", {
        method: "POST",
        body: JSON.stringify({ buildingId }),
      });
      applyLoad(null);
      setMsg("Current load marked as Consumed. Enter a new load when ready.");
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Failed to mark load as consumed.");
    } finally {
      setBusy(false);
    }
  }

  const hasRunning = current?.status === "running";

  return (
    <>
      {err ? <section className={billingAlertErr}>{err}</section> : null}
      {msg ? <section className={billingAlertOk}>{msg}</section> : null}

      <section className={billingSection}>
        <h2 className={billingH2}>Current Load</h2>
        <form className="grid gap-2 md:grid-cols-2" onSubmit={onUpdate}>
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
          <label className={billingLabel}>
            Current Load Quantity (KG)
            <input
              type="number"
              step="0.001"
              min="0.001"
              className={billingInput}
              value={quantityKg}
              onChange={(e) => setQuantityKg(e.target.value)}
              required
              disabled={!buildingId}
            />
          </label>
          <label className={billingLabel}>
            Current Load Cost (BDT)
            <input
              type="number"
              step="0.01"
              min="0"
              className={billingInput}
              value={costBdt}
              onChange={(e) => setCostBdt(e.target.value)}
              required
              disabled={!buildingId}
            />
          </label>
          <label className={billingLabel}>
            Status
            <input
              className={billingInputReadonly}
              value={hasRunning ? "Running" : "—"}
              readOnly
            />
          </label>
          <label className={billingLabel}>
            Loading Date
            <input
              className={billingInputReadonly}
              value={current ? formatBillDateTime(current.createdAt) : ""}
              readOnly
            />
          </label>
          <label className={billingLabel}>
            Update date
            <input
              className={billingInputReadonly}
              value={current ? formatBillDateTime(current.updatedAt) : ""}
              readOnly
            />
          </label>
          <div className="flex flex-wrap items-end gap-2 md:col-span-2">
            <button className={billingButton} disabled={busy || !buildingId}>
              {busy ? "Saving…" : "Update"}
            </button>
            <button
              type="button"
              onClick={() => void onConsumed()}
              disabled={busy || !hasRunning || !buildingId}
              className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            >
              Consumed
            </button>
          </div>
        </form>
      </section>
    </>
  );
}
