import Link from "next/link";
import { AppShell } from "@/components/app-shell";

export default function UserPage() {
  return (
    <AppShell
      title="Resident Portal"
      subtitle="Manage your profile, track billing history, and stay updated on monthly gas charges."
      menu={[
        { href: "/user", label: "Dashboard" },
        { href: "/user#account", label: "Account" },
        { href: "/user#history", label: "Billing History" },
      ]}
    >
      <section id="account" className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold">Account</h2>
        <p className="mt-2 text-sm text-zinc-600">
          <Link href="/register" className="font-medium text-zinc-900 underline underline-offset-2">
            Create an account
          </Link>
          {" · "}
          <Link href="/login" className="font-medium text-zinc-900 underline underline-offset-2">
            Sign in
          </Link>
        </p>
      </section>
      <section id="history" className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold">My Billing History</h2>
        <p className="mt-2 text-sm text-zinc-600">
          Placeholder for personal bill history list and details.
        </p>
      </section>
    </AppShell>
  );
}
