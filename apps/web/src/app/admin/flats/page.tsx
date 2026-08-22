"use client";

import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useUserRole } from "@/hooks/use-user-role";
import { adminFetch } from "@/lib/admin-client";
import { getAdminNavForRole } from "@/lib/admin-nav";

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
        <div className="mb-4 flex flex-wrap gap-2 border-b border-zinc-200 pb-3 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => setActiveTab("list")}
            className={`rounded-md px-3 py-1.5 text-sm ${activeTab === "list" ? "bg-zinc-900 text-white" : "border border-zinc-300 text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"}`}
          >
            Flat List
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("form")}
            className={`rounded-md px-3 py-1.5 text-sm ${activeTab === "form" ? "bg-zinc-900 text-white" : "border border-zinc-300 text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"}`}
          >
            Add Flat/Apartment
          </button>
        </div>

        {activeTab === "list" ? (
          <>
            <h2 className="mb-4 font-semibold">Flat List</h2>
            <label className="mb-3 block text-sm text-zinc-700 dark:text-zinc-300">
              Building
              <select
                className="mt-1 w-full rounded-md border border-zinc-300 p-2 md:max-w-sm"
                value={listBuildingId}
                onChange={(e) => setListBuildingId(Number(e.target.value) || "")}
              >
                <option value="">Select Building</option>
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </label>
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left">
                  <th>
                    <button type="button" onClick={() => toggleSort("flatNo")} className="font-semibold">
                      Flat No{sortMark("flatNo")}
                    </button>
                  </th>
                  <th>
                    <button type="button" onClick={() => toggleSort("buildingName")} className="font-semibold">
                      Building{sortMark("buildingName")}
                    </button>
                  </th>
                  <th className="w-[140px]" />
                </tr>
              </thead>
              <tbody>
                {!listBuildingId ? (
                  <tr className="border-b border-zinc-100">
                    <td className="py-3 text-zinc-500" colSpan={3}>
                      Select a building to view flats.
                    </td>
                  </tr>
                ) : null}
                {sortedFlats.map((f) => (
                  <tr key={f.id} className="border-b border-zinc-100">
                    <td className="py-2">{f.flatNo}</td>
                    <td>{f.buildingName}</td>
                    <td>
                      <div className="flex gap-3">
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
            <h2 className="mb-4 font-semibold">
              {editingId === null ? "Add Flat/Apartment" : "Edit Flat/Apartment"}
            </h2>
            <form className="grid gap-3 md:grid-cols-2" onSubmit={submitFlat}>
              <input className="rounded-md border border-zinc-300 p-2" placeholder="Flat/Apartment No" value={flatNo} onChange={(e) => setFlatNo(e.target.value)} required />
              <select className="rounded-md border border-zinc-300 p-2" value={buildingId} onChange={(e) => setBuildingId(Number(e.target.value))} required>
                {buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              {editingId === null ? (
                <button className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white md:col-span-2">
                  Save Flat
                </button>
              ) : (
                <div className="md:col-span-2 flex gap-3">
                  <button className="flex-1 rounded-md bg-zinc-900 px-4 py-2 text-sm text-white">
                    Update Flat
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="rounded-md border border-zinc-300 px-4 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
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
