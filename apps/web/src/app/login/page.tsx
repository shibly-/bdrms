"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Flame, Loader2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getApiBaseUrl } from "@/lib/api";

type LoginResponse = {
  accessToken: string;
  role: "admin" | "staff" | "user";
};

function redirectPathForRole(role: string): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "staff":
      return "/staff";
    default:
      return "/user";
  }
}

export default function LoginPage() {
  const router = useRouter();
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);

    try {
      const res = await fetch(`${getApiBaseUrl()}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userName: userName.trim(), password }),
      });

      const data = (await res.json().catch(() => ({}))) as
        | LoginResponse
        | { message?: string; statusCode?: number };

      if (!res.ok) {
        const msg =
          typeof data === "object" && data && "message" in data
            ? String((data as { message?: string }).message)
            : `Sign in failed (${res.status})`;
        setError(msg);
        return;
      }

      const ok = data as LoginResponse;
      if (!ok.accessToken || !ok.role) {
        setError("Unexpected response from server.");
        return;
      }

      if (typeof window !== "undefined") {
        window.localStorage.setItem("accessToken", ok.accessToken);
        window.localStorage.setItem("userRole", ok.role);
      }

      router.push(redirectPathForRole(ok.role));
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
            href="/register"
            className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
          >
            Create account
          </Link>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 text-white">
              <Flame className="h-6 w-6" aria-hidden />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Sign in
            </h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
              Residential Gas Billing &amp; Management System
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

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="username"
                  className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-200"
                >
                  Username
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-900/10 placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-2 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-500"
                  placeholder="e.g. admin or staff.jane"
                  disabled={pending}
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-200"
                >
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-900/10 placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-2 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-500"
                  placeholder="Enter your password"
                  disabled={pending}
                />
              </div>
            </div>

            <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
              Demo: usernames starting with{" "}
              <code className="rounded bg-zinc-100 px-1 py-0.5 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100">
                admin
              </code>
              ,{" "}
              <code className="rounded bg-zinc-100 px-1 py-0.5 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100">
                staff
              </code>
              , or anything else map to Admin, Staff, or Standard User roles.
            </p>

            <Button
              type="submit"
              className="mt-6 w-full gap-2"
              disabled={pending}
            >
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Signing in…
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" aria-hidden />
                  Sign in
                </>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-zinc-600">
            New resident?{" "}
            <Link
              href="/register"
              className="font-medium text-zinc-900 underline underline-offset-2"
            >
              Create an account
            </Link>
          </p>

          <p className="mt-4 text-center text-xs text-zinc-500">
            API:{" "}
            <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-zinc-700">
              {getApiBaseUrl()}
            </code>
          </p>
        </div>
      </main>
    </div>
  );
}
