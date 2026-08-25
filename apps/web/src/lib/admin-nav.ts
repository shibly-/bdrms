export type AdminNavLink = {
  href: string;
  label: string;
};

/** A top-level menu: either a direct link (href) or a group with submenus. */
export type AdminNavItem = {
  label: string;
  href?: string;
  children?: AdminNavLink[];
};

/** Full top menu for system Admin (all admin routes). */
export const ADMIN_NAV_FULL: AdminNavItem[] = [
  { label: "Dashboard", href: "/admin" },
  {
    label: "Property",
    children: [
      { href: "/admin/buildings", label: "Buildings" },
      { href: "/admin/flats", label: "Flats/Apartments" },
    ],
  },
  {
    label: "User",
    children: [
      { href: "/admin/users", label: "Standard Users" },
      { href: "/admin/staff", label: "Staff Users" },
    ],
  },
  {
    label: "Billing",
    children: [
      { href: "/admin/gas-billing-form", label: "Gas Billing Form" },
      { href: "/admin/gas-billing-bulk", label: "Bulk Gas Billing" },
      { href: "/admin/unpaid-gas-bills", label: "Unpaid Gas Bills" },
      { href: "/admin/gas-billing-history", label: "Gas Billing History" },
      { href: "/admin/config", label: "Configuration" },
    ],
  },
];

/** Building Admin: same as admin except Buildings & Configuration UI/API-sensitive pages. */
export function getAdminNavForRole(
  role: string | null | undefined,
): AdminNavItem[] {
  if (role === "building_admin") {
    return ADMIN_NAV_FULL.reduce<AdminNavItem[]>((acc, item) => {
      if (item.children) {
        const children = item.children.filter(
          (c) =>
            c.href !== "/admin/buildings" && c.href !== "/admin/config",
        );
        if (children.length > 0) acc.push({ ...item, children });
        return acc;
      }
      acc.push(item);
      return acc;
    }, []);
  }
  return ADMIN_NAV_FULL.map((item) =>
    item.children ? { ...item, children: [...item.children] } : { ...item },
  );
}

export function isBuildingAdminRestrictedPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return pathname === "/admin/buildings" || pathname.startsWith("/admin/buildings/") || pathname === "/admin/config";
}
