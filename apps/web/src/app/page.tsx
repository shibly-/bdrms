export default function Home() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center gap-6 px-6 py-16">
      <h1 className="text-3xl font-bold tracking-tight">
        Residential Gas Billing & Management System
      </h1>
      <p className="max-w-2xl text-sm text-zinc-600">
        Monorepo scaffold with NestJS API, Drizzle/PostgreSQL schema, role-based
        auth and role-specific Next.js portals.
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        <a href="/admin" className="rounded-xl border p-5 hover:bg-zinc-50">
          <h2 className="font-semibold">Admin Panel</h2>
          <p className="mt-2 text-sm text-zinc-600">Dashboard and master-data management.</p>
        </a>
        <a href="/staff" className="rounded-xl border p-5 hover:bg-zinc-50">
          <h2 className="font-semibold">Staff Portal</h2>
          <p className="mt-2 text-sm text-zinc-600">Bill generation and operation-area view.</p>
        </a>
        <a href="/user" className="rounded-xl border p-5 hover:bg-zinc-50">
          <h2 className="font-semibold">User Portal</h2>
          <p className="mt-2 text-sm text-zinc-600">Registration, login and billing history.</p>
        </a>
      </div>
    </div>
  );
}
