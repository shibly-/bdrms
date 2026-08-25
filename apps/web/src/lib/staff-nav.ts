export type StaffNavItem = {
  href: string;
  label: string;
};

/** Shared sidebar for the Staff portal. */
export const STAFF_NAV: StaffNavItem[] = [
  { href: "/staff", label: "Overview" },
  { href: "/staff/profile", label: "Profile" },
  { href: "/staff/gas-billing-form", label: "Gas Billing Form" },
  { href: "/staff/gas-billing-bulk", label: "Bulk Gas Billing" },
  { href: "/staff/unpaid-gas-bills", label: "Unpaid Gas Bills" },
  { href: "/staff/gas-billing-history", label: "Gas Billing History" },
];
