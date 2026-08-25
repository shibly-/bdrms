"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, Flame } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  AUTH_LANDING_PATH,
  clearAuthStorage,
  isAccessTokenExpired,
} from "@/lib/auth-session";

type MenuLink = {
  href: string;
  label: string;
};

/** A top menu entry: either a direct link (href) or a group with submenus. */
type MenuItem = {
  label: string;
  href?: string;
  children?: MenuLink[];
};

type AppShellProps = {
  title: string;
  subtitle?: string;
  menu: MenuItem[];
  children: React.ReactNode;
  /** Tighter title card and page spacing (used on billing pages). */
  compact?: boolean;
};

export function AppShell({ title, subtitle, menu, children, compact = false }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<string>("");
  const [token, setToken] = useState<string>("");
  const [portalReady, setPortalReady] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const allHrefs = useMemo(
    () =>
      menu.flatMap((item) =>
        item.children
          ? item.children.map((c) => c.href)
          : item.href
            ? [item.href]
            : [],
      ),
    [menu],
  );
  const menuHrefKey = useMemo(() => allHrefs.join("\0"), [allHrefs]);

  const hasAdminMenus = useMemo(
    () => allHrefs.some((href) => href.startsWith("/admin")),
    [allHrefs],
  );
  const hasStaffMenus = useMemo(
    () => allHrefs.some((href) => href.startsWith("/staff")),
    [allHrefs],
  );
  const hasUserMenus = useMemo(
    () => allHrefs.some((href) => href.startsWith("/user")),
    [allHrefs],
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

  useEffect(() => {
    setOpenMenu(null);
  }, [pathname]);

  const showMenu = portalReady && menu.length > 0;

  function isLinkActive(href: string): boolean {
    if (href === "/admin" || href === "/staff" || href === "/user") {
      return pathname === href;
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  }

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
      <header className="sticky top-0 z-50 overflow-visible border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto flex h-11 max-w-7xl items-center gap-3 overflow-visible px-3 sm:px-4">
          <Link href="/" className="flex shrink-0 items-center gap-1.5">
            <span className="rounded-md bg-zinc-900 p-1 text-white">
              <Flame className="h-3.5 w-3.5" />
            </span>
            <span className="text-sm font-semibold tracking-wide text-zinc-900 dark:text-zinc-50">
              PRRMS
            </span>
          </Link>

          {showMenu ? (
            <nav className="flex min-w-0 flex-1 items-center gap-0.5 overflow-visible">
              {menu.map((item) => {
                if (item.children && item.children.length > 0) {
                  const isOpen = openMenu === item.label;
                  const groupActive = item.children.some((c) =>
                    isLinkActive(c.href),
                  );
                  return (
                    <div key={item.label} className="relative shrink-0">
                      <button
                        type="button"
                        aria-haspopup="menu"
                        aria-expanded={isOpen}
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenu((o) => (o === item.label ? null : item.label));
                        }}
                        className={`inline-flex items-center gap-0.5 rounded px-2 py-1 text-sm font-medium transition ${
                          groupActive || isOpen
                            ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                            : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
                        }`}
                      >
                        {item.label}
                        <ChevronDown
                          className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`}
                          aria-hidden
                        />
                      </button>
                      {isOpen ? (
                        <div
                          role="menu"
                          className="absolute left-0 top-[calc(100%+2px)] z-[80] min-w-[200px] rounded-md border border-zinc-200 bg-white py-0.5 shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
                        >
                          {item.children.map((c) => (
                            <Link
                              key={c.href}
                              href={c.href}
                              role="menuitem"
                              className={`block px-3 py-1.5 text-sm transition ${
                                isLinkActive(c.href)
                                  ? "bg-zinc-100 font-medium text-zinc-900 dark:bg-zinc-800 dark:text-white"
                                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
                              }`}
                            >
                              {c.label}
                            </Link>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                }
                if (!item.href) return null;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`shrink-0 rounded px-2 py-1 text-sm font-medium transition ${
                      isLinkActive(item.href)
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                        : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          ) : (
            <div className="flex-1" />
          )}

          <div className="flex shrink-0 items-center gap-1.5 text-sm">
            {isLoggedIn ? (
              <button
                type="button"
                onClick={handleLogout}
                className="rounded bg-zinc-900 px-2.5 py-1 text-white hover:bg-zinc-700 dark:hover:bg-zinc-700"
              >
                Logout
              </button>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded px-2.5 py-1 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="rounded bg-zinc-900 px-2.5 py-1 text-white hover:bg-zinc-700 dark:hover:bg-zinc-700"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {openMenu ? (
        <button
          type="button"
          aria-hidden
          tabIndex={-1}
          className="fixed inset-0 z-40 cursor-default bg-transparent"
          onClick={() => setOpenMenu(null)}
        />
      ) : null}

      <div
        className={`mx-auto grid w-full max-w-7xl px-3 sm:px-4 ${
          compact ? "gap-3 py-3" : "gap-6 py-6"
        }`}
      >
        <main className={compact ? "space-y-3" : "space-y-6"}>
          <section
            className={`border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 ${
              compact ? "rounded-lg px-3 py-2" : "rounded-2xl p-6"
            }`}
          >
            <h1
              className={`font-bold tracking-tight text-zinc-900 dark:text-zinc-50 ${
                compact ? "text-lg" : "text-2xl"
              }`}
            >
              {title}
            </h1>
            {subtitle ? (
              <p
                className={`text-zinc-600 dark:text-zinc-300 ${
                  compact ? "mt-0.5 text-xs" : "mt-2 text-sm"
                }`}
              >
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
