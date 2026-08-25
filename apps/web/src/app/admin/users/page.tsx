"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
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
  billingInputReadonly,
  billingSection,
  compactTab,
  compactTabActive,
  compactTabIdle,
} from "@/lib/billing-ui";

type Building = { id: number; name: string; address1: string; address2: string; postCode: string };
type Flat = { id: number; flatNo: string; buildingId: number };
type BillHistoryItem = { billId: number; billingDate: string; userName: string; fullName: string; gasMeterNo: string; totalBill: string };
type StandardUserRow = {
  id: number;
  userName: string;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  profile?: {
    buildingId: number;
    flatId: number;
    gasMeterNo: string;
    installationDate?: string | null;
    activationDate?: string | null;
  } | null;
};

export default function StandardUsersPage() {
  const role = useUserRole();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [flats, setFlats] = useState<Flat[]>([]);
  const [allFlats, setAllFlats] = useState<Flat[]>([]);
  const [buildingId, setBuildingId] = useState<number | "">("");
  const [flatId, setFlatId] = useState<number | "">("");
  const [rows, setRows] = useState<StandardUserRow[]>([]);
  const [activeTab, setActiveTab] = useState<"list" | "form" | "history">("list");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [sortKey, setSortKey] = useState<"userName" | "fullName" | "phone" | "flatNo" | "buildingName" | "gasMeterNo">("userName");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [historySortKey, setHistorySortKey] = useState<"billingDate" | "userName" | "gasMeterNo" | "totalBill">("billingDate");
  const [historySortDir, setHistorySortDir] = useState<"asc" | "desc">("desc");
  const [msg, setMsg] = useState("");
  const [history, setHistory] = useState<BillHistoryItem[]>([]);
  const [err, setErr] = useState("");
  const [filters, setFilters] = useState({ month: new Date().toISOString().slice(0, 7), userName: "", gasMeterNo: "" });
  const [form, setForm] = useState({
    userName: "", fullName: "", phone: "", email: "", password: "",
    gasMeterNo: "", installationDate: "", activationDate: "",
  });

  const selectedBuilding = useMemo(() => buildings.find((b) => b.id === buildingId), [buildings, buildingId]);

  async function load() {
    try {
      const [bs, users, adminFlats] = await Promise.all([
        adminFetch<Building[]>("/admin/buildings"),
        adminFetch<StandardUserRow[]>("/admin/users"),
        adminFetch<Array<{ id: number; flatNo: string; buildingId: number }>>("/admin/flats"),
      ]);
      setBuildings(bs);
      setRows(users);
      setAllFlats(adminFlats);
      if (!buildingId && bs.length > 0) setBuildingId(bs[0].id);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Load failed.");
    }
  }
  useEffect(() => { void load(); }, []);
  useEffect(() => {
    if (window.location.hash === "#billing-history") {
      setActiveTab("history");
    }
  }, []);
  useEffect(() => {
    if (!buildingId) return;
    void adminFetch<Flat[]>(`/auth/buildings/${buildingId}/flats`).then((data) => {
      setFlats(data);
      if (data.length > 0) setFlatId(data[0].id);
    }).catch(() => setFlats([]));
  }, [buildingId]);

  function startEdit(row: StandardUserRow) {
    if (!row.profile) return;
    setErr("");
    setMsg("");
    setEditingId(row.id);
    setBuildingId(row.profile.buildingId);
    setFlatId(row.profile.flatId);
    setForm({
      userName: row.userName,
      fullName: row.fullName,
      phone: row.phone ?? "",
      email: row.email ?? "",
      password: "",
      gasMeterNo: row.profile.gasMeterNo,
      installationDate: row.profile.installationDate?.slice(0, 10) ?? "",
      activationDate: row.profile.activationDate?.slice(0, 10) ?? "",
    });
    setActiveTab("form");
  }

  function cancelEdit() {
    setEditingId(null);
    setErr("");
    setMsg("");
    setForm({
      userName: "", fullName: "", phone: "", email: "", password: "",
      gasMeterNo: "", installationDate: "", activationDate: "",
    });
  }

  async function createUser(e: FormEvent) {
    e.preventDefault();
    if (!buildingId || !flatId) return;
    try {
      if (editingId !== null) {
        const ok = window.confirm(`Update user "${form.userName || "this user"}"?`);
        if (!ok) return;
        await adminFetch(`/admin/users/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify({ ...form, buildingId, flatId }),
        });
        setMsg("Standard user updated.");
        cancelEdit();
        await load();
        return;
      }
      await adminFetch("/admin/users", { method: "POST", body: JSON.stringify({ ...form, buildingId, flatId }) });
      setMsg("Standard user saved.");
      setForm({ userName: "", fullName: "", phone: "", email: "", password: "", gasMeterNo: "", installationDate: "", activationDate: "" });
      await load();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Create failed.");
    }
  }

  async function removeUser(id: number) {
    const ok = window.confirm("Are you sure you want to delete this standard user?");
    if (!ok) return;
    if (editingId === id) cancelEdit();
    try {
      await adminFetch(`/admin/users/${id}`, { method: "DELETE" });
      await load();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Delete failed.");
    }
  }

  async function loadHistory(e: FormEvent) {
    e.preventDefault();
    const p = new URLSearchParams(filters).toString();
    const data = await adminFetch<{ items: BillHistoryItem[] }>(`/billing/history?${p}`);
    setHistory(data.items ?? []);
  }

  function toggleSort(next: "userName" | "fullName" | "phone" | "flatNo" | "buildingName" | "gasMeterNo") {
    if (sortKey === next) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(next);
    setSortDir("asc");
  }

  function toggleHistorySort(next: "billingDate" | "userName" | "gasMeterNo" | "totalBill") {
    if (historySortKey === next) {
      setHistorySortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setHistorySortKey(next);
    setHistorySortDir("asc");
  }

  const buildingById = useMemo(() => {
    return new Map(buildings.map((b) => [b.id, b.name]));
  }, [buildings]);

  const flatById = useMemo(() => {
    return new Map(allFlats.map((f) => [f.id, f.flatNo]));
  }, [allFlats]);

  const sortedRows = [...rows].sort((a, b) => {
    const av =
      sortKey === "gasMeterNo"
        ? a.profile?.gasMeterNo ?? ""
        : sortKey === "phone"
          ? a.phone ?? ""
          : sortKey === "flatNo"
            ? (a.profile?.flatId ? (flatById.get(a.profile.flatId) ?? "") : "")
            : sortKey === "buildingName"
              ? (a.profile?.buildingId ? (buildingById.get(a.profile.buildingId) ?? "") : "")
              : String(a[sortKey] ?? "");
    const bv =
      sortKey === "gasMeterNo"
        ? b.profile?.gasMeterNo ?? ""
        : sortKey === "phone"
          ? b.phone ?? ""
          : sortKey === "flatNo"
            ? (b.profile?.flatId ? (flatById.get(b.profile.flatId) ?? "") : "")
            : sortKey === "buildingName"
              ? (b.profile?.buildingId ? (buildingById.get(b.profile.buildingId) ?? "") : "")
              : String(b[sortKey] ?? "");
    const cmp = av.localeCompare(bv);
    return sortDir === "asc" ? cmp : -cmp;
  });

  const sortedHistory = [...history].sort((a, b) => {
    const av = String(a[historySortKey] ?? "");
    const bv = String(b[historySortKey] ?? "");
    const cmp = historySortKey === "totalBill"
      ? Number(a.totalBill) - Number(b.totalBill)
      : av.localeCompare(bv);
    return historySortDir === "asc" ? cmp : -cmp;
  });

  return (
    <AppShell
      title="Standard User Management"
      subtitle="Only admin can create and manage standard users."
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
            Standard Users
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("form")}
            className={`${compactTab} ${activeTab === "form" ? compactTabActive : compactTabIdle}`}
          >
            Add Standard User
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`${compactTab} ${activeTab === "history" ? compactTabActive : compactTabIdle}`}
          >
            Billing History with Filters
          </button>
        </div>

        {activeTab === "list" ? (
          <>
            <h2 className={billingH2}>Standard Users</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 text-left">
                    <th className="py-1.5 pr-2"><button onClick={() => toggleSort("userName")} className="font-semibold">User Name</button></th>
                    <th className="py-1.5 pr-2"><button onClick={() => toggleSort("fullName")} className="font-semibold">Full Name</button></th>
                    <th className="py-1.5 pr-2"><button onClick={() => toggleSort("phone")} className="font-semibold">Phone No</button></th>
                    <th className="py-1.5 pr-2"><button onClick={() => toggleSort("flatNo")} className="font-semibold">Flat No</button></th>
                    <th className="py-1.5 pr-2"><button onClick={() => toggleSort("buildingName")} className="font-semibold">Building Name</button></th>
                    <th className="py-1.5 pr-2"><button onClick={() => toggleSort("gasMeterNo")} className="font-semibold">Gas Meter No</button></th>
                    <th className="w-[140px] py-1.5" />
                  </tr>
                </thead>
                <tbody>
                  {sortedRows.map((u) => (
                    <tr key={u.id} className="border-b border-zinc-100">
                      <td className="py-1.5 pr-2">{u.userName}</td>
                      <td className="py-1.5 pr-2">{u.fullName}</td>
                      <td className="py-1.5 pr-2">{u.phone || "-"}</td>
                      <td className="py-1.5 pr-2">{u.profile?.flatId ? (flatById.get(u.profile.flatId) ?? "-") : "-"}</td>
                      <td className="py-1.5 pr-2">{u.profile?.buildingId ? (buildingById.get(u.profile.buildingId) ?? "-") : "-"}</td>
                      <td className="py-1.5 pr-2">{u.profile?.gasMeterNo ?? "-"}</td>
                      <td className="py-1.5">
                        <div className="flex gap-2">
                          <button className="text-blue-600" onClick={() => startEdit(u)}>Edit</button>
                          <button className="text-red-600" onClick={() => void removeUser(u.id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}

        {activeTab === "form" ? (
          <>
            <h2 className={billingH2}>{editingId === null ? "Add Standard User" : "Edit Standard User"}</h2>
            <form className="grid gap-2 md:grid-cols-3" onSubmit={createUser}>
              <input className={billingInput} placeholder="User Name" value={form.userName} onChange={(e) => setForm((v) => ({ ...v, userName: e.target.value }))} required />
              <input className={billingInput} placeholder="Full Name" value={form.fullName} onChange={(e) => setForm((v) => ({ ...v, fullName: e.target.value }))} required />
              <input className={billingInput} placeholder="Phone No" value={form.phone} onChange={(e) => setForm((v) => ({ ...v, phone: e.target.value }))} />
              <input type="email" className={billingInput} placeholder="Email" value={form.email} onChange={(e) => setForm((v) => ({ ...v, email: e.target.value }))} />
              <input type="password" className={billingInput} placeholder="Password" value={form.password} onChange={(e) => setForm((v) => ({ ...v, password: e.target.value }))} required minLength={8} />
              <select className={billingInput} value={buildingId} onChange={(e) => setBuildingId(Number(e.target.value) || "")} required>
                {buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <select className={billingInput} value={flatId} onChange={(e) => setFlatId(Number(e.target.value) || "")} required>
                {flats.map((f) => <option key={f.id} value={f.id}>{f.flatNo}</option>)}
              </select>
              <input className={billingInputReadonly} value={selectedBuilding?.address1 ?? ""} readOnly placeholder="Address-1" />
              <input className={billingInputReadonly} value={selectedBuilding?.address2 ?? ""} readOnly placeholder="Address-2" />
              <input className={billingInputReadonly} value={selectedBuilding?.postCode ?? ""} readOnly placeholder="Post Code" />
              <input className={billingInput} placeholder="Gas Meter No" value={form.gasMeterNo} onChange={(e) => setForm((v) => ({ ...v, gasMeterNo: e.target.value }))} required />
              <input type="date" className={billingInput} value={form.installationDate} onChange={(e) => setForm((v) => ({ ...v, installationDate: e.target.value }))} />
              <input type="date" className={billingInput} value={form.activationDate} onChange={(e) => setForm((v) => ({ ...v, activationDate: e.target.value }))} />
              {editingId === null ? (
                <button className={`${billingButton} md:col-span-3`}>Save Standard User</button>
              ) : (
                <div className="flex gap-2 md:col-span-3">
                  <button className={`${billingButton} flex-1`}>Update Standard User</button>
                  <button type="button" onClick={cancelEdit} className="rounded border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-900 dark:border-zinc-700 dark:text-zinc-100">Cancel</button>
                </div>
              )}
            </form>
          </>
        ) : null}

        {activeTab === "history" ? (
          <div id="billing-history">
            <h2 className={billingH2}>Billing History with Filters</h2>
            <form className="grid gap-2 md:grid-cols-4" onSubmit={loadHistory}>
              <input type="month" className={billingInput} value={filters.month} onChange={(e) => setFilters((v) => ({ ...v, month: e.target.value }))} />
              <input className={billingInput} placeholder="User Name" value={filters.userName} onChange={(e) => setFilters((v) => ({ ...v, userName: e.target.value }))} />
              <input className={billingInput} placeholder="Gas Meter No" value={filters.gasMeterNo} onChange={(e) => setFilters((v) => ({ ...v, gasMeterNo: e.target.value }))} />
              <button className={billingButton}>Apply Filters</button>
            </form>
            <div className="mt-2 overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 text-left">
                    <th className="py-1.5 pr-2"><button onClick={() => toggleHistorySort("billingDate")} className="font-semibold">Date</button></th>
                    <th className="py-1.5 pr-2"><button onClick={() => toggleHistorySort("userName")} className="font-semibold">User</button></th>
                    <th className="py-1.5 pr-2"><button onClick={() => toggleHistorySort("gasMeterNo")} className="font-semibold">Meter</button></th>
                    <th className="py-1.5 pr-2"><button onClick={() => toggleHistorySort("totalBill")} className="font-semibold">Total Bill</button></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedHistory.map((b) => (
                    <tr key={b.billId} className="border-b border-zinc-100">
                      <td className="py-1.5 pr-2">{b.billingDate}</td>
                      <td className="py-1.5 pr-2">{b.fullName} ({b.userName})</td>
                      <td className="py-1.5 pr-2">{b.gasMeterNo}</td>
                      <td className="py-1.5 pr-2">{b.totalBill}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}
