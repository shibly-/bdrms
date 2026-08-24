import Link from "next/link";
import { Flame } from "lucide-react";
import { BookOpen, Building2, ReceiptText, UserCog } from "lucide-react";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center gap-4 px-4 py-8 dark:text-zinc-50">
      <section className="flex flex-wrap items-center justify-center gap-3">
        <div className="flex items-center gap-2">
          <Flame className="h-6 w-6" aria-hidden/>
          <h2 className="text-2xl font-semibold text-zinc-900">PRRMS - Billing System</h2>
        </div>     
      </section>

       <section className="flex flex-wrap items-center justify-center gap-3">
        <p className="mt-1 max-w-2xl text-sm text-zinc-600 dark:text-zinc-300">
          A platform for admin, staff, and resident self-service.
        </p>
      </section>

      <section className="flex flex-wrap items-center justify-center gap-3">
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

        <Link
          href="/docs"
          className="rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
        >
          View docs
        </Link>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <Link
          href="/admin"
          className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
        >
          <div className="flex items-center gap-2">
            <UserCog className="h-5 w-5 text-zinc-700" />
            <h2 className="font-semibold text-zinc-900">Admin</h2>
          </div>
          <p className="mt-1 text-sm text-zinc-600">
            Manage buildings, flats, users, staff, and configuration.
          </p>
        </Link>

        <Link
          href="/staff"
          className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
        >
          <div className="flex items-center gap-2">
            <ReceiptText className="h-5 w-5 text-zinc-700" />
            <h2 className="font-semibold text-zinc-900">Staff</h2>
          </div>
          <p className="mt-1 text-sm text-zinc-600">
            Generate meter bills and view monthly reporting.
          </p>
        </Link>

        <Link
          href="/user"
          className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
        >
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-zinc-700" />
            <h2 className="font-semibold text-zinc-900">Resident</h2>
          </div>
          <p className="mt-1 text-sm text-zinc-600">
            Register, sign in, and check your billing history.
          </p>
        </Link>
      </section>
      
      <section className="flex flex-wrap items-center justify-center gap-3">
        <p className="mt-1 max-w-2xl text-sm text-zinc-600 dark:text-zinc-300">
          Protik Ruposree, House # 78, Road # 12/4, 
          <br />Block # J, South Banasree, Dhaka-1219
        </p>        
      </section>
      <section className="flex flex-wrap items-center justify-center gap-3">
        <Link
            href="https://www.linkedin.com/in/shibly/"
            className="text-sm font-medium text-blue-600 hover:text-blue-900 dark:text-blue-300 dark:hover:text-white"
          >
            Developed By: A S M Abdur Rab
          </Link>
      </section>
    </main>
  );
}
