import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/admin/gas-billing-form", destination: "/admin/bill-entry", permanent: true },
      { source: "/admin/gas-billing-bulk", destination: "/admin/bulk-bill-entry", permanent: true },
      { source: "/admin/unpaid-gas-bills", destination: "/admin/unpaid-bills", permanent: true },
      { source: "/admin/gas-billing-history", destination: "/admin/billing-history", permanent: true },
      { source: "/staff/gas-billing-form", destination: "/staff/bill-entry", permanent: true },
      { source: "/staff/gas-billing-bulk", destination: "/staff/bulk-bill-entry", permanent: true },
      { source: "/staff/unpaid-gas-bills", destination: "/staff/unpaid-bills", permanent: true },
      { source: "/staff/gas-billing-history", destination: "/staff/billing-history", permanent: true },
      { source: "/user/gas-billing-history", destination: "/user/billing-history", permanent: true },
      { source: "/admin/config", destination: "/admin/unit-cost", permanent: true },
    ];
  },
};

export default nextConfig;
