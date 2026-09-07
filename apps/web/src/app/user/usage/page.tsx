"use client";

import { AppShell } from "@/components/app-shell";
import { UsageReport } from "@/components/usage-report";
import { USER_NAV } from "@/lib/user-nav";

export default function UserUsagePage() {
  return (
    <AppShell
      title="Usage"
      subtitle="Weekly or monthly gas consumption (m³) for your flat."
      menu={USER_NAV}
      compact
    >
      <UsageReport scope="self" />
    </AppShell>
  );
}
