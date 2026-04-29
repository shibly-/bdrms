"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Tesseract from "tesseract.js";
import { AppShell } from "@/components/app-shell";
import { adminFetch } from "@/lib/admin-client";

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
};

export default function StaffGasBillingFormPage() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [flats, setFlats] = useState<Flat[]>([]);
  const [buildingId, setBuildingId] = useState<number | "">("");
  const [flatId, setFlatId] = useState<number | "">("");
  const [ctx, setCtx] = useState<FlatContext | null>(null);
  const [readingDate, setReadingDate] = useState(new Date().toISOString().slice(0, 10));
  const [currentReading, setCurrentReading] = useState<string>("");
  const [scanImageUrl, setScanImageUrl] = useState<string>("");
  const [scanBusy, setScanBusy] = useState(false);
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
    if (!flatId) return;
    void adminFetch<FlatContext>(`/billing/flat-context?flatId=${flatId}`)
      .then(setCtx)
      .catch((e) => {
        setCtx(null);
        setErr(e instanceof Error ? e.message : "Failed to load user details for flat.");
      });
  }, [flatId]);

  const previousReading = ctx?.previousReading ?? 0;
  const unitPrice = ctx?.unitPrice ?? 0;
  const currentNumeric = Number(currentReading || "0");
  const usageQuantity = useMemo(() => Math.max(0, currentNumeric - previousReading), [currentNumeric, previousReading]);
  const usageQuantityKg = useMemo(() => usageQuantity * 1.8315, [usageQuantity]);
  const totalBill = useMemo(() => usageQuantityKg * unitPrice, [usageQuantityKg, unitPrice]);

  async function scanFromImage(file: File) {
    setScanBusy(true);
    setErr("");
    setMsg("");
    try {
      const imageUrl = URL.createObjectURL(file);
      setScanImageUrl(imageUrl);
      const result = await Tesseract.recognize(file, "eng");
      const text = result.data.text ?? "";
      const matches = text.match(/\d+(?:\.\d+)?/g);
      if (!matches || matches.length === 0) {
        setErr("No meter digits detected. Please enter Current Reading manually.");
        return;
      }
      setCurrentReading(matches[matches.length - 1]);
      setMsg("Current Reading populated from scanned image. You can still edit it.");
    } catch {
      setErr("Image scan failed. Please enter Current Reading manually.");
    } finally {
      setScanBusy(false);
    }
  }

  async function submitBill(e: FormEvent) {
    e.preventDefault();
    if (!flatId) return;
    try {
      setErr("");
      setMsg("");
      const created = await adminFetch<{ billId: number }>("/billing/generate", {
        method: "POST",
        body: JSON.stringify({
          flatId,
          billingDate: readingDate,
          currentReading: currentNumeric,
          ocrImageUrl: scanImageUrl || undefined,
        }),
      });
      setMsg(`Gas bill created successfully. Bill ID: ${created.billId}`);
      setCurrentReading("");
      const refreshed = await adminFetch<FlatContext>(`/billing/flat-context?flatId=${flatId}`);
      setCtx(refreshed);
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Failed to create gas bill.");
    }
  }

  return (
    <AppShell
      title="Gas Billing Form"
      subtitle="Staff form for generating gas bills with scanner-assisted current reading."
      menu={[
        { href: "/staff", label: "Overview" },
        { href: "/staff/profile", label: "Profile" },
        { href: "/staff/gas-billing-form", label: "Gas Billing Form" },
        { href: "/staff/gas-billing-history", label: "Gas Billing History" },
      ]}
    >
      {err ? <section className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{err}</section> : null}
      {msg ? <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{msg}</section> : null}
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-semibold">Gas Billing Form</h2>
        <form className="grid gap-3 md:grid-cols-2" onSubmit={submitBill}>
          <label className="text-sm text-zinc-700">Building No
            <select className="mt-1 w-full rounded-md border border-zinc-300 p-2" value={buildingId} onChange={(e) => setBuildingId(Number(e.target.value) || "")} required>
              <option value="">Select Building</option>
              {buildings.map((b) => <option key={b.id} value={b.id}>{b.buildingNo ? `${b.buildingNo} (${b.name})` : b.name}</option>)}
            </select>
          </label>
          <label className="text-sm text-zinc-700">Flat No
            <select className="mt-1 w-full rounded-md border border-zinc-300 p-2" value={flatId} onChange={(e) => setFlatId(Number(e.target.value) || "")} required>
              <option value="">Select Flat</option>
              {flats.map((f) => <option key={f.id} value={f.id}>{f.flatNo}</option>)}
            </select>
          </label>
          <label className="text-sm text-zinc-700">User Name<input className="mt-1 w-full rounded-md border border-zinc-300 bg-zinc-50 p-2" value={ctx?.userName ?? ""} readOnly /></label>
          <label className="text-sm text-zinc-700">Full Name<input className="mt-1 w-full rounded-md border border-zinc-300 bg-zinc-50 p-2" value={ctx?.fullName ?? ""} readOnly /></label>
          <label className="text-sm text-zinc-700">Phone No<input className="mt-1 w-full rounded-md border border-zinc-300 bg-zinc-50 p-2" value={ctx?.phone ?? ""} readOnly /></label>
          <label className="text-sm text-zinc-700">Email<input className="mt-1 w-full rounded-md border border-zinc-300 bg-zinc-50 p-2" value={ctx?.email ?? ""} readOnly /></label>
          <label className="text-sm text-zinc-700">Gas Meter No<input className="mt-1 w-full rounded-md border border-zinc-300 bg-zinc-50 p-2" value={ctx?.gasMeterNo ?? ""} readOnly /></label>
          <label className="text-sm text-zinc-700">Gas Meter Reading Date<input type="date" className="mt-1 w-full rounded-md border border-zinc-300 p-2" value={readingDate} onChange={(e) => setReadingDate(e.target.value)} required /></label>
          <label className="text-sm text-zinc-700">Previous Reading (m³)<input className="mt-1 w-full rounded-md border border-zinc-300 bg-zinc-50 p-2" value={previousReading} readOnly /></label>
          <label className="text-sm text-zinc-700">Current Reading (m³)<input type="number" step="0.001" min="0" className="mt-1 w-full rounded-md border border-zinc-300 p-2" value={currentReading} onChange={(e) => setCurrentReading(e.target.value)} required /></label>
          <label className="text-sm text-zinc-700">Usage Quantity (m³)<input className="mt-1 w-full rounded-md border border-zinc-300 bg-zinc-50 p-2" value={usageQuantity.toFixed(3)} readOnly /></label>
          <label className="text-sm text-zinc-700">Usage Quantity (kg)<input className="mt-1 w-full rounded-md border border-zinc-300 bg-zinc-50 p-2" value={usageQuantityKg.toFixed(3)} readOnly /></label>
          <label className="text-sm text-zinc-700">Total Bill<input className="mt-1 w-full rounded-md border border-zinc-300 bg-zinc-50 p-2" value={totalBill.toFixed(2)} readOnly /></label>
          <label className="md:col-span-2 rounded-md border border-zinc-300 p-3 text-sm text-zinc-700">
            Capture Meter Image (Camera) / Upload Image
            <input type="file" accept="image/*" capture="environment" className="mt-2 block w-full" onChange={(e) => { const file = e.target.files?.[0]; if (file) void scanFromImage(file); }} />
            {scanImageUrl ? <img src={scanImageUrl} alt="Captured gas meter" className="mt-2 h-28 rounded-md border border-zinc-300 object-cover" /> : null}
            {scanBusy ? <span className="mt-1 block text-xs">Scanning image and reading meter digits...</span> : null}
          </label>
          <button className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white md:col-span-2" disabled={scanBusy}>Generate Bill</button>
        </form>
      </section>
    </AppShell>
  );
}
