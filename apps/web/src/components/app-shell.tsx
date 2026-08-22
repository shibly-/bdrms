"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Flame, Home } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  AUTH_LANDING_PATH,
  clearAuthStorage,
  isAccessTokenExpired,
} from "@/lib/auth-session";

type MenuItem = {
  href: string;
  label: string;
};

type AppShellProps = {
  title: string;
  subtitle?: string;
  menu: MenuItem[];
  children: React.ReactNode;
};

export function AppShell({ title, subtitle, menu, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<string>("");
  const [token, setToken] = useState<string>("");
  const [portalReady, setPortalReady] = useState(false);

  const menuHrefKey = useMemo(
    () => menu.map((item) => item.href).join("\0"),
    [menu],
  );

  const hasAdminMenus = useMemo(
    () => menu.some((item) => item.href.startsWith("/admin")),
    [menu],
  );
  const hasStaffMenus = useMemo(
    () => menu.some((item) => item.href.startsWith("/staff")),
    [menu],
  );
  const hasUserMenus = useMemo(
    () => menu.some((item) => item.href.startsWith("/user")),
    [menu],
  );
  const isAdminContext = pathname.startsWith("/admin") || hasAdminMenus;
  const isStaffContext = pathname.startsWith("/staff") || hasStaffMenus;
  const isUserContext = pathname.startsWith("/user") || hasUserMenus;
  const isLoggedIn = token.length > 0 && !isAccessTokenExpired(token);

  useEffect(() => {
    const r = window.localStorage.getItem("userRole") ?? "";
    const t = window.localStorage.getItem("accessToken") ?? "";
    setRole(r);
    setToken(t);

    const expired = t.length > 0 && isAccessTokenExpired(t);
    if (expired) {
      setPortalReady(false);
      clearAuthStorage();
      setRole("");
      setToken("");
      router.replace(AUTH_LANDING_PATH);
      return;
    }

    const sessionValid = t.length > 0 && !isAccessTokenExpired(t);
    const isAdminPortalRole = r === "admin" || r === "building_admin";
    const allowed =
      (isAdminContext && isAdminPortalRole && sessionValid) ||
      (isStaffContext && r === "staff" && sessionValid) ||
      (isUserContext && r === "user" && sessionValid);

    if (!allowed) {
      setPortalReady(false);
      if (!t) clearAuthStorage();
      router.replace(AUTH_LANDING_PATH);
      return;
    }

    setPortalReady(true);
  }, [
    pathname,
    menuHrefKey,
    router,
    isAdminContext,
    isStaffContext,
    isUserContext,
  ]);

  const showSidebar = portalReady;
  const visibleMenu = menu;

  function handleLogout() {
    clearAuthStorage();
    setToken("");
    setRole("");
    setPortalReady(false);
    router.push(AUTH_LANDING_PATH);
  }

  if (!portalReady) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950" aria-busy="true" />
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="rounded-lg bg-zinc-900 p-2 text-white">
              <Flame className="h-4 w-4" />
            </span>
            <span className="text-sm font-semibold tracking-wide text-zinc-900">
              BDRMS
            </span>
          </Link>
          <div className="flex items-center gap-2 text-sm">
            {isLoggedIn ? (
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-md bg-zinc-900 px-3 py-1.5 text-white hover:bg-zinc-700 dark:hover:bg-zinc-700"
              >
                Logout
              </button>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-md px-3 py-1.5 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="rounded-md bg-zinc-900 px-3 py-1.5 text-white hover:bg-zinc-700 dark:hover:bg-zinc-700"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <div className={`mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 sm:px-6 ${showSidebar ? "lg:grid-cols-[260px_1fr]" : ""}`}>
        {showSidebar ? (
          <aside className="h-fit rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Menus
            </p>
            <nav className="space-y-1">
              <Link
                href="/"
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
              >
                <Home className="h-4 w-4" />
                Dashboard Home
              </Link>
              {visibleMenu.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block rounded-md px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </aside>
        ) : null}

        <main className="space-y-6">
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                {subtitle}
              </p>
            ) : null}
          </section>
          {children}
        </main>
      </div>
    </div>
  );
}
