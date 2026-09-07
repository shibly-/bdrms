"use client";

import { AppShell } from "@/components/app-shell";
import { CurrentLoadForm } from "@/components/current-load-form";
import { STAFF_NAV } from "@/lib/staff-nav";

export default function StaffCurrentLoadPage() {
  return (
    <AppShell
      title="Current Load"
      subtitle="Record the running LPG load quantity (KG) and cost (BDT)."
      menu={STAFF_NAV}
      compact
    >
      <CurrentLoadForm buildingsEndpoint="/auth/buildings" />
    </AppShell>
  );
}
