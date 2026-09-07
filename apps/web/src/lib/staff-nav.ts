export type StaffNavLink = {
  href: string;
  label: string;
};

/** A top-level staff menu: either a direct link (href) or a group with submenus. */
export type StaffNavItem = {
  label: string;
  href?: string;
  children?: StaffNavLink[];
};

/** Shared top menu for the Staff portal. */
export const STAFF_NAV: StaffNavItem[] = [
  { label: "Overview", href: "/staff" },
  { label: "Profile", href: "/staff/profile" },
  {
    label: "Billing",
    children: [
      { href: "/staff/bill-entry", label: "Bill Entry" },
      { href: "/staff/bulk-bill-entry", label: "Bulk Bill Entry" },
      { href: "/staff/unpaid-bills", label: "Unpaid Bills" },
      { href: "/staff/billing-history", label: "Billing History" },
    ],
  },
  {
    label: "Loads",
    children: [
      { href: "/staff/current-load", label: "Current Load" },
      { href: "/staff/loading-history", label: "Loading History" },
      { href: "/staff/usage", label: "Usage" },
    ],
  },
];
