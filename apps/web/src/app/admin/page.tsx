"use client";

import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
import { Building2, Home, LineChart, ReceiptText, Settings, UserRound, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { adminFetch, getAccessToken } from "@/lib/admin-client";
import { getAdminNavForRole } from "@/lib/admin-nav";

type DashboardStats = {
  users: number;
  staff: number;
  buildings: number;
  flats: number;
  monthlyBillingCounts: { month: string; count: number }[];
};

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [role, setRole] = useState("");
  const [stats, setStats] = useState<DashboardStats>({
    users: 0,
    staff: 0,
    buildings: 0,
    flats: 0,
    monthlyBillingCounts: [],
  });

  useEffect(() => {
    setToken(getAccessToken());
    setRole(window.localStorage.getItem("userRole") ?? "");
  }, []);
  const isAdminLoggedIn =
    token.length > 0 && (role === "admin" || role === "building_admin");
  const isBuildingAdmin = role === "building_admin";
  useEffect(() => {
    if (!isAdminLoggedIn) return;
    void adminFetch<DashboardStats>("/admin/dashboard-stats").then(setStats).catch(() => {});
  }, [isAdminLoggedIn]);

  return (
    <AppShell
      title="Admin Dashboard"
      subtitle={
        isBuildingAdmin
          ? "Manage flats, users, staff, and billing. Building registry and system configuration are managed by a system administrator."
          : "Use dedicated pages to manage buildings, flats, users, staff, configuration, and billing history."
      }
      menu={getAdminNavForRole(role)}
      compact
    >
      {!isAdminLoggedIn ? (
        <section className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-200">
          Please sign in as admin first. Dashboard data and management actions require admin token.
        </section>
      ) : null}

      {isAdminLoggedIn ? (
        <section
          className={`grid gap-2 ${isBuildingAdmin ? "md:grid-cols-3" : "md:grid-cols-4"}`}
        >
          <StatCard label="Users" value={stats.users} icon={<UserRound className="h-3.5 w-3.5" />} />
          <StatCard label="Staff" value={stats.staff} icon={<Users className="h-3.5 w-3.5" />} />
          {isBuildingAdmin ? null : (
            <StatCard label="Buildings" value={stats.buildings} icon={<Building2 className="h-3.5 w-3.5" />} />
          )}
          <StatCard label="Flat/Apartments" value={stats.flats} icon={<Home className="h-3.5 w-3.5" />} />
        </section>
      ) : null}

      {isAdminLoggedIn ? (
        <section className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-zinc-900">
            <LineChart className="h-3.5 w-3.5" /> Monthly Billing Counts
          </h2>
          <MiniLineChart points={stats.monthlyBillingCounts} />
        </section>
      ) : null}

      {isAdminLoggedIn ? (
        <section className="grid gap-2 md:grid-cols-3 xl:grid-cols-4">
          {isBuildingAdmin ? null : (
            <QuickLink href="/admin/buildings" icon={<Home className="h-3.5 w-3.5" />} title="Building Management" />
          )}
          <QuickLink href="/admin/flats" icon={<Building2 className="h-3.5 w-3.5" />} title="Flat/Apartment Management" />
          <QuickLink href="/admin/users" icon={<UserRound className="h-3.5 w-3.5" />} title="Standard User Management" />
          <QuickLink href="/admin/staff" icon={<Users className="h-3.5 w-3.5" />} title="Staff User Management" />
          <QuickLink href="/admin/gas-billing-form" icon={<ReceiptText className="h-3.5 w-3.5" />} title="Gas Billing Form" />
          <QuickLink href="/admin/gas-billing-history" icon={<ReceiptText className="h-3.5 w-3.5" />} title="Gas Billing History" />
          {isBuildingAdmin ? null : (
            <QuickLink href="/admin/config" icon={<Settings className="h-3.5 w-3.5" />} title="Configuration Page" />
          )}
        </section>
      ) : null}
    </AppShell>
  );
}

function MiniLineChart({ points }: { points: { month: string; count: number }[] }) {
  if (!points.length) {
    return <p className="text-sm text-zinc-500">No billing data available yet.</p>;
  }

  const width = 720;
  const height = 140;
  const padX = 32;
  const padY = 18;
  const chartW = width - padX * 2;
  const chartH = height - padY * 2;
  const maxY = Math.max(...points.map((p) => p.count), 1);

  const coords = points.map((p, i) => {
    const x =
      points.length === 1 ? width / 2 : padX + (i / (points.length - 1)) * chartW;
    const y = padY + chartH - (p.count / maxY) * chartH;
    return { ...p, x, y };
  });
  const d = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x},${c.y}`).join(" ");

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-32 min-w-[520px] w-full">
        <line x1={padX} y1={height - padY} x2={width - padX} y2={height - padY} stroke="#d4d4d8" />
        <line x1={padX} y1={padY} x2={padX} y2={height - padY} stroke="#d4d4d8" />
        <path d={d} fill="none" stroke="#18181b" strokeWidth={2.5} />
        {coords.map((c) => (
          <g key={c.month}>
            <circle cx={c.x} cy={c.y} r={3.5} fill="#18181b" />
            <text x={c.x} y={height - 6} textAnchor="middle" fontSize="10" fill="#52525b">
              {c.month}
            </text>
            <text x={c.x} y={c.y - 10} textAnchor="middle" fontSize="10" fill="#18181b">
              {c.count}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-0.5 text-zinc-700 dark:text-zinc-300">{icon}</div>
      <p className="text-xs text-zinc-600 dark:text-zinc-300">{label}</p>
      <p className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{value}</p>
    </div>
  );
}

function QuickLink({ href, icon, title }: { href: string; icon: ReactNode; title: string }) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-zinc-200 bg-white px-3 py-2 shadow-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
    >
      <div className="mb-0.5 text-zinc-700 dark:text-zinc-300">{icon}</div>
      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{title}</p>
    </Link>
  );
}
