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
  compactTab,
  compactTabActive,
  compactTabIdle,
} from "@/lib/billing-ui";

type StaffRow = { id: number; userName: string; fullName: string; profile?: { operationArea?: string | null } | null };

export default function StaffPage() {
  const role = useUserRole();
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
    <AppShell
      title="Staff User Management"
      subtitle="Only admin can create and manage staff users."
      menu={getAdminNavForRole(role)}
      compact
    >
      {err ? <section className={billingAlertErr}>{err}</section> : null}
      {msg ? <section className={billingAlertOk}>{msg}</section> : null}
      <section className={billingSection}>
        <div className="mb-2 flex flex-wrap gap-1.5 border-b border-zinc-200 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab("list")}
            className={`${compactTab} ${activeTab === "list" ? compactTabActive : compactTabIdle}`}
          >
            Staff List
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("form")}
            className={`${compactTab} ${activeTab === "form" ? compactTabActive : compactTabIdle}`}
          >
            Add Staff User
          </button>
        </div>

        {activeTab === "list" ? (
          <>
            <h2 className={billingH2}>Staff List</h2>
            <table className="min-w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-200 text-left">
                  <th className="py-1.5 pr-2"><button onClick={() => toggleSort("userName")} className="font-semibold">User Name</button></th>
                  <th className="py-1.5 pr-2"><button onClick={() => toggleSort("fullName")} className="font-semibold">Full Name</button></th>
                  <th className="py-1.5 pr-2"><button onClick={() => toggleSort("operationArea")} className="font-semibold">Operation Area</button></th>
                  <th className="w-[140px] py-1.5" />
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((r) => (
                  <tr key={r.id} className="border-b border-zinc-100">
                    <td className="py-1.5 pr-2">{r.userName}</td>
                    <td className="py-1.5 pr-2">{r.fullName}</td>
                    <td className="py-1.5 pr-2">{r.profile?.operationArea ?? "-"}</td>
                    <td className="py-1.5">
                      <div className="flex gap-2">
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
            <h2 className={billingH2}>{editingId === null ? "Add Staff User" : "Edit Staff User"}</h2>
            <form className="grid gap-2 md:grid-cols-3" onSubmit={submit}>
              <input className={billingInput} placeholder="User Name" value={form.userName} onChange={(e) => setForm((v) => ({ ...v, userName: e.target.value }))} required />
              <input className={billingInput} placeholder="Full Name" value={form.fullName} onChange={(e) => setForm((v) => ({ ...v, fullName: e.target.value }))} required />
              <input className={billingInput} placeholder="Phone No" value={form.phone} onChange={(e) => setForm((v) => ({ ...v, phone: e.target.value }))} />
              <input type="email" className={billingInput} placeholder="Email" value={form.email} onChange={(e) => setForm((v) => ({ ...v, email: e.target.value }))} />
              <input type="password" className={billingInput} placeholder="Password" value={form.password} onChange={(e) => setForm((v) => ({ ...v, password: e.target.value }))} required minLength={8} />
              <input className={billingInput} placeholder="Operation Area Name (Optional)" value={form.operationArea} onChange={(e) => setForm((v) => ({ ...v, operationArea: e.target.value }))} />
              <textarea className={`${billingInput} md:col-span-3`} placeholder="Address" rows={2} value={form.address} onChange={(e) => setForm((v) => ({ ...v, address: e.target.value }))} />
              {editingId === null ? (
                <button className={`${billingButton} md:col-span-3`}>Save Staff User</button>
              ) : (
                <div className="flex gap-2 md:col-span-3">
                  <button className={`${billingButton} flex-1`}>Update Staff User</button>
                  <button type="button" onClick={cancelEdit} className="rounded border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-900">Cancel</button>
                </div>
              )}
            </form>
          </>
        ) : null}
      </section>
    </AppShell>
  );
}
