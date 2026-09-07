export type UserNavItem = {
  href: string;
  label: string;
};

/** Shared top menu for the resident portal. */
export const USER_NAV: UserNavItem[] = [
  { href: "/user", label: "Overview" },
  { href: "/user/profile", label: "User Profile" },
  { href: "/user/billing-history", label: "Billing History" },
  { href: "/user/usage", label: "Usage" },
];
