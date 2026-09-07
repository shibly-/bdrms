"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { BillingRatesHeader } from "@/components/billing-rates-header";
import { STAFF_NAV } from "@/lib/staff-nav";
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

type Building = { id: number; name: string; buildingNo: string | null };
type Flat = { id: number; flatNo: string; buildingId: number };
type FlatContext = {
  standardUserId: number;
  buildingId: number;
  buildingNo: string | null;
  buildingName: string | null;
  flatId: number;
  flatNo: string | null;
  userName: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  gasMeterNo: string;
  previousReading: number;
  unitPrice: number;
  operatingCostPerFlat: number;
};

export default function StaffBillEntryPage() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [flats, setFlats] = useState<Flat[]>([]);
  const [buildingId, setBuildingId] = useState<number | "">("");
  const [flatId, setFlatId] = useState<number | "">("");
  const [ctx, setCtx] = useState<FlatContext | null>(null);
  const [readingDate, setReadingDate] = useState(new Date().toISOString().slice(0, 10));
  const [currentReading, setCurrentReading] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    void adminFetch<Building[]>("/auth/buildings")
      .then(setBuildings)
      .catch((e) => setErr(e instanceof Error ? e.message : "Failed to load buildings."));
  }, []);

  useEffect(() => {
    setCtx(null);
    setCurrentReading("");
    setFlatId("");
    if (!buildingId) {
      setFlats([]);
      return;
    }
    void adminFetch<Flat[]>(`/auth/buildings/${buildingId}/flats`)
      .then(setFlats)
      .catch(() => setFlats([]));
  }, [buildingId]);

  useEffect(() => {
    if (!flatId) {
      setCurrentReading("");
      return;
    }
    void adminFetch<FlatContext>(`/billing/flat-context?flatId=${flatId}`)
      .then((data) => {
        setCtx(data);
        setCurrentReading(String(data.previousReading ?? 0));
      })
      .catch((e) => {
        setCtx(null);
        setCurrentReading("");
        setErr(e instanceof Error ? e.message : "Failed to load user details for flat.");
      });
  }, [flatId]);

  const previousReading = ctx?.previousReading ?? 0;
  const unitPrice = ctx?.unitPrice ?? 0;
  const operatingCostPerFlat = ctx?.operatingCostPerFlat ?? 0;
  const currentNumeric = Number(currentReading || "0");
  const readingIncreased = Number.isFinite(currentNumeric) && currentNumeric > previousReading;
  const usageQuantity = useMemo(() => Math.max(0, currentNumeric - previousReading), [currentNumeric, previousReading]);
  const usageQuantityKg = useMemo(() => usageQuantity * 1.8315, [usageQuantity]);
  const totalBill = useMemo(() => usageQuantityKg * unitPrice + operatingCostPerFlat, [usageQuantityKg, unitPrice, operatingCostPerFlat]);

  async function submitBill(e: FormEvent) {
    e.preventDefault();
    if (!flatId || busy) return;
    if (!readingIncreased) {
      setErr("Current reading must be greater than previous reading.");
      setMsg("");
      return;
    }
    try {
      setBusy(true);
      setErr("");
      setMsg("");
      const created = await adminFetch<{ billId: number }>("/billing/generate", {
        method: "POST",
        body: JSON.stringify({
          flatId,
          billingDate: readingDate,
          currentReading: currentNumeric,
        }),
      });
      setMsg(`Gas bill created successfully. Bill ID: ${created.billId}`);
      const refreshed = await adminFetch<FlatContext>(`/billing/flat-context?flatId=${flatId}`);
      setCtx(refreshed);
      setCurrentReading(String(refreshed.previousReading ?? 0));
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Failed to create gas bill.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell
      title="Bill Entry"
      subtitle="Generate gas bills for a selected building and flat."
      menu={STAFF_NAV}
      headerExtra={<BillingRatesHeader buildingId={buildingId} />}
      compact
    >
      {err ? <section className={billingAlertErr}>{err}</section> : null}
      {msg ? <section className={billingAlertOk}>{msg}</section> : null}
      <section className={billingSection}>
        <h2 className={billingH2}>Bill Entry</h2>
        <form className="grid gap-2 md:grid-cols-3" onSubmit={submitBill}>
          <label className={billingLabel}>Building No
            <select className={billingInput} value={buildingId} onChange={(e) => setBuildingId(Number(e.target.value) || "")} required>
              <option value="">Select Building</option>
              {buildings.map((b) => <option key={b.id} value={b.id}>{b.buildingNo ? `${b.buildingNo} (${b.name})` : b.name}</option>)}
            </select>
          </label>
          <label className={billingLabel}>Flat No
            <select className={billingInput} value={flatId} onChange={(e) => setFlatId(Number(e.target.value) || "")} required>
              <option value="">Select Flat</option>
              {flats.map((f) => <option key={f.id} value={f.id}>{f.flatNo}</option>)}
            </select>
          </label>
          <label className={billingLabel}>User Name<input className={billingInputReadonly} value={ctx?.userName ?? ""} readOnly /></label>
          <label className={billingLabel}>Full Name<input className={billingInputReadonly} value={ctx?.fullName ?? ""} readOnly /></label>
          <label className={billingLabel}>Phone No<input className={billingInputReadonly} value={ctx?.phone ?? ""} readOnly /></label>
          <label className={billingLabel}>Email<input className={billingInputReadonly} value={ctx?.email ?? ""} readOnly /></label>
          <label className={billingLabel}>Gas Meter No<input className={billingInputReadonly} value={ctx?.gasMeterNo ?? ""} readOnly /></label>
          <label className={billingLabel}>Gas Meter Reading Date<input type="date" className={billingInput} value={readingDate} onChange={(e) => setReadingDate(e.target.value)} required /></label>
          <label className={billingLabel}>Previous Reading (m³)<input className={billingInputReadonly} value={previousReading} readOnly /></label>
          <label className={billingLabel}>Current Reading (m³)<input type="number" step="0.001" min={previousReading} className={billingInput} value={currentReading} onChange={(e) => setCurrentReading(e.target.value)} required /></label>
          <label className={billingLabel}>Usage Quantity (m³)<input className={billingInputReadonly} value={usageQuantity.toFixed(3)} readOnly /></label>
          <label className={billingLabel}>Usage Quantity (kg)<input className={billingInputReadonly} value={usageQuantityKg.toFixed(3)} readOnly /></label>
          <label className={billingLabel}>Operating Cost Per Flat<input className={billingInputReadonly} value={operatingCostPerFlat.toFixed(2)} readOnly /></label>
          <label className={billingLabel}>Total Bill<input className={billingInputReadonly} value={totalBill.toFixed(2)} readOnly /></label>
          <button className={`${billingButton} md:col-span-3`} disabled={busy || !readingIncreased}>
            {busy ? "Generating…" : "Generate Bill"}
          </button>
        </form>
      </section>
    </AppShell>
  );
}
