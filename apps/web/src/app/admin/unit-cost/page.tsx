"use client";

import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useUserRole } from "@/hooks/use-user-role";
import { adminFetch } from "@/lib/admin-client";
import { getAdminNavForRole } from "@/lib/admin-nav";

type Building = { id: number; name: string; buildingNo: string | null; isActive?: number };

export default function UnitCostPage() {
  const role = useUserRole();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [buildingId, setBuildingId] = useState<number | "">("");
  const [gasUnitName, setGasUnitName] = useState("");
  const [gasUnitPrice, setGasUnitPrice] = useState<number>(1);
  const [operatingCostPerFlat, setOperatingCostPerFlat] = useState<number>(1);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    void adminFetch<Building[]>("/admin/buildings")
      .then((data) =>
        setBuildings(data.filter((b) => Number(b.isActive ?? 1) === 1)),
      )
      .catch((e) =>
        setErr(e instanceof Error ? e.message : "Failed to load buildings."),
      );
  }, []);

  useEffect(() => {
    setMsg("");
    if (!buildingId) {
      setGasUnitName("");
      setGasUnitPrice(1);
      setOperatingCostPerFlat(1);
      return;
    }
    let cancelled = false;
    void adminFetch<{
      gasUnitName: string;
      gasUnitPrice: string;
      operatingCostPerFlat: string;
    }>(`/admin/system-config?buildingId=${buildingId}`)
      .then((data) => {
        if (cancelled) return;
        setGasUnitName(data.gasUnitName);
        setGasUnitPrice(Number(data.gasUnitPrice));
        setOperatingCostPerFlat(Number(data.operatingCostPerFlat ?? 1));
      })
      .catch(() => {
        if (cancelled) return;
        setGasUnitName("m3");
        setGasUnitPrice(1);
        setOperatingCostPerFlat(1);
      });
    return () => {
      cancelled = true;
    };
  }, [buildingId]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!buildingId) return;
    setMsg("");
    setErr("");
    try {
      const saved = await adminFetch<{ gasUnitPrice: string }>("/admin/system-config", {
        method: "PATCH",
        body: JSON.stringify({ buildingId, gasUnitName, operatingCostPerFlat }),
      });
      setGasUnitPrice(Number(saved.gasUnitPrice));
      setMsg("Unit cost saved.");
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Failed to save unit cost.");
    }
  }

  return (
    <AppShell
      title="Unit Cost"
      subtitle="Maintain gas unit setup used for billing calculations, per building."
      menu={getAdminNavForRole(role)}
    >
      {err ? (
        <section className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-200">
          {err}
        </section>
      ) : null}
      {msg ? (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-950/20 dark:text-emerald-200">
          {msg}
        </section>
      ) : null}
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 font-semibold">Unit Cost</h2>
        <form className="grid gap-3 md:grid-cols-2" onSubmit={submit}>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Building</span>
            <select
              className="rounded-md border border-zinc-300 p-2"
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
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Gas Unit Name</span>
            <input readOnly className="rounded-md border border-zinc-300 bg-zinc-50 p-2 text-zinc-700 dark:bg-zinc-950 dark:text-zinc-200" placeholder="Gas Unit Name" value={gasUnitName} required />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Gas Price Per KG</span>
            <input
              type="number"
              step="0.01"
              readOnly
              className="rounded-md border border-zinc-300 bg-zinc-50 p-2 text-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"
              placeholder="Gas Unit Price"
              value={gasUnitPrice}
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Gas Price Per m³</span>
            <input
              type="number"
              step="0.01"
              readOnly
              className="rounded-md border border-zinc-300 bg-zinc-50 p-2 text-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"
              placeholder="Gas Price Per m³"
              value={Number((gasUnitPrice * 1.8315).toFixed(2))}
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Operating Cost Per Flat</span>
            <input
              type="number"
              step="0.01"
              min="0"
              className="rounded-md border border-zinc-300 p-2"
              placeholder="Operating Cost Per Flat"
              value={operatingCostPerFlat}
              onChange={(e) => setOperatingCostPerFlat(Number(e.target.value))}
              required
              disabled={!buildingId}
            />
          </label>
          <div className="grid gap-2 md:col-span-2">
            <button className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white" disabled={!buildingId}>Save</button>
            <p className="text-xs text-zinc-500">
              For the selected building, Gas Price Per KG is Current Load Cost (BDT) ÷ Current Load Quantity (KG) for the Running load, or the last Consumed load if none is running. Defaults to 1 when no load exists.
            </p>
          </div>
        </form>
      </section>
    </AppShell>
  );
}
