"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-client";
import { formatMoney } from "@/lib/format";

const KG_PER_M3 = 1.8315;

type UnitConfig = {
  gasUnitPrice: number;
  operatingCostPerFlat: number;
};

function RateCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-950">
      <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      <p className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
        {value}
      </p>
    </div>
  );
}

type Props = {
  buildingId?: number | "" | null;
};

export function BillingRatesHeader({ buildingId }: Props) {
  const [config, setConfig] = useState<UnitConfig | null>(null);
  const selectedId =
    typeof buildingId === "number" && buildingId >= 1 ? buildingId : null;

  useEffect(() => {
    if (!selectedId) {
      setConfig(null);
      return;
    }
    let cancelled = false;
    void adminFetch<UnitConfig>(`/billing/unit-config?buildingId=${selectedId}`)
      .then((data) => {
        if (cancelled) return;
        setConfig({
          gasUnitPrice: Number(data.gasUnitPrice || 0),
          operatingCostPerFlat: Number(data.operatingCostPerFlat || 0),
        });
      })
      .catch(() => {
        if (!cancelled) setConfig(null);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const priceKg = config?.gasUnitPrice ?? null;
  const operating = config?.operatingCostPerFlat ?? null;
  const priceM3 =
    priceKg == null ? null : Number((priceKg * KG_PER_M3).toFixed(2));

  return (
    <div className="mt-2 grid gap-1.5 sm:grid-cols-3">
      <RateCard
        label="Gas Price Per KG"
        value={priceKg == null ? "—" : formatMoney(priceKg)}
      />
      <RateCard
        label="Gas Price Per m³"
        value={priceM3 == null ? "—" : formatMoney(priceM3)}
      />
      <RateCard
        label="Operating Cost Per Flat"
        value={operating == null ? "—" : formatMoney(operating)}
      />
    </div>
  );
}
