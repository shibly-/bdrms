"use client";

import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { adminFetch } from "@/lib/admin-client";

type Building = {
  id: number;
  name: string;
  buildingNo: string | null;
  address1: string;
  address2: string;
  postCode: string;
};

export default function BuildingsPage() {
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

  async function remove(id: number) {
    if (editingId === id) cancelEdit();
    const ok = window.confirm(
      "Are you sure you want to delete this building? This action cannot be undone.",
    );
    if (!ok) return;
    try {
      await adminFetch(`/admin/buildings/${id}`, { method: "DELETE" });
      await load();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Delete failed.");
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
      menu={[
        { href: "/admin", label: "Overview" },
        { href: "/admin/buildings", label: "Buildings" },
        { href: "/admin/flats", label: "Flats/Apartments" },
        { href: "/admin/users", label: "Standard Users" },
        { href: "/admin/staff", label: "Staff Users" },
        { href: "/admin/gas-billing-form", label: "Gas Billing Form" },
        { href: "/admin/gas-billing-history", label: "Gas Billing History" },
        { href: "/admin/config", label: "Configuration" },
      ]}
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
        <h2 className="mb-4 font-semibold">{editingId === null ? "Add Building" : "Edit Building"}</h2>
        <form className="grid gap-3 md:grid-cols-2" onSubmit={submitBuilding}>
          <input className="rounded-md border border-zinc-300 p-2" placeholder="Building Name" value={form.name} onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))} required />
          <input className="rounded-md border border-zinc-300 p-2" placeholder="Building No (Optional)" value={form.buildingNo} onChange={(e) => setForm((v) => ({ ...v, buildingNo: e.target.value }))} />
          <input className="rounded-md border border-zinc-300 p-2" placeholder="Address-1" value={form.address1} onChange={(e) => setForm((v) => ({ ...v, address1: e.target.value }))} required />
          <input className="rounded-md border border-zinc-300 p-2" placeholder="Address-2" value={form.address2} onChange={(e) => setForm((v) => ({ ...v, address2: e.target.value }))} required />
          <input className="rounded-md border border-zinc-300 p-2 md:col-span-2" placeholder="Post Code" value={form.postCode} onChange={(e) => setForm((v) => ({ ...v, postCode: e.target.value }))} required />
          {editingId === null ? (
            <button className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white md:col-span-2">
              Save Building
            </button>
          ) : (
            <div className="md:col-span-2 flex gap-3">
              <button className="flex-1 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white">
                Update Building
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
              >
                Cancel
              </button>
            </div>
          )}
        </form>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 font-semibold">Building List</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left">
                <th><button onClick={() => toggleSort("name")} className="font-semibold">Name</button></th>
                <th><button onClick={() => toggleSort("buildingNo")} className="font-semibold">No</button></th>
                <th>Address</th>
                <th><button onClick={() => toggleSort("postCode")} className="font-semibold">Post Code</button></th>
                <th className="w-[140px]" />
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((b) => (
                <tr key={b.id} className="border-b border-zinc-100">
                  <td className="py-2">{b.name}</td>
                  <td>{b.buildingNo ?? "-"}</td>
                  <td>{b.address1}, {b.address2}</td>
                  <td>{b.postCode}</td>
                  <td>
                    <div className="flex gap-3">
                      <button
                        className="text-blue-600"
                        onClick={() => startEdit(b)}
                      >
                        Edit
                      </button>
                      <button
                        className="text-red-600"
                        onClick={() => void remove(b.id)}
                      >
                        Delete
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
