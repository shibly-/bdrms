"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { adminFetch } from "@/lib/admin-client";

type ResidentProfileResponse = {
  user: {
    id: number;
    userName: string;
    fullName: string;
    phone: string | null;
    email: string | null;
    role: string;
    isActive: number;
    createdAt: string;
  };
  profile: {
    profileId: number;
    buildingId: number;
    flatId: number;
    gasMeterNo: string;
    installationDate: string | null;
    activationDate: string | null;
    building: {
      name: string;
      buildingNo: string | null;
      address1: string;
      address2: string;
      postCode: string;
    } | null;
    flatNo: string | null;
  } | null;
};

function fmtDate(value: string | null | undefined): string {
  if (value == null || value === "") return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString();
}

function fmtDateTime(value: string | null | undefined): string {
  if (value == null || value === "") return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
}

function ReadonlyField({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <label className={`block text-sm text-zinc-700 dark:text-zinc-300 ${className}`}>
      <span className="mb-1 block font-medium text-zinc-800 dark:text-zinc-100">{label}</span>
      <input
        type="text"
        readOnly
        tabIndex={-1}
        className="w-full cursor-default rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
        value={value}
      />
    </label>
  );
}

export default function ResidentProfilePage() {
  const [data, setData] = useState<ResidentProfileResponse | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void adminFetch<ResidentProfileResponse>("/auth/me")
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((e) => {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Could not load profile.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AppShell
      title="Resident Profile"
      subtitle="Your account and residence details (read-only)."
      menu={[
        { href: "/user", label: "Overview" },
        { href: "/user/profile", label: "Profile" },
        { href: "/user/gas-billing-history", label: "Gas Billing History" },
      ]}
    >
      {loading ? (
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
          Loading profile…
        </section>
      ) : null}

      {err ? (
        <section className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-200">
          {err}
        </section>
      ) : null}

      {!loading && !err && data ? (
        <>
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="mb-4 font-semibold text-zinc-900 dark:text-zinc-50">Account</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <ReadonlyField label="User ID" value={String(data.user.id)} />
              <ReadonlyField label="User name" value={data.user.userName} />
              <ReadonlyField label="Full name" value={data.user.fullName} />
              <ReadonlyField label="Phone" value={data.user.phone?.trim() || "—"} />
              <ReadonlyField label="Email" value={data.user.email?.trim() || "—"} />
              <ReadonlyField label="Role" value={data.user.role} />
              <ReadonlyField
                label="Account status"
                value={data.user.isActive === 1 ? "Active" : "Inactive"}
              />
              <ReadonlyField label="Member since" value={fmtDateTime(data.user.createdAt)} />
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="mb-4 font-semibold text-zinc-900 dark:text-zinc-50">Residence &amp; gas meter</h2>
            {data.profile ? (
              <div className="grid gap-3 md:grid-cols-2">
                <ReadonlyField label="Resident profile ID" value={String(data.profile.profileId)} />
                <ReadonlyField label="Building ID" value={String(data.profile.buildingId)} />
                <ReadonlyField label="Flat ID" value={String(data.profile.flatId)} />
                <ReadonlyField
                  label="Building number"
                  value={data.profile.building?.buildingNo?.trim() || "—"}
                />
                <ReadonlyField label="Building name" value={data.profile.building?.name ?? "—"} />
                <ReadonlyField label="Flat number" value={data.profile.flatNo ?? "—"} />
                <ReadonlyField
                  label="Address line 1"
                  value={data.profile.building?.address1 ?? "—"}
                  className="md:col-span-2"
                />
                <ReadonlyField
                  label="Address line 2"
                  value={data.profile.building?.address2 ?? "—"}
                  className="md:col-span-2"
                />
                <ReadonlyField label="Post code" value={data.profile.building?.postCode ?? "—"} />
                <ReadonlyField label="Gas meter number" value={data.profile.gasMeterNo} />
                <ReadonlyField
                  label="Meter installation date"
                  value={fmtDate(data.profile.installationDate)}
                />
                <ReadonlyField
                  label="Meter activation date"
                  value={fmtDate(data.profile.activationDate)}
                />
              </div>
            ) : (
              <p className="text-sm text-zinc-600 dark:text-zinc-300">
                No residence profile is linked to this account yet. If you recently registered, contact
                your administrator if this message persists.
              </p>
            )}
          </section>
        </>
      ) : null}
    </AppShell>
  );
}
