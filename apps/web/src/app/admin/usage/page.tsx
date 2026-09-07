"use client";

import { AppShell } from "@/components/app-shell";
import { UsageReport } from "@/components/usage-report";
import { useUserRole } from "@/hooks/use-user-role";
import { getAdminNavForRole } from "@/lib/admin-nav";

export default function AdminUsagePage() {
  const role = useUserRole();
  return (
    <AppShell
      title="Usage"
      subtitle="Weekly or monthly gas consumption (m³) for each flat in a building."
      menu={getAdminNavForRole(role)}
      compact
    >
      <UsageReport buildingsEndpoint="/admin/buildings" />
    </AppShell>
  );
}
