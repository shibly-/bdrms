"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Tesseract from "tesseract.js";
import { AppShell } from "@/components/app-shell";
import { adminFetch } from "@/lib/admin-client";
import { compressMeterImageToDataUrl } from "@/lib/meter-image";

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

export default function GasBillingFormPage() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [flats, setFlats] = useState<Flat[]>([]);
  const [buildingId, setBuildingId] = useState<number | "">("");
  const [flatId, setFlatId] = useState<number | "">("");
  const [ctx, setCtx] = useState<FlatContext | null>(null);
  const [readingDate, setReadingDate] = useState(new Date().toISOString().slice(0, 10));
  const [currentReading, setCurrentReading] = useState<string>("");
  /** JPEG data URL persisted with the bill; also used for preview */
  const [meterImageDataUrl, setMeterImageDataUrl] = useState<string>("");
  const [scanBusy, setScanBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    void adminFetch<Building[]>("/admin/buildings")
      .then((data) => {
        setBuildings(data);
      })
      .catch((e) => setErr(e instanceof Error ? e.message : "Failed to load buildings."));
  }, []);

  useEffect(() => {
    setCtx(null);
    setCurrentReading("");
    setFlatId("");
    setMeterImageDataUrl("");
    if (!buildingId) {
      setFlats([]);
      return;
    }
    void adminFetch<Flat[]>(`/auth/buildings/${buildingId}/flats`)
      .then((data) => {
        setFlats(data);
      })
      .catch(() => setFlats([]));
  }, [buildingId]);

  useEffect(() => {
    setMeterImageDataUrl("");
    if (!flatId) return;
    void adminFetch<FlatContext>(`/billing/flat-context?flatId=${flatId}`)
      .then((data) => {
        setCtx(data);
      })
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
      const dataUrl = await compressMeterImageToDataUrl(file);
      setMeterImageDataUrl(dataUrl);
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
      const created = await adminFetch<{ billId: number; totalBill: number }>("/billing/generate", {
        method: "POST",
        body: JSON.stringify({
          flatId,
          billingDate: readingDate,
          currentReading: currentNumeric,
          ocrImageUrl: meterImageDataUrl || undefined,
        }),
      });
      setMsg(`Gas bill created successfully. Bill ID: ${created.billId}`);
      setCurrentReading("");
      setMeterImageDataUrl("");
      const refreshed = await adminFetch<FlatContext>(`/billing/flat-context?flatId=${flatId}`);
      setCtx(refreshed);
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Failed to create gas bill.");
    }
  }

  return (
    <AppShell title="Gas Billing Form" subtitle="Generate gas bills with scanner-assisted current reading." menu={[
      { href: "/admin", label: "Overview" },
      { href: "/admin/buildings", label: "Buildings" },
      { href: "/admin/flats", label: "Flats/Apartments" },
      { href: "/admin/users", label: "Standard Users" },
      { href: "/admin/staff", label: "Staff Users" },
      { href: "/admin/gas-billing-form", label: "Gas Billing Form" },
      { href: "/admin/gas-billing-history", label: "Gas Billing History" },
      { href: "/admin/config", label: "Configuration" },
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
        <h2 className="mb-4 font-semibold">Gas Billing Form</h2>
        <form className="grid gap-3 md:grid-cols-2" onSubmit={submitBill}>
          <label className="text-sm text-zinc-700 dark:text-zinc-300">
            Building No
            <select className="mt-1 w-full rounded-md border border-zinc-300 p-2" value={buildingId} onChange={(e) => setBuildingId(Number(e.target.value) || "")} required>
              <option value="">Select Building</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.buildingNo ? `${b.buildingNo} (${b.name})` : b.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-zinc-700 dark:text-zinc-300">
            Flat No
            <select className="mt-1 w-full rounded-md border border-zinc-300 p-2" value={flatId} onChange={(e) => setFlatId(Number(e.target.value) || "")} required>
              <option value="">Select Flat</option>
              {flats.map((f) => (
                <option key={f.id} value={f.id}>{f.flatNo}</option>
              ))}
            </select>
          </label>

          <label className="text-sm text-zinc-700 dark:text-zinc-300">User Name<input className="mt-1 w-full rounded-md border border-zinc-300 bg-zinc-50 p-2" value={ctx?.userName ?? ""} readOnly /></label>
          <label className="text-sm text-zinc-700 dark:text-zinc-300">Full Name<input className="mt-1 w-full rounded-md border border-zinc-300 bg-zinc-50 p-2" value={ctx?.fullName ?? ""} readOnly /></label>
          <label className="text-sm text-zinc-700 dark:text-zinc-300">Phone No<input className="mt-1 w-full rounded-md border border-zinc-300 bg-zinc-50 p-2" value={ctx?.phone ?? ""} readOnly /></label>
          <label className="text-sm text-zinc-700 dark:text-zinc-300">Email<input className="mt-1 w-full rounded-md border border-zinc-300 bg-zinc-50 p-2" value={ctx?.email ?? ""} readOnly /></label>
          <label className="text-sm text-zinc-700 dark:text-zinc-300">Gas Meter No<input className="mt-1 w-full rounded-md border border-zinc-300 bg-zinc-50 p-2" value={ctx?.gasMeterNo ?? ""} readOnly /></label>
          <label className="text-sm text-zinc-700 dark:text-zinc-300">Gas Meter Reading Date<input type="date" className="mt-1 w-full rounded-md border border-zinc-300 p-2" value={readingDate} onChange={(e) => setReadingDate(e.target.value)} required /></label>
          <label className="text-sm text-zinc-700 dark:text-zinc-300">Previous Reading (m³)<input className="mt-1 w-full rounded-md border border-zinc-300 bg-zinc-50 p-2" value={previousReading} readOnly /></label>
          <label className="text-sm text-zinc-700 dark:text-zinc-300">Current Reading (m³)
            <input
              type="number"
              step="0.001"
              min="0"
              className="mt-1 w-full rounded-md border border-zinc-300 p-2"
              value={currentReading}
              onChange={(e) => setCurrentReading(e.target.value)}
              required
            />
          </label>
          <label className="text-sm text-zinc-700 dark:text-zinc-300">Usage Quantity (m³)<input className="mt-1 w-full rounded-md border border-zinc-300 bg-zinc-50 p-2" value={usageQuantity.toFixed(3)} readOnly /></label>
          <label className="text-sm text-zinc-700 dark:text-zinc-300">Usage Quantity (kg)<input className="mt-1 w-full rounded-md border border-zinc-300 bg-zinc-50 p-2" value={usageQuantityKg.toFixed(3)} readOnly /></label>
          <label className="text-sm text-zinc-700 dark:text-zinc-300">Total Bill<input className="mt-1 w-full rounded-md border border-zinc-300 bg-zinc-50 p-2" value={totalBill.toFixed(2)} readOnly /></label>

          <label className="md:col-span-2 rounded-md border border-zinc-300 p-3 text-sm text-zinc-700 dark:border-zinc-700 dark:text-zinc-300">
            Capture Meter Image (Camera) / Upload Image
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="mt-2 block w-full"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void scanFromImage(file);
              }}
            />
            <span className="mt-1 block text-xs text-zinc-500">
              Captured image is scanned to fill Current Reading. The same image is stored with the bill for future reference (billing history).
            </span>
            {meterImageDataUrl ? (
              <img src={meterImageDataUrl} alt="Captured gas meter" className="mt-2 h-28 max-w-full rounded-md border border-zinc-300 object-contain" />
            ) : null}
            {scanBusy ? <span className="mt-1 block text-xs">Scanning image and reading meter digits...</span> : null}
          </label>

          <button className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white md:col-span-2" disabled={scanBusy}>
            Generate Bill
          </button>
        </form>
      </section>
    </AppShell>
  );
}
