"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useUserRole } from "@/hooks/use-user-role";
import { isBuildingAdminRestrictedPath } from "@/lib/admin-nav";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const role = useUserRole();

  useEffect(() => {
    if (role !== "building_admin") return;
    if (isBuildingAdminRestrictedPath(pathname)) {
      router.replace("/admin");
    }
  }, [role, pathname, router]);

  return <>{children}</>;
}
