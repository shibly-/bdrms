"use client";

import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { adminFetch } from "@/lib/admin-client";

export default function ConfigPage() {
  const [gasUnitName, setGasUnitName] = useState("");
  const [gasUnitPrice, setGasUnitPrice] = useState<number>(0);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function load() {
    try {
      const data = await adminFetch<{ gasUnitName: string; gasUnitPrice: string }>("/admin/system-config");
      setGasUnitName(data.gasUnitName);
      setGasUnitPrice(Number(data.gasUnitPrice));
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
        body: JSON.stringify({ gasUnitName, gasUnitPrice }),
      });
      setMsg("Configuration saved.");
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Failed to save config.");
    }
  }

  return (
    <AppShell title="Configuration Page" subtitle="Maintain gas unit setup used for billing calculations." menu={[
      { href: "/admin", label: "Overview" }, { href: "/admin/buildings", label: "Buildings" }, { href: "/admin/flats", label: "Flats/Apartments" },
      { href: "/admin/users", label: "Standard Users" }, { href: "/admin/staff", label: "Staff Users" }, { href: "/admin/gas-billing-form", label: "Gas Billing Form" }, { href: "/admin/gas-billing-history", label: "Gas Billing History" }, { href: "/admin/config", label: "Configuration" },
    ]}>
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
          <input className="rounded-md border border-zinc-300 p-2" placeholder="Gas Unit Name" value={gasUnitName} onChange={(e) => setGasUnitName(e.target.value)} required />
          <input type="number" step="0.01" className="rounded-md border border-zinc-300 p-2" placeholder="Gas Unit Price" value={gasUnitPrice} onChange={(e) => setGasUnitPrice(Number(e.target.value))} required />
          <button className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white md:col-span-2">Save Configuration</button>
        </form>
      </section>
    </AppShell>
  );
}
