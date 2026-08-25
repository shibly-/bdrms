"use client";

import { AppShell } from "@/components/app-shell";
import { BulkGasBillingForm } from "@/components/bulk-gas-billing";
import { useUserRole } from "@/hooks/use-user-role";
import { getAdminNavForRole } from "@/lib/admin-nav";

export default function AdminBulkGasBillingPage() {
  const role = useUserRole();
  return (
    <AppShell
      title="Bulk Gas Billing (by Building)"
      subtitle="Enter current meter readings for every flat of a building and generate all bills at once."
      menu={getAdminNavForRole(role)}
      compact
    >
      <BulkGasBillingForm buildingsEndpoint="/admin/buildings" />
    </AppShell>
  );
}
