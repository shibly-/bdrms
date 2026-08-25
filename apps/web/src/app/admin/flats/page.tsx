"use client";

import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useUserRole } from "@/hooks/use-user-role";
import { adminFetch } from "@/lib/admin-client";
import { getAdminNavForRole } from "@/lib/admin-nav";
import {
  billingAlertErr,
  billingAlertOk,
  billingButton,
  billingH2,
  billingInput,
  billingLabel,
  billingSection,
  compactTab,
  compactTabActive,
  compactTabIdle,
} from "@/lib/billing-ui";

type Building = { id: number; name: string };
type Flat = { id: number; flatNo: string; buildingId: number; buildingName: string };

export default function FlatsPage() {
  const role = useUserRole();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [flats, setFlats] = useState<Flat[]>([]);
  const [activeTab, setActiveTab] = useState<"list" | "form">("list");
  const [listBuildingId, setListBuildingId] = useState<number | "">("");
  const [flatNo, setFlatNo] = useState("");
  const [buildingId, setBuildingId] = useState<number | "">("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [sortKey, setSortKey] = useState<"flatNo" | "buildingName">("flatNo");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function load() {
    try {
      const [bs, fs] = await Promise.all([
        adminFetch<Building[]>("/admin/buildings"),
        adminFetch<Flat[]>("/admin/flats"),
      ]);
      setBuildings(bs);
      setFlats(fs);
      if (!buildingId && bs.length > 0) setBuildingId(bs[0].id);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Load failed.");
    }
  }
  useEffect(() => { void load(); }, []);

  function startEdit(flat: Flat) {
    setErr("");
    setMsg("");
    setEditingId(flat.id);
    setFlatNo(flat.flatNo);
    setBuildingId(flat.buildingId);
    setActiveTab("form");
  }

  function cancelEdit() {
    setEditingId(null);
    setFlatNo("");
    setErr("");
    setMsg("");
  }

  async function submitFlat(e: FormEvent) {
    e.preventDefault();
    if (!buildingId) return;
    try {
      if (editingId !== null) {
        const ok = window.confirm(
          `Update flat "${flatNo || "this flat"}"?`,
        );
        if (!ok) return;
        await adminFetch(`/admin/flats/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify({ flatNo, buildingId }),
        });
        setMsg("Flat updated.");
        setEditingId(null);
        setFlatNo("");
        await load();
        return;
      }
      await adminFetch("/admin/flats", {
        method: "POST",
        body: JSON.stringify({ flatNo, buildingId }),
      });
      setMsg("Flat saved.");
      setFlatNo("");
      await load();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Create failed.");
    }
  }

  async function removeFlat(id: number) {
    const ok = window.confirm(
      "Are you sure you want to delete this flat/apartment? This action cannot be undone.",
    );
    if (!ok) return;
    if (editingId === id) cancelEdit();
    try {
      await adminFetch(`/admin/flats/${id}`, { method: "DELETE" });
      await load();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Delete failed.");
    }
  }

  function toggleSort(next: "flatNo" | "buildingName") {
    if (sortKey === next) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(next);
    setSortDir("asc");
  }

  const listRows = listBuildingId
    ? flats.filter((f) => f.buildingId === listBuildingId)
    : [];

  const sortedFlats = [...listRows].sort((a, b) => {
    const cmp = String(a[sortKey] ?? "").localeCompare(String(b[sortKey] ?? ""));
    return sortDir === "asc" ? cmp : -cmp;
  });

  function sortMark(key: "flatNo" | "buildingName") {
    if (sortKey !== key) return "";
    return sortDir === "asc" ? " ▲" : " ▼";
  }

  return (
    <AppShell
      title="Flat/Apartment Management"
      subtitle="Only admin can create and manage flats/apartments."
      menu={getAdminNavForRole(role)}
      compact
    >
      {err ? <section className={billingAlertErr}>{err}</section> : null}
      {msg ? <section className={billingAlertOk}>{msg}</section> : null}
      <section className={billingSection}>
        <div className="mb-2 flex flex-wrap gap-1.5 border-b border-zinc-200 pb-2 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => setActiveTab("list")}
            className={`${compactTab} ${activeTab === "list" ? compactTabActive : compactTabIdle}`}
          >
            Flat List
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("form")}
            className={`${compactTab} ${activeTab === "form" ? compactTabActive : compactTabIdle}`}
          >
            Add Flat/Apartment
          </button>
        </div>

        {activeTab === "list" ? (
          <>
            <h2 className={billingH2}>Flat List</h2>
            <label className={`${billingLabel} mb-2 block md:max-w-sm`}>
              Building
              <select
                className={billingInput}
                value={listBuildingId}
                onChange={(e) => setListBuildingId(Number(e.target.value) || "")}
              >
                <option value="">Select Building</option>
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </label>
            <table className="min-w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-200 text-left">
                  <th className="py-1.5 pr-2">
                    <button type="button" onClick={() => toggleSort("flatNo")} className="font-semibold">
                      Flat No{sortMark("flatNo")}
                    </button>
                  </th>
                  <th className="py-1.5 pr-2">
                    <button type="button" onClick={() => toggleSort("buildingName")} className="font-semibold">
                      Building{sortMark("buildingName")}
                    </button>
                  </th>
                  <th className="w-[140px] py-1.5" />
                </tr>
              </thead>
              <tbody>
                {!listBuildingId ? (
                  <tr className="border-b border-zinc-100">
                    <td className="py-2 text-zinc-500" colSpan={3}>
                      Select a building to view flats.
                    </td>
                  </tr>
                ) : null}
                {sortedFlats.map((f) => (
                  <tr key={f.id} className="border-b border-zinc-100">
                    <td className="py-1.5 pr-2">{f.flatNo}</td>
                    <td className="py-1.5 pr-2">{f.buildingName}</td>
                    <td className="py-1.5">
                      <div className="flex gap-2">
                        <button className="text-blue-600" onClick={() => startEdit(f)}>
                          Edit
                        </button>
                        <button
                          className="text-red-600"
                          onClick={() => void removeFlat(f.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : null}

        {activeTab === "form" ? (
          <>
            <h2 className={billingH2}>
              {editingId === null ? "Add Flat/Apartment" : "Edit Flat/Apartment"}
            </h2>
            <form className="grid gap-2 md:grid-cols-2" onSubmit={submitFlat}>
              <input className={billingInput} placeholder="Flat/Apartment No" value={flatNo} onChange={(e) => setFlatNo(e.target.value)} required />
              <select className={billingInput} value={buildingId} onChange={(e) => setBuildingId(Number(e.target.value))} required>
                {buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              {editingId === null ? (
                <button className={`${billingButton} md:col-span-2`}>
                  Save Flat
                </button>
              ) : (
                <div className="flex gap-2 md:col-span-2">
                  <button className={`${billingButton} flex-1`}>
                    Update Flat
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="rounded border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </form>
          </>
        ) : null}
      </section>
    </AppShell>
  );
}
