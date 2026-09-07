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
      { href: "/admin/bill-entry", label: "Bill Entry" },
      { href: "/admin/bulk-bill-entry", label: "Bulk Bill Entry" },
      { href: "/admin/unpaid-bills", label: "Unpaid Bills" },
      { href: "/admin/billing-history", label: "Billing History" },
    ],
  },
  {
    label: "Loads",
    children: [
      { href: "/admin/current-load", label: "Current Load" },
      { href: "/admin/loading-history", label: "Loading History" },
      { href: "/admin/usage", label: "Usage" },
      { href: "/admin/unit-cost", label: "Unit Cost" },
    ],
  },
];

/** Building Admin: same as admin except Buildings & Unit Cost UI/API-sensitive pages. */
export function getAdminNavForRole(
  role: string | null | undefined,
): AdminNavItem[] {
  if (role === "building_admin") {
    return ADMIN_NAV_FULL.reduce<AdminNavItem[]>((acc, item) => {
      if (item.children) {
        const children = item.children.filter(
          (c) =>
            c.href !== "/admin/buildings" && c.href !== "/admin/unit-cost",
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
  return (
    pathname === "/admin/buildings" ||
    pathname.startsWith("/admin/buildings/") ||
    pathname === "/admin/unit-cost" ||
    pathname === "/admin/config"
  );
}
