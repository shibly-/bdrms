import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in | BDRMS",
  description: "Sign in to the LPG Reticulation Billing System",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
