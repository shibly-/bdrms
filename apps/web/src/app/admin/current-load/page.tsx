"use client";

import { AppShell } from "@/components/app-shell";
import { CurrentLoadForm } from "@/components/current-load-form";
import { useUserRole } from "@/hooks/use-user-role";
import { getAdminNavForRole } from "@/lib/admin-nav";

export default function AdminCurrentLoadPage() {
  const role = useUserRole();
  return (
    <AppShell
      title="Current Load"
      subtitle="Record the running LPG load quantity (KG) and cost (BDT)."
      menu={getAdminNavForRole(role)}
      compact
    >
      <CurrentLoadForm buildingsEndpoint="/admin/buildings" />
    </AppShell>
  );
}
