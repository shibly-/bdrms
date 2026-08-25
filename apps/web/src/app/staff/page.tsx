"use client";

import { AppShell } from "@/components/app-shell";
import { STAFF_NAV } from "@/lib/staff-nav";

export default function StaffPage() {
  return (
    <AppShell
      title="Staff Billing Workspace"
      subtitle="Generate and review billing entries efficiently for assigned operation areas."
      menu={STAFF_NAV}
    >
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-3 font-semibold">Staff Portal</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Staff quick sections have been removed from this page.
        </p>
      </section>
    </AppShell>
  );
}
