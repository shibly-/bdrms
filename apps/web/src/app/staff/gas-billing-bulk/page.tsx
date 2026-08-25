"use client";

import { AppShell } from "@/components/app-shell";
import { STAFF_NAV } from "@/lib/staff-nav";
import { BulkGasBillingForm } from "@/components/bulk-gas-billing";

export default function StaffBulkGasBillingPage() {
  return (
    <AppShell
      title="Bulk Gas Billing (by Building)"
      subtitle="Enter current meter readings for every flat of a building and generate all bills at once."
      menu={STAFF_NAV}
      compact
    >
      <BulkGasBillingForm buildingsEndpoint="/auth/buildings" />
    </AppShell>
  );
}
