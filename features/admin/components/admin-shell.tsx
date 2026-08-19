"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChartColumnIcon,
  FileSpreadsheetIcon,
  LayoutDashboardIcon,
  MapPinIcon,
  MenuIcon,
  ShieldCheckIcon,
  SlidersHorizontalIcon,
  TrophyIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";

import { AdminLogoutButton } from "@/features/admin/components/admin-logout-button";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/admin/dashboard", icon: LayoutDashboardIcon, label: "Overview" },
  { href: "/admin/states", icon: MapPinIcon, label: "States & centres" },
  { href: "/admin/trainers", icon: UsersIcon, label: "Trainers" },
  { href: "/admin/leaderboard", icon: TrophyIcon, label: "Leaderboard" },
  { href: "/admin/analytics", icon: ChartColumnIcon, label: "Analytics" },
  { href: "/admin/reports", icon: FileSpreadsheetIcon, label: "Reports" },
  { href: "/admin/settings", icon: SlidersHorizontalIcon, label: "Settings" },
] as const;

function initialsOf(value: string) {
  const parts = value
    .trim()
    .split(/[\s@.]+/)
    .filter(Boolean);

  return (parts[0]?.[0] ?? "A").concat(parts[1]?.[0] ?? "").toUpperCase();
}

function SidebarContent({
  adminEmail,
  adminName,
  onNavigate,
  pathname,
}: {
  adminEmail: string;
  adminName: string;
  onNavigate?: () => void;
  pathname: string;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center gap-2 border-b px-5">
        <Image
          src="/assets/logo.png"
          alt="Shahi"
          width={88}
          height={62}
          className="h-auto w-14 object-contain"
          priority
        />
        <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
          <ShieldCheckIcon aria-hidden="true" className="size-3" />
          Admin
        </span>
      </div>

      <nav aria-label="Admin sections" className="flex-1 px-3 py-4">
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <li key={item.label}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-muted font-medium text-foreground"
                      : "text-foreground/70 hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  <Icon aria-hidden="true" className="size-4" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="shrink-0 border-t p-3">
        <div className="mb-2 flex items-center gap-2 px-2">
          <span
            aria-hidden="true"
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground/70"
          >
            {initialsOf(adminName || adminEmail)}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-xs font-medium text-foreground/85">
              {adminName || adminEmail}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {adminEmail}
            </span>
          </span>
        </div>
        <AdminLogoutButton className="w-full" />
      </div>
    </div>
  );
}

export function AdminShell({
  adminEmail,
  adminName,
  children,
}: {
  adminEmail: string;
  adminName: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <div className="min-h-dvh bg-[#fafafa]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 border-r bg-background lg:block">
        <SidebarContent
          adminEmail={adminEmail}
          adminName={adminName}
          pathname={pathname}
        />
      </aside>

      {isDrawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setIsDrawerOpen(false)}
            className="absolute inset-0 bg-foreground/20"
          />
          <div className="absolute inset-y-0 left-0 w-64 border-r bg-background shadow-xl">
            <SidebarContent
              adminEmail={adminEmail}
              adminName={adminName}
              onNavigate={() => setIsDrawerOpen(false)}
              pathname={pathname}
            />
          </div>
        </div>
      ) : null}

      <div className="lg:pl-60">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background px-4 lg:hidden">
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            aria-label="Open menu"
            aria-expanded={isDrawerOpen}
            className="rounded-lg p-2 text-foreground/70 hover:bg-muted"
          >
            {isDrawerOpen ? (
              <XIcon aria-hidden="true" className="size-5" />
            ) : (
              <MenuIcon aria-hidden="true" className="size-5" />
            )}
          </button>
          <Image
            src="/assets/logo.png"
            alt="Shahi"
            width={88}
            height={62}
            className="h-auto w-12 object-contain"
          />
          <span className="text-sm font-semibold text-foreground/85">
            Admin
          </span>
        </header>

        {children}
      </div>
    </div>
  );
}
