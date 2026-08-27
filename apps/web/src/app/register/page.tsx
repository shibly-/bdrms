"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Building2, Flame, Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getApiBaseUrl } from "@/lib/api";

type Building = {
  id: number;
  name: string;
  buildingNo: string | null;
  address1: string;
  address2: string;
  postCode: string;
};

type Flat = {
  id: number;
  flatNo: string;
  buildingId: number;
};

type RegisterResponse = {
  accessToken: string;
  role: string;
  userId: number;
};

export default function RegisterPage() {
  const router = useRouter();
  const base = getApiBaseUrl();

  const [buildings, setBuildings] = useState<Building[]>([]);
  const [flats, setFlats] = useState<Flat[]>([]);
  const [loadBuildings, setLoadBuildings] = useState(true);
  const [loadFlats, setLoadFlats] = useState(false);

  const [buildingId, setBuildingId] = useState<number | "">("");
  const [flatId, setFlatId] = useState<number | "">("");

  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [gasMeterNo, setGasMeterNo] = useState("");
  const [installationDate, setInstallationDate] = useState("");
  const [activationDate, setActivationDate] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const selectedBuilding = useMemo(
    () => buildings.find((b) => b.id === buildingId) ?? null,
    [buildings, buildingId],
  );

  const loadBuildingList = useCallback(async () => {
    setLoadBuildings(true);
    setError(null);
    try {
      const res = await fetch(`${base}/auth/buildings`);
      if (!res.ok) {
        setError("Could not load buildings.");
        setBuildings([]);
        return;
      }
      const data = (await res.json()) as Building[];
      setBuildings(Array.isArray(data) ? data : []);
    } catch {
      setError("Could not reach the server. Is the API running?");
      setBuildings([]);
    } finally {
      setLoadBuildings(false);
    }
  }, [base]);

  useEffect(() => {
    void loadBuildingList();
  }, [loadBuildingList]);

  useEffect(() => {
    if (buildingId === "") {
      setFlats([]);
      setFlatId("");
      return;
    }

    let cancelled = false;
    setLoadFlats(true);
    setFlatId("");

    void (async () => {
      try {
        const res = await fetch(`${base}/auth/buildings/${buildingId}/flats`);
        if (!res.ok || cancelled) {
          if (!cancelled) setFlats([]);
          return;
        }
        const data = (await res.json()) as Flat[];
        if (!cancelled) setFlats(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setFlats([]);
      } finally {
        if (!cancelled) setLoadFlats(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [base, buildingId]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (buildingId === "" || flatId === "") {
      setError("Select a building and flat.");
      return;
    }

    setPending(true);
    try {
      const res = await fetch(`${base}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userName: userName.trim(),
          password,
          fullName: fullName.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          buildingId,
          flatId,
          gasMeterNo: gasMeterNo.trim(),
          installationDate: installationDate || undefined,
          activationDate: activationDate || undefined,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as
        | RegisterResponse
        | { message?: string | string[]; statusCode?: number };

      if (!res.ok) {
        const msg = formatApiError(data, res.status);
        setError(msg);
        return;
      }

      const ok = data as RegisterResponse;
      if (!ok.accessToken) {
        setError("Unexpected response from server.");
        return;
      }

      window.localStorage.setItem("accessToken", ok.accessToken);
      window.localStorage.setItem("userRole", ok.role ?? "user");

      router.push("/user");
      router.refresh();
    } catch {
      setError("Could not reach the server. Is the API running?");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950 dark:text-zinc-50">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
          <Link
            href="/"
            className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
          >
            ← Back to home
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center px-4 py-10">
        <div className="w-full max-w-lg">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 text-white">
              <Flame className="h-6 w-6" aria-hidden />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Create account
            </h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
              Register as a resident to access your portal and billing history.
            </p>
          </div>

          <form
            onSubmit={onSubmit}
            className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            {error ? (
              <div
                role="alert"
                className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
              >
                {error}
              </div>
            ) : null}

            <fieldset className="space-y-4" disabled={pending}>
              <legend className="sr-only">Account</legend>
              <div>
                <label
                  htmlFor="reg-username"
                  className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-200"
                >
                  Username
                </label>
                <input
                  id="reg-username"
                  name="userName"
                  autoComplete="username"
                  required
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                  placeholder="Choose a username"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="reg-password"
                  className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-200"
                  >
                    Password
                  </label>
                  <input
                    id="reg-password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                    placeholder="Min. 8 characters"
                  />
                </div>
                <div>
                  <label
                    htmlFor="reg-confirm"
                    className="mb-1.5 block text-sm font-medium text-zinc-700"
                  >
                    Confirm password
                  </label>
                  <input
                    id="reg-confirm"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
                    placeholder="Repeat password"
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="reg-fullname"
                  className="mb-1.5 block text-sm font-medium text-zinc-700"
                >
                  Full name
                </label>
                <input
                  id="reg-fullname"
                  name="fullName"
                  autoComplete="name"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
                  placeholder="Your full name"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="reg-email"
                    className="mb-1.5 block text-sm font-medium text-zinc-700"
                  >
                    Email <span className="font-normal text-zinc-400">(optional)</span>
                  </label>
                  <input
                    id="reg-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label
                    htmlFor="reg-phone"
                    className="mb-1.5 block text-sm font-medium text-zinc-700"
                  >
                    Phone <span className="font-normal text-zinc-400">(optional)</span>
                  </label>
                  <input
                    id="reg-phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
                    placeholder="+880 …"
                  />
                </div>
              </div>
            </fieldset>

            <div className="mt-6 border-t border-zinc-100 pt-6">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-zinc-800">
                <Building2 className="h-4 w-4" aria-hidden />
                Building &amp; meter
              </div>

              {loadBuildings ? (
                <p className="text-sm text-zinc-500">Loading buildings…</p>
              ) : buildings.length === 0 ? (
                <p className="text-sm text-amber-800">
                  No buildings in the database yet. Ask an administrator to add
                  buildings and flats, or run the demo seed script in{" "}
                  <code className="rounded bg-zinc-100 px-1">apps/api/scripts/seed-demo-buildings.sql</code>.
                </p>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="reg-building"
                      className="mb-1.5 block text-sm font-medium text-zinc-700"
                    >
                      Building
                    </label>
                    <select
                      id="reg-building"
                      name="buildingId"
                      required
                      value={buildingId === "" ? "" : String(buildingId)}
                      onChange={(e) => {
                        const v = e.target.value;
                        setBuildingId(v === "" ? "" : Number(v));
                      }}
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
                    >
                      <option value="">Select building</option>
                      {buildings.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                          {b.buildingNo ? ` (${b.buildingNo})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="reg-flat"
                        className="mb-1.5 block text-sm font-medium text-zinc-700"
                      >
                        Flat / apartment
                      </label>
                      <select
                        id="reg-flat"
                        name="flatId"
                        required
                        value={flatId === "" ? "" : String(flatId)}
                        onChange={(e) => {
                          const v = e.target.value;
                          setFlatId(v === "" ? "" : Number(v));
                        }}
                        disabled={buildingId === "" || loadFlats}
                        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 disabled:bg-zinc-50"
                      >
                        <option value="">
                          {buildingId === ""
                            ? "Select building first"
                            : loadFlats
                              ? "Loading…"
                              : flats.length === 0
                                ? "No flats"
                                : "Select flat"}
                        </option>
                        {flats.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.flatNo}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor="reg-meter"
                        className="mb-1.5 block text-sm font-medium text-zinc-700"
                      >
                        Gas meter number
                      </label>
                      <input
                        id="reg-meter"
                        name="gasMeterNo"
                        required
                        value={gasMeterNo}
                        onChange={(e) => setGasMeterNo(e.target.value)}
                        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
                        placeholder="e.g. GM-12345"
                      />
                    </div>
                  </div>

                  {selectedBuilding ? (
                    <div className="rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
                      <div className="font-medium text-zinc-800">Address (from building)</div>
                      <div>{selectedBuilding.address1}</div>
                      <div>{selectedBuilding.address2}</div>
                      <div>{selectedBuilding.postCode}</div>
                    </div>
                  ) : null}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="reg-install"
                        className="mb-1.5 block text-sm font-medium text-zinc-700"
                      >
                        Installation date{" "}
                        <span className="font-normal text-zinc-400">(optional)</span>
                      </label>
                      <input
                        id="reg-install"
                        name="installationDate"
                        type="date"
                        value={installationDate}
                        onChange={(e) => setInstallationDate(e.target.value)}
                        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="reg-activate"
                        className="mb-1.5 block text-sm font-medium text-zinc-700"
                      >
                        Activation date{" "}
                        <span className="font-normal text-zinc-400">(optional)</span>
                      </label>
                      <input
                        id="reg-activate"
                        name="activationDate"
                        type="date"
                        value={activationDate}
                        onChange={(e) => setActivationDate(e.target.value)}
                        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Button type="submit" className="mt-6 w-full gap-2" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Creating account…
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" aria-hidden />
                  Create account
                </>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-zinc-600">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-zinc-900 underline underline-offset-2">
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

function formatApiError(data: unknown, status: number): string {
  if (!data || typeof data !== "object") return `Registration failed (${status})`;
  const m = (data as { message?: string | string[] }).message;
  if (Array.isArray(m)) return m.join(". ");
  if (typeof m === "string" && m.length > 0) return m;
  return `Registration failed (${status})`;
}
