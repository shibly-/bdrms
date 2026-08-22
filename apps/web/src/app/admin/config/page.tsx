"use client";

import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useUserRole } from "@/hooks/use-user-role";
import { adminFetch } from "@/lib/admin-client";
import { getAdminNavForRole } from "@/lib/admin-nav";

export default function ConfigPage() {
  const role = useUserRole();
  const [gasUnitName, setGasUnitName] = useState("");
  const [gasUnitPrice, setGasUnitPrice] = useState<number>(0);
  const [operatingCostPerFlat, setOperatingCostPerFlat] = useState<number>(1);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function load() {
    try {
      const data = await adminFetch<{ gasUnitName: string; gasUnitPrice: string; operatingCostPerFlat: string }>("/admin/system-config");
      setGasUnitName(data.gasUnitName);
      setGasUnitPrice(Number(data.gasUnitPrice));
      setOperatingCostPerFlat(Number(data.operatingCostPerFlat ?? 1));
    } catch {
      // no config yet
    }
  }
  useEffect(() => { void load(); }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMsg("");
    setErr("");
    try {
      await adminFetch("/admin/system-config", {
        method: "PATCH",
        body: JSON.stringify({ gasUnitName, gasUnitPrice, operatingCostPerFlat }),
      });
      setMsg("Configuration saved.");
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Failed to save config.");
    }
  }

  return (
    <AppShell
      title="Configuration Page"
      subtitle="Maintain gas unit setup used for billing calculations."
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
        <h2 className="mb-4 font-semibold">Gas Configuration</h2>
        <form className="grid gap-3 md:grid-cols-2" onSubmit={submit}>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Gas Unit Name</span>
            <input className="rounded-md border border-zinc-300 p-2" placeholder="Gas Unit Name" value={gasUnitName} onChange={(e) => setGasUnitName(e.target.value)} required />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Gas Price Per KG</span>
            <input type="number" step="0.01" className="rounded-md border border-zinc-300 p-2" placeholder="Gas Unit Price" value={gasUnitPrice} onChange={(e) => setGasUnitPrice(Number(e.target.value))} required />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Operating Cost Per Flat</span>
            <input type="number" step="0.01" min="0" className="rounded-md border border-zinc-300 p-2" placeholder="Operating Cost Per Flat" value={operatingCostPerFlat} onChange={(e) => setOperatingCostPerFlat(Number(e.target.value))} required />
          </label>
          <button className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white md:col-span-2">Save Configuration</button>
        </form>
      </section>
    </AppShell>
  );
}
