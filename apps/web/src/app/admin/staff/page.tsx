"use client";

import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { adminFetch } from "@/lib/admin-client";

type StaffRow = { id: number; userName: string; fullName: string; profile?: { operationArea?: string | null } | null };

export default function StaffPage() {
  const [rows, setRows] = useState<StaffRow[]>([]);
  const [activeTab, setActiveTab] = useState<"list" | "form">("list");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [sortKey, setSortKey] = useState<"userName" | "fullName" | "operationArea">("userName");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [form, setForm] = useState({
    userName: "", fullName: "", phone: "", email: "", password: "", address: "", operationArea: "",
  });
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function load() {
    try { setRows(await adminFetch<StaffRow[]>("/admin/staff")); }
    catch (e) { setErr(e instanceof Error ? e.message : "Failed to load staff."); }
  }
  useEffect(() => { void load(); }, []);

  function startEdit(row: StaffRow) {
    setErr("");
    setMsg("");
    setEditingId(row.id);
    setForm((v) => ({
      ...v,
      userName: row.userName,
      fullName: row.fullName,
      operationArea: row.profile?.operationArea ?? "",
      password: "",
      address: "",
      phone: "",
      email: "",
    }));
    setActiveTab("form");
  }

  function cancelEdit() {
    setEditingId(null);
    setForm({ userName: "", fullName: "", phone: "", email: "", password: "", address: "", operationArea: "" });
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    try {
      if (editingId !== null) {
        const ok = window.confirm(`Update staff "${form.userName || "this user"}"?`);
        if (!ok) return;
        await adminFetch(`/admin/staff/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(form),
        });
        setMsg("Staff updated.");
        cancelEdit();
        await load();
        return;
      }
      await adminFetch("/admin/staff", { method: "POST", body: JSON.stringify(form) });
      setForm({ userName: "", fullName: "", phone: "", email: "", password: "", address: "", operationArea: "" });
      setMsg("Staff saved.");
      await load();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Failed to save staff.");
    }
  }

  async function removeStaff(id: number) {
    const ok = window.confirm("Are you sure you want to delete this staff user?");
    if (!ok) return;
    if (editingId === id) cancelEdit();
    try {
      await adminFetch(`/admin/staff/${id}`, { method: "DELETE" });
      await load();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Failed to delete staff.");
    }
  }

  function toggleSort(next: "userName" | "fullName" | "operationArea") {
    if (sortKey === next) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(next);
    setSortDir("asc");
  }

  const sortedRows = [...rows].sort((a, b) => {
    const av =
      sortKey === "operationArea"
        ? a.profile?.operationArea ?? ""
        : String(a[sortKey] ?? "");
    const bv =
      sortKey === "operationArea"
        ? b.profile?.operationArea ?? ""
        : String(b[sortKey] ?? "");
    const cmp = av.localeCompare(bv);
    return sortDir === "asc" ? cmp : -cmp;
  });

  return (
    <AppShell title="Staff User Management" subtitle="Only admin can create and manage staff users." menu={[
      { href: "/admin", label: "Overview" }, { href: "/admin/buildings", label: "Buildings" }, { href: "/admin/flats", label: "Flats/Apartments" },
      { href: "/admin/users", label: "Standard Users" }, { href: "/admin/staff", label: "Staff Users" }, { href: "/admin/gas-billing-form", label: "Gas Billing Form" }, { href: "/admin/gas-billing-history", label: "Gas Billing History" }, { href: "/admin/config", label: "Configuration" },
    ]}>
      {err ? <section className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{err}</section> : null}
      {msg ? <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{msg}</section> : null}
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap gap-2 border-b border-zinc-200 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab("list")}
            className={`rounded-md px-3 py-1.5 text-sm ${activeTab === "list" ? "bg-zinc-900 text-white" : "border border-zinc-300 text-zinc-700"}`}
          >
            Staff List
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("form")}
            className={`rounded-md px-3 py-1.5 text-sm ${activeTab === "form" ? "bg-zinc-900 text-white" : "border border-zinc-300 text-zinc-700"}`}
          >
            Add Staff User
          </button>
        </div>

        {activeTab === "list" ? (
          <>
            <h2 className="mb-4 font-semibold">Staff List</h2>
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left">
                  <th><button onClick={() => toggleSort("userName")} className="font-semibold">User Name</button></th>
                  <th><button onClick={() => toggleSort("fullName")} className="font-semibold">Full Name</button></th>
                  <th><button onClick={() => toggleSort("operationArea")} className="font-semibold">Operation Area</button></th>
                  <th className="w-[140px]" />
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((r) => (
                  <tr key={r.id} className="border-b border-zinc-100">
                    <td className="py-2">{r.userName}</td>
                    <td>{r.fullName}</td>
                    <td>{r.profile?.operationArea ?? "-"}</td>
                    <td>
                      <div className="flex gap-3">
                        <button className="text-blue-600" onClick={() => startEdit(r)}>Edit</button>
                        <button className="text-red-600" onClick={() => void removeStaff(r.id)}>Delete</button>
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
            <h2 className="mb-4 font-semibold">{editingId === null ? "Add Staff User" : "Edit Staff User"}</h2>
            <form className="grid gap-3 md:grid-cols-2" onSubmit={submit}>
              <input className="rounded-md border border-zinc-300 p-2" placeholder="User Name" value={form.userName} onChange={(e) => setForm((v) => ({ ...v, userName: e.target.value }))} required />
              <input className="rounded-md border border-zinc-300 p-2" placeholder="Full Name" value={form.fullName} onChange={(e) => setForm((v) => ({ ...v, fullName: e.target.value }))} required />
              <input className="rounded-md border border-zinc-300 p-2" placeholder="Phone No" value={form.phone} onChange={(e) => setForm((v) => ({ ...v, phone: e.target.value }))} />
              <input type="email" className="rounded-md border border-zinc-300 p-2" placeholder="Email" value={form.email} onChange={(e) => setForm((v) => ({ ...v, email: e.target.value }))} />
              <input type="password" className="rounded-md border border-zinc-300 p-2" placeholder="Password" value={form.password} onChange={(e) => setForm((v) => ({ ...v, password: e.target.value }))} required minLength={8} />
              <input className="rounded-md border border-zinc-300 p-2" placeholder="Operation Area Name (Optional)" value={form.operationArea} onChange={(e) => setForm((v) => ({ ...v, operationArea: e.target.value }))} />
              <textarea className="rounded-md border border-zinc-300 p-2 md:col-span-2" placeholder="Address" rows={3} value={form.address} onChange={(e) => setForm((v) => ({ ...v, address: e.target.value }))} />
              {editingId === null ? (
                <button className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white md:col-span-2">Save Staff User</button>
              ) : (
                <div className="md:col-span-2 flex gap-3">
                  <button className="flex-1 rounded-md bg-zinc-900 px-4 py-2 text-sm text-white">Update Staff User</button>
                  <button type="button" onClick={cancelEdit} className="rounded-md border border-zinc-300 px-4 py-2 text-sm text-zinc-900">Cancel</button>
                </div>
              )}
            </form>
          </>
        ) : null}
      </section>
    </AppShell>
  );
}
