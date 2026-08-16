import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { UsersIcon } from "lucide-react";

import { getAdminTrainers } from "@/features/admin/data/get-admin-trainers";
import { SURFACE } from "@/features/admin/components/dashboard-primitives";
import { TrainerFilters } from "@/features/admin/components/trainer-filters";
import { TrainerTable } from "@/features/admin/components/trainer-table";
import { getLoginLocations } from "@/features/locations/data/get-login-locations";

export const metadata: Metadata = {
  title: "Trainers | Shahi",
  description: "Trainer evaluations and score reports.",
};

const UUID = /^[0-9a-f-]{36}$/i;

function asId(value: string | string[] | undefined) {
  return typeof value === "string" && UUID.test(value) ? value : "";
}

export default async function AdminTrainersPage({
  searchParams,
}: PageProps<"/admin/trainers">) {
  await connection();
  const params = await searchParams;
  const search = typeof params.q === "string" ? params.q : "";
  const regionId = asId(params.state);
  const hubId = asId(params.centre);

  const [trainers, locations] = await Promise.all([
    getAdminTrainers({
      hubId: hubId || undefined,
      regionId: regionId || undefined,
      search: search || undefined,
    }),
    getLoginLocations(),
  ]);

  if (!trainers) {
    redirect("/login/admin");
  }

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
      <section className={`${SURFACE} min-w-0 overflow-hidden`}>
        <div className="flex flex-col gap-4 p-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-lg font-semibold tracking-[-0.01em] text-foreground">
              <UsersIcon
                aria-hidden="true"
                className="size-4 text-blue-500"
              />
              Trainer evaluations
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
            Filter candidate trainers by state and center to view detailed question breakdown and score report.
            </p>
          </div>
          <TrainerFilters
            hubId={hubId}
            regionId={regionId}
            regions={locations.regions}
            search={search}
          />
        </div>

        <div className="border-t border-border/60 p-5">
          <TrainerTable trainers={trainers} />
          <p className="mt-3 text-xs text-muted-foreground tabular-nums">
            {trainers.length} {trainers.length === 1 ? "trainer" : "trainers"}{" "}
            shown
          </p>
        </div>
      </section>
    </main>
  );
}
