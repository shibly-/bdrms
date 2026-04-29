import Link from "next/link";
import { Building2, ReceiptText, UserCog } from "lucide-react";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center gap-6 px-4 py-16 dark:text-zinc-50">
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          LPG Reticulation Billing System
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-300">
          A unified platform for admin operations, staff billing workflows, and
          resident self-service.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Link
          href="/admin"
          className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
        >
          <UserCog className="h-5 w-5 text-zinc-700" />
          <h2 className="mt-3 font-semibold text-zinc-900">Admin</h2>
          <p className="mt-2 text-sm text-zinc-600">
            Manage buildings, flats, users, staff, and configuration.
          </p>
        </Link>

        <Link
          href="/staff"
          className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
        >
          <ReceiptText className="h-5 w-5 text-zinc-700" />
          <h2 className="mt-3 font-semibold text-zinc-900">Staff</h2>
          <p className="mt-2 text-sm text-zinc-600">
            Generate meter bills and view monthly reporting.
          </p>
        </Link>

        <Link
          href="/user"
          className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
        >
          <Building2 className="h-5 w-5 text-zinc-700" />
          <h2 className="mt-3 font-semibold text-zinc-900">Resident</h2>
          <p className="mt-2 text-sm text-zinc-600">
            Register, sign in, and check your billing history.
          </p>
        </Link>
      </section>

      <section className="flex flex-wrap items-center gap-3">
        <Link
          href="/login"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Sign in
        </Link>
        <Link
          href="/register"
          className="rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
        >
          Create account
        </Link>
      </section>
    </main>
  );
}
