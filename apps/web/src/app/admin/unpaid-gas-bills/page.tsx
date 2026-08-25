"use client";

import { AppShell } from "@/components/app-shell";
import { UnpaidGasBills } from "@/components/unpaid-gas-bills";
import { useUserRole } from "@/hooks/use-user-role";
import { getAdminNavForRole } from "@/lib/admin-nav";

export default function AdminUnpaidGasBillsPage() {
  const role = useUserRole();
  return (
    <AppShell
      title="Unpaid Gas Bills"
      subtitle="Review outstanding gas bills, mark them as paid, or correct a reading."
      menu={getAdminNavForRole(role)}
      compact
    >
      <UnpaidGasBills buildingsEndpoint="/admin/buildings" isAdmin={role === "admin"} />
    </AppShell>
  );
}
