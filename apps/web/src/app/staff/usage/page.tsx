"use client";

import { AppShell } from "@/components/app-shell";
import { UsageReport } from "@/components/usage-report";
import { STAFF_NAV } from "@/lib/staff-nav";

export default function StaffUsagePage() {
  return (
    <AppShell
      title="Usage"
      subtitle="Weekly or monthly gas consumption (m³) for each flat in a building."
      menu={STAFF_NAV}
      compact
    >
      <UsageReport buildingsEndpoint="/auth/buildings" />
    </AppShell>
  );
}
