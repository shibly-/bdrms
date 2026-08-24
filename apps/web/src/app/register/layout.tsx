import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create account | PRRMS",
  description: "Register as a resident for gas billing and meter access",
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
