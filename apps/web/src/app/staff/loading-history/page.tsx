"use client";

import { AppShell } from "@/components/app-shell";
import { LoadingHistoryList } from "@/components/loading-history-list";
import { STAFF_NAV } from "@/lib/staff-nav";

export default function StaffLoadingHistoryPage() {
  return (
    <AppShell
      title="Loading History"
      subtitle="Running, Consumed, and Cancelled loads."
      menu={STAFF_NAV}
      compact
    >
      <LoadingHistoryList buildingsEndpoint="/auth/buildings" />
    </AppShell>
  );
}
