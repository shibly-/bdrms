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
  billingSection,
} from "@/lib/billing-ui";

type Building = {
  id: number;
  name: string;
  buildingNo: string | null;
  address1: string;
  address2: string;
  postCode: string;
  isActive?: number;
};

export default function BuildingsPage() {
  const role = useUserRole();
  const [rows, setRows] = useState<Building[]>([]);
  const [form, setForm] = useState({
    name: "",
    buildingNo: "",
    address1: "",
    address2: "",
    postCode: "",
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [sortKey, setSortKey] = useState<"name" | "buildingNo" | "postCode">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function load() {
    try {
      setRows(await adminFetch<Building[]>("/admin/buildings"));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load buildings.");
    }
  }
  useEffect(() => {
    void load();
  }, []);

  function startEdit(b: Building) {
    setErr("");
    setMsg("");
    setEditingId(b.id);
    setForm({
      name: b.name,
      buildingNo: b.buildingNo ?? "",
      address1: b.address1,
      address2: b.address2,
      postCode: b.postCode,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setErr("");
    setMsg("");
    setForm({ name: "", buildingNo: "", address1: "", address2: "", postCode: "" });
  }

  async function submitBuilding(e: FormEvent) {
    e.preventDefault();
    setErr("");
    setMsg("");
    try {
      if (editingId !== null) {
        const ok = window.confirm(
          `Update building "${form.name || "this building"}"?`,
        );
        if (!ok) return;
        await adminFetch(`/admin/buildings/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(form),
        });
        setMsg("Building updated.");
        setEditingId(null);
        setForm({ name: "", buildingNo: "", address1: "", address2: "", postCode: "" });
        await load();
        return;
      }

      await adminFetch("/admin/buildings", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setMsg("Building saved.");
      setForm({ name: "", buildingNo: "", address1: "", address2: "", postCode: "" });
      await load();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Failed to save building.");
    }
  }

  async function toggleActive(b: Building) {
    if (editingId === b.id) cancelEdit();
    const nextActive = Number(b.isActive) === 1 ? 0 : 1;
    const label = nextActive === 1 ? "enable" : "disable";
    const ok = window.confirm(
      `Are you sure you want to ${label} building "${b.name}"? The record will remain in the database.`,
    );
    if (!ok) return;
    try {
      await adminFetch(`/admin/buildings/${b.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: nextActive }),
      });
      setMsg(`Building ${nextActive === 1 ? "enabled" : "disabled"}.`);
      await load();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Failed to update building status.");
    }
  }

  function toggleSort(next: "name" | "buildingNo" | "postCode") {
    if (sortKey === next) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(next);
    setSortDir("asc");
  }

  const sortedRows = [...rows].sort((a, b) => {
    const av = String(a[sortKey] ?? "");
    const bv = String(b[sortKey] ?? "");
    const cmp = av.localeCompare(bv);
    return sortDir === "asc" ? cmp : -cmp;
  });

  return (
    <AppShell
      title="Building Management"
      subtitle="Only admin can create and manage buildings."
      menu={getAdminNavForRole(role)}
      compact
    >
      {err ? <section className={billingAlertErr}>{err}</section> : null}
      {msg ? <section className={billingAlertOk}>{msg}</section> : null}

      <section className={billingSection}>
        <h2 className={billingH2}>{editingId === null ? "Add Building" : "Edit Building"}</h2>
        <form className="grid gap-2 md:grid-cols-3" onSubmit={submitBuilding}>
          <input className={billingInput} placeholder="Building Name" value={form.name} onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))} required />
          <input className={billingInput} placeholder="Building No (Optional)" value={form.buildingNo} onChange={(e) => setForm((v) => ({ ...v, buildingNo: e.target.value }))} />
          <input className={billingInput} placeholder="Post Code" value={form.postCode} onChange={(e) => setForm((v) => ({ ...v, postCode: e.target.value }))} required />
          <input className={billingInput} placeholder="Address-1" value={form.address1} onChange={(e) => setForm((v) => ({ ...v, address1: e.target.value }))} required />
          <input className={`${billingInput} md:col-span-2`} placeholder="Address-2" value={form.address2} onChange={(e) => setForm((v) => ({ ...v, address2: e.target.value }))} required />
          {editingId === null ? (
            <button className={`${billingButton} md:col-span-3`}>
              Save Building
            </button>
          ) : (
            <div className="flex gap-2 md:col-span-3">
              <button className={`${billingButton} flex-1`}>
                Update Building
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
      </section>

      <section className={billingSection}>
        <h2 className={billingH2}>Building List</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-200 text-left">
                <th className="py-1.5 pr-2"><button onClick={() => toggleSort("name")} className="font-semibold">Name</button></th>
                <th className="py-1.5 pr-2"><button onClick={() => toggleSort("buildingNo")} className="font-semibold">No</button></th>
                <th className="py-1.5 pr-2">Address</th>
                <th className="py-1.5 pr-2"><button onClick={() => toggleSort("postCode")} className="font-semibold">Post Code</button></th>
                <th className="py-1.5 pr-2">Status</th>
                <th className="w-[140px] py-1.5" />
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((b) => (
                <tr key={b.id} className="border-b border-zinc-100">
                  <td className="py-1.5 pr-2">{b.name}</td>
                  <td className="py-1.5 pr-2">{b.buildingNo ?? "-"}</td>
                  <td className="py-1.5 pr-2">{b.address1}, {b.address2}</td>
                  <td className="py-1.5 pr-2">{b.postCode}</td>
                  <td className="py-1.5 pr-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        Number(b.isActive) === 1
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                          : "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                      }`}
                    >
                      {Number(b.isActive) === 1 ? "Enabled" : "Disabled"}
                    </span>
                  </td>
                  <td className="py-1.5">
                    <div className="flex gap-2">
                      <button
                        className="text-blue-600"
                        onClick={() => startEdit(b)}
                      >
                        Edit
                      </button>
                      <button
                        className={
                          Number(b.isActive) === 1 ? "text-amber-700" : "text-emerald-700"
                        }
                        onClick={() => void toggleActive(b)}
                      >
                        {Number(b.isActive) === 1 ? "Disable" : "Enable"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
