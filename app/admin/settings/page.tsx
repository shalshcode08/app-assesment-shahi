import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { ClipboardListIcon, MapPinIcon } from "lucide-react";

import { LocationsManager } from "@/features/admin/components/locations-manager";
import { TestsManager } from "@/features/admin/components/tests-manager";
import { getAdminLocations } from "@/features/admin/data/get-admin-locations";
import { getAdminTests } from "@/features/admin/data/get-admin-tests";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Settings | Shahi",
  description: "Manage states, training centres, and assessments.",
};

const TABS = [
  {
    description: "States and training centres",
    icon: MapPinIcon,
    id: "locations",
    label: "Locations",
  },
  {
    description: "Test setup and question bank",
    icon: ClipboardListIcon,
    id: "tests",
    label: "Tests",
  },
] as const;

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await connection();

  const { tab } = await searchParams;
  const activeTab = tab === "tests" ? "tests" : "locations";
  const [locations, tests] = await Promise.all([
    getAdminLocations(),
    getAdminTests(),
  ]);

  if (locations === null || tests === null) {
    redirect("/login/admin");
  }

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
      <header>
        <h1 className="text-lg font-semibold tracking-[-0.01em] text-foreground">
          Settings
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Manage the states and training centres available at login, and
          configure the assessments trainers take.
        </p>
      </header>

      <nav
        aria-label="Settings sections"
        className="mx-auto flex max-w-full gap-1 rounded-xl border border-border/60 bg-muted/40 p-1"
      >
        {TABS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <Link
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-3.5 py-2 text-sm transition-colors sm:flex-none",
                isActive
                  ? "bg-background font-medium text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
              href={`/admin/settings?tab=${item.id}`}
              key={item.id}
            >
              <Icon aria-hidden="true" className="size-4 shrink-0" />
              <span className="flex min-w-0 flex-col text-left">
                <span className="truncate leading-5">{item.label}</span>
                <span className="truncate text-xs leading-4 text-muted-foreground">
                  {item.description}
                </span>
              </span>
            </Link>
          );
        })}
      </nav>

      {activeTab === "locations" ? (
        <LocationsManager regions={locations} />
      ) : (
        <TestsManager tests={tests} />
      )}
    </main>
  );
}
