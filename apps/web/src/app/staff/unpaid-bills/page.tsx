"use client";

import { AppShell } from "@/components/app-shell";
import { UnpaidGasBills } from "@/components/unpaid-gas-bills";
import { STAFF_NAV } from "@/lib/staff-nav";

export default function StaffUnpaidBillsPage() {
  return (
    <AppShell
      title="Unpaid Bills"
      subtitle="Review outstanding gas bills. Only admins can mark bills paid or correct readings."
      menu={STAFF_NAV}
      compact
    >
      <UnpaidGasBills buildingsEndpoint="/auth/buildings" isAdmin={false} />
    </AppShell>
  );
}
