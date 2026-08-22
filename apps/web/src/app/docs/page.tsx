import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BookOpen, ExternalLink } from "lucide-react";

export const metadata: Metadata = {
  title: "Documentation | BDRMS",
  description:
    "Technical stack, architecture, setup, and repository information for the BDRMS LPG billing platform.",
};

const REPO_WEB = "https://github.com/shibly-/bdrms";
const REPO_GIT = "https://github.com/shibly-/bdrms.git";

function ArchitectureDiagram() {
  return (
    <figure className="my-6 overflow-x-auto rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-950">
      <svg
        viewBox="0 0 720 380"
        className="mx-auto h-auto w-full max-w-[720px] text-zinc-800 dark:text-zinc-200"
        role="img"
        aria-label="System architecture: clients, API, ORM, database"
      >
        <title>BDRMS architecture</title>
        <defs>
          <marker id="doc-arch-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="currentColor" />
          </marker>
        </defs>
        <rect x="40" y="24" width="200" height="72" rx="10" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeWidth="1.5" />
        <text x="140" y="58" textAnchor="middle" className="fill-current text-[13px] font-semibold">Next.js Web</text>
        <text x="140" y="78" textAnchor="middle" className="fill-current text-[11px]" opacity="0.85">React 19 · Tailwind</text>
        <rect x="480" y="24" width="200" height="72" rx="10" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeWidth="1.5" />
        <text x="580" y="58" textAnchor="middle" className="fill-current text-[13px] font-semibold">Expo Mobile</text>
        <text x="580" y="78" textAnchor="middle" className="fill-current text-[11px]" opacity="0.85">React Native</text>
        <line x1="240" y1="60" x2="330" y2="140" stroke="currentColor" strokeWidth="1.5" markerEnd="url(#doc-arch-arrow)" />
        <line x1="480" y1="60" x2="390" y2="140" stroke="currentColor" strokeWidth="1.5" markerEnd="url(#doc-arch-arrow)" />
        <rect x="230" y="120" width="260" height="88" rx="10" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="2" />
        <text x="360" y="158" textAnchor="middle" className="fill-current text-[14px] font-semibold">NestJS API</text>
        <text x="360" y="182" textAnchor="middle" className="fill-current text-[11px]" opacity="0.9">/api prefix · JWT · RBAC modules</text>
        <line x1="360" y1="208" x2="360" y2="248" stroke="currentColor" strokeWidth="1.5" markerEnd="url(#doc-arch-arrow)" />
        <rect x="250" y="248" width="220" height="72" rx="10" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeWidth="1.5" />
        <text x="360" y="282" textAnchor="middle" className="fill-current text-[13px] font-semibold">Drizzle ORM</text>
        <text x="360" y="302" textAnchor="middle" className="fill-current text-[11px]" opacity="0.85">Schema · queries · migrations</text>
        <line x1="360" y1="320" x2="360" y2="352" stroke="currentColor" strokeWidth="1.5" markerEnd="url(#doc-arch-arrow)" />
        <rect x="235" y="352" width="250" height="56" rx="10" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="2" />
        <text x="360" y="386" textAnchor="middle" className="fill-current text-[13px] font-semibold">PostgreSQL</text>
      </svg>
      <figcaption className="mt-3 text-center text-xs text-zinc-500 dark:text-zinc-400">
        Clients call the REST API; persistence goes through Drizzle to PostgreSQL.
      </figcaption>
    </figure>
  );
}

function BillingProcessDiagram() {
  const steps = [
    { x: 10, line1: "Select", line2: "building / flat" },
    { x: 132, line1: "Load", line2: "resident context" },
    { x: 254, line1: "Meter image", line2: "+ OCR (opt.)" },
    { x: 376, line1: "Review", line2: "totals" },
    { x: 498, line1: "POST", line2: "/billing/generate" },
    { x: 620, line1: "Persist bill", line2: "+ image in DB" },
  ];
  const boxW = 108;
  const gap = 14;
  return (
    <figure className="my-6 overflow-x-auto rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-950">
      <svg
        viewBox="0 0 738 130"
        className="mx-auto h-auto w-full max-w-[738px] text-zinc-800 dark:text-zinc-200"
        role="img"
        aria-label="Gas bill generation process flow"
      >
        <title>Gas billing process</title>
        <defs>
          <marker id="doc-flow-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill="currentColor" />
          </marker>
        </defs>
        {steps.map((step, i) => {
          const cx = step.x + boxW / 2;
          const yMid = 56;
          return (
            <g key={step.x}>
              <rect
                x={step.x}
                y="24"
                width={boxW}
                height="82"
                rx="8"
                fill="currentColor"
                fillOpacity="0.08"
                stroke="currentColor"
                strokeWidth="1.25"
              />
              <text x={cx} y={yMid} textAnchor="middle" fill="currentColor" fontSize="10" fontWeight="600">
                {step.line1}
              </text>
              <text x={cx} y={yMid + 14} textAnchor="middle" fill="currentColor" fontSize="10">
                {step.line2}
              </text>
              {i < steps.length - 1 ? (
                <line
                  x1={step.x + boxW}
                  y1="65"
                  x2={step.x + boxW + gap}
                  y2="65"
                  stroke="currentColor"
                  strokeWidth="1.25"
                  markerEnd="url(#doc-flow-arrow)"
                />
              ) : null}
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-3 text-center text-xs text-zinc-500 dark:text-zinc-400">
        Staff or admin uses the Gas Billing Form; the API validates role, computes usage and totals, and persists the bill (including an optional meter image).
      </figcaption>
    </figure>
  );
}

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <header className="border-b border-zinc-200 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to home
          </Link>
          <span className="flex items-center gap-2 text-sm font-semibold text-zinc-800 dark:text-zinc-100">
            <BookOpen className="h-4 w-4" aria-hidden />
            Documentation
          </span>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight">BDRMS documentation</h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
          BDRMS (Building / residential gas billing) is an LPG reticulation billing monorepo: web portals for
          admin, staff, and residents, a NestJS API, and optional Expo mobile client—all backed by PostgreSQL.
        </p>

        <nav className="mt-8 rounded-xl border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="mb-2 font-semibold text-zinc-800 dark:text-zinc-100">On this page</p>
          <ul className="list-inside list-disc space-y-1 text-zinc-600 dark:text-zinc-300">
            <li>
              <a href="#overview" className="underline-offset-2 hover:underline">
                High-level overview
              </a>
            </li>
            <li>
              <a href="#stack" className="underline-offset-2 hover:underline">
                Technical stack
              </a>
            </li>
            <li>
              <a href="#architecture" className="underline-offset-2 hover:underline">
                Architecture
              </a>
            </li>
            <li>
              <a href="#billing-flow" className="underline-offset-2 hover:underline">
                Billing process flow
              </a>
            </li>
            <li>
              <a href="#setup" className="underline-offset-2 hover:underline">
                Project setup
              </a>
            </li>
            <li>
              <a href="#repository" className="underline-offset-2 hover:underline">
                Source repository
              </a>
            </li>
          </ul>
        </nav>

        <section id="overview" className="mt-12 scroll-mt-20">
          <h2 className="text-xl font-semibold tracking-tight">High-level overview</h2>
          <ul className="mt-4 list-inside list-disc space-y-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            <li>
              <strong className="text-zinc-800 dark:text-zinc-100">Roles:</strong>{" "}
              <code className="rounded bg-zinc-200 px-1 py-0.5 text-xs dark:bg-zinc-800">admin</code>,{" "}
              <code className="rounded bg-zinc-200 px-1 py-0.5 text-xs dark:bg-zinc-800">building_admin</code> (same portal/API access as admin),{" "}
              <code className="rounded bg-zinc-200 px-1 py-0.5 text-xs dark:bg-zinc-800">staff</code>, and{" "}
              <code className="rounded bg-zinc-200 px-1 py-0.5 text-xs dark:bg-zinc-800">user</code> (resident) with JWT-based access to API routes.
            </li>
            <li>
              <strong className="text-zinc-800 dark:text-zinc-100">Core domain:</strong> buildings, flats, resident profiles, gas meter readings, bills,
              unit pricing from system configuration, and billing history (including optional meter capture images).
            </li>
            <li>
              <strong className="text-zinc-800 dark:text-zinc-100">Apps:</strong> Next.js web app (this site), NestJS API under{" "}
              <code className="rounded bg-zinc-200 px-1 py-0.5 text-xs dark:bg-zinc-800">/api</code>, shared TypeScript types in{" "}
              <code className="rounded bg-zinc-200 px-1 py-0.5 text-xs dark:bg-zinc-800">packages/shared</code>, and an Expo mobile app scaffold.
            </li>
          </ul>
        </section>

        <section id="stack" className="mt-12 scroll-mt-20">
          <h2 className="text-xl font-semibold tracking-tight">Technical stack</h2>
          <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-700">
                  <th className="px-4 py-3 font-semibold">Layer</th>
                  <th className="px-4 py-3 font-semibold">Technology</th>
                  <th className="px-4 py-3 font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-zinc-600 dark:divide-zinc-800 dark:text-zinc-300">
                <tr>
                  <td className="px-4 py-3 font-medium text-zinc-800 dark:text-zinc-100">Web UI</td>
                  <td className="px-4 py-3">Next.js 16, React 19, Tailwind CSS 4, Lucide, Tesseract.js (meter OCR)</td>
                  <td className="px-4 py-3">App Router, client portals for admin / staff / user</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-zinc-800 dark:text-zinc-100">Mobile</td>
                  <td className="px-4 py-3">Expo / React Native</td>
                  <td className="px-4 py-3">Uses <code className="text-xs">EXPO_PUBLIC_API_BASE_URL</code> for API</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-zinc-800 dark:text-zinc-100">API</td>
                  <td className="px-4 py-3">NestJS 11, Passport JWT</td>
                  <td className="px-4 py-3">Modules: auth, admin, billing, management; global prefix <code className="text-xs">/api</code></td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-zinc-800 dark:text-zinc-100">Data</td>
                  <td className="px-4 py-3">PostgreSQL, Drizzle ORM</td>
                  <td className="px-4 py-3">Schema in <code className="text-xs">apps/api/src/database/schema.ts</code></td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-zinc-800 dark:text-zinc-100">Shared</td>
                  <td className="px-4 py-3">Workspace package <code className="text-xs">@bdrms/shared</code></td>
                  <td className="px-4 py-3">Common types across apps</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section id="architecture" className="mt-12 scroll-mt-20">
          <h2 className="text-xl font-semibold tracking-tight">Architecture diagram</h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            Browser and mobile clients talk to the NestJS HTTP API. The API uses Drizzle to read and write relational data in PostgreSQL.
          </p>
          <ArchitectureDiagram />
        </section>

        <section id="billing-flow" className="mt-12 scroll-mt-20">
          <h2 className="text-xl font-semibold tracking-tight">Gas billing process flow</h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            Authorized staff or admin generates a bill from the Gas Billing Form; readings and optional meter images are validated and stored.
          </p>
          <BillingProcessDiagram />
        </section>

        <section id="setup" className="mt-12 scroll-mt-20">
          <h2 className="text-xl font-semibold tracking-tight">How to set up this project</h2>
          <ol className="mt-4 list-decimal space-y-4 pl-5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            <li>
              <strong className="text-zinc-800 dark:text-zinc-100">Prerequisites:</strong> Node.js (LTS recommended), npm, and a running PostgreSQL instance.
            </li>
            <li>
              <strong className="text-zinc-800 dark:text-zinc-100">Clone the repository</strong> (see{" "}
              <a href="#repository" className="font-medium text-zinc-900 underline dark:text-zinc-100">
                Source repository
              </a>
              ), then from the repo root run:
              <pre className="mt-2 overflow-x-auto rounded-lg border border-zinc-200 bg-zinc-100 p-3 text-xs text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
                npm install
              </pre>
            </li>
            <li>
              <strong className="text-zinc-800 dark:text-zinc-100">Configure environment:</strong> copy env templates and set values (especially{" "}
              <code className="rounded bg-zinc-200 px-1 text-xs dark:bg-zinc-800">DATABASE_URL</code> and JWT secrets for the API, and the API base URL for the web app).
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>
                  API: <code className="text-xs">apps/api/.env.example</code> → <code className="text-xs">apps/api/.env</code>
                </li>
                <li>
                  Web: <code className="text-xs">apps/web/.env.example</code> → <code className="text-xs">apps/web/.env.local</code>
                </li>
                <li>
                  Mobile: <code className="text-xs">apps/mobile/.env.example</code> (use LAN IP or Android emulator host as documented there)
                </li>
              </ul>
            </li>
            <li>
              <strong className="text-zinc-800 dark:text-zinc-100">Database schema:</strong> apply migrations or push schema with Drizzle as you prefer, then seed an admin user if needed:
              <pre className="mt-2 overflow-x-auto rounded-lg border border-zinc-200 bg-zinc-100 p-3 text-xs text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
                {`npm run db:generate -w api   # when you change schema\nnpm run seed:admin -w api      # default admin (see README)`}
              </pre>
            </li>
            <li>
              <strong className="text-zinc-800 dark:text-zinc-100">Run locally:</strong> from the monorepo root:
              <pre className="mt-2 overflow-x-auto rounded-lg border border-zinc-200 bg-zinc-100 p-3 text-xs text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
                {`npm run dev:api    # Nest API (default port 4000)\nnpm run dev:web    # Next.js (default port 3000)\nnpm run dev:mobile # Expo, when you need the mobile app`}
              </pre>
            </li>
          </ol>
        </section>

        <section id="repository" className="mt-12 scroll-mt-20">
          <h2 className="text-xl font-semibold tracking-tight">Source repository</h2>
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">
            Clone with Git or open the project on GitHub.
          </p>
          <ul className="mt-4 space-y-3 text-sm">
            <li>
              <span className="font-medium text-zinc-800 dark:text-zinc-100">Git clone (HTTPS)</span>
              <pre className="mt-1 overflow-x-auto rounded-lg border border-zinc-200 bg-zinc-100 p-3 text-xs text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
                git clone {REPO_GIT}
              </pre>
            </li>
            <li className="flex flex-wrap items-center gap-3">
              <a
                href={REPO_WEB}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                Open on GitHub
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
              <span className="text-zinc-500 dark:text-zinc-400">{REPO_WEB}</span>
            </li>
          </ul>
        </section>
      </article>
    </div>
  );
}
