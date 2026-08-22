export type AdminNavItem = {
  href: string;
  label: string;
};

/** Full sidebar for system Admin (all admin routes). */
export const ADMIN_NAV_FULL: AdminNavItem[] = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/buildings", label: "Buildings" },
  { href: "/admin/flats", label: "Flats/Apartments" },
  { href: "/admin/users", label: "Standard Users" },
  { href: "/admin/staff", label: "Staff Users" },
  { href: "/admin/gas-billing-form", label: "Gas Billing Form" },
  { href: "/admin/gas-billing-history", label: "Gas Billing History" },
  { href: "/admin/config", label: "Configuration" },
];

/** Building Admin: same as admin except Buildings & Configuration UI/API-sensitive pages. */
export function getAdminNavForRole(role: string | null | undefined): AdminNavItem[] {
  if (role === "building_admin") {
    return ADMIN_NAV_FULL.filter(
      (item) =>
        item.href !== "/admin/buildings" && item.href !== "/admin/config",
    );
  }
  return [...ADMIN_NAV_FULL];
}

export function isBuildingAdminRestrictedPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return pathname === "/admin/buildings" || pathname.startsWith("/admin/buildings/") || pathname === "/admin/config";
}
