"use client";

import { AppShell } from "@/components/app-shell";
import { LoadingHistoryList } from "@/components/loading-history-list";
import { useUserRole } from "@/hooks/use-user-role";
import { getAdminNavForRole } from "@/lib/admin-nav";

export default function AdminLoadingHistoryPage() {
  const role = useUserRole();
  return (
    <AppShell
      title="Loading History"
      subtitle="Running, Consumed, and Cancelled loads."
      menu={getAdminNavForRole(role)}
      compact
    >
      <LoadingHistoryList buildingsEndpoint="/admin/buildings" />
    </AppShell>
  );
}
