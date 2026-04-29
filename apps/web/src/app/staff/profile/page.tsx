"use client";

import { useMemo } from "react";
import { AppShell } from "@/components/app-shell";

type JwtPayload = {
  sub?: number;
  userName?: string;
  role?: string;
  exp?: number;
};

function decodeJwt(token: string): JwtPayload | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(normalized);
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

export default function StaffProfilePage() {
  const token = typeof window !== "undefined" ? (window.localStorage.getItem("accessToken") ?? "") : "";
  const role = typeof window !== "undefined" ? (window.localStorage.getItem("userRole") ?? "") : "";
  const payload = useMemo(() => decodeJwt(token), [token]);
  const expiresAt = payload?.exp ? new Date(payload.exp * 1000).toLocaleString() : "N/A";

  return (
    <AppShell
      title="Staff Profile"
      subtitle="Profile information for the logged-in staff account."
      menu={[
        { href: "/staff", label: "Overview" },
        { href: "/staff/profile", label: "Profile" },
        { href: "/staff/gas-billing-form", label: "Gas Billing Form" },
        { href: "/staff/gas-billing-history", label: "Gas Billing History" },
      ]}
    >
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 font-semibold">Account Details</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm text-zinc-700 dark:text-zinc-300">
            User Name
            <input className="mt-1 w-full rounded-md border border-zinc-300 bg-zinc-50 p-2" value={payload?.userName ?? ""} readOnly />
          </label>
          <label className="text-sm text-zinc-700 dark:text-zinc-300">
            Role
            <input className="mt-1 w-full rounded-md border border-zinc-300 bg-zinc-50 p-2" value={role || payload?.role || ""} readOnly />
          </label>
          <label className="text-sm text-zinc-700 dark:text-zinc-300">
            User ID
            <input className="mt-1 w-full rounded-md border border-zinc-300 bg-zinc-50 p-2" value={payload?.sub?.toString() ?? ""} readOnly />
          </label>
          <label className="text-sm text-zinc-700 dark:text-zinc-300">
            Token Expires At
            <input className="mt-1 w-full rounded-md border border-zinc-300 bg-zinc-50 p-2" value={expiresAt} readOnly />
          </label>
        </div>
      </section>
    </AppShell>
  );
}
