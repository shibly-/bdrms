"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { adminFetch } from "@/lib/admin-client";
import { USER_NAV } from "@/lib/user-nav";

export default function UserPage() {
  const [unitName, setUnitName] = useState("Gas Unit");
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [operatingCostPerFlat, setOperatingCostPerFlat] = useState<number>(0);
  const [err, setErr] = useState("");

  useEffect(() => {
    void adminFetch<{ gasUnitName: string; gasUnitPrice: number; operatingCostPerFlat: number }>("/billing/unit-config")
      .then((data) => {
        setUnitName(data.gasUnitName || "Gas Unit");
        setUnitPrice(Number(data.gasUnitPrice || 0));
        setOperatingCostPerFlat(Number(data.operatingCostPerFlat || 0));
      })
      .catch((e) => setErr(e instanceof Error ? e.message : "Failed to load gas unit price."));
  }, []);

  return (
    <AppShell
      title="PRRMS - LPG Gas Billing System"
      subtitle="Check your current gas bill and previous billing history..."
      menu={USER_NAV}
    >
      {err ? (
        <section className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-200">
          {err}
        </section>
      ) : null}
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="font-semibold">LPG Gas Billing Details</h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
          Gas consumption measured in cubic meters (m3) is converted to kilograms (kg) to determine total costs. <b>Note: 1 m3 == 1.8315 kg</b>
        </p>        
        <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200">
          Current {unitName} Price: <span className="font-semibold">{unitPrice.toFixed(2)}</span>
        </div>
        <div className="mt-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200">
          Operating Cost Per Flat: <span className="font-semibold">{operatingCostPerFlat.toFixed(2)}</span>
        </div>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300"></p>
      </section>
    </AppShell>
  );
}
