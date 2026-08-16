"use client";

import { useRef, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SearchIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TINT } from "@/features/admin/components/dashboard-primitives";
import type { RegionOption } from "@/features/locations/types";

const ALL = "all";

export function TrainerFilters({
  hubId,
  regionId,
  regions,
  search,
}: {
  hubId: string;
  regionId: string;
  regions: RegionOption[];
  search: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const searchRef = useRef<HTMLInputElement>(null);
  const selectedRegion = regions.find((region) => region.id === regionId);
  const hubs = selectedRegion?.hubs ?? [];
  const hasFilters = Boolean(search || regionId || hubId);

  // Base UI renders the raw value in the trigger unless Root is given an items
  // map, and these values are ids rather than names.
  const regionItems = {
    [ALL]: "All states",
    ...Object.fromEntries(regions.map((region) => [region.id, region.name])),
  };
  const hubItems = {
    [ALL]: selectedRegion
      ? `All centres in ${selectedRegion.name} (${hubs.length})`
      : "All centres",
    ...Object.fromEntries(hubs.map((hub) => [hub.id, hub.name])),
  };

  function apply(next: { centre?: string; q?: string; state?: string }) {
    const params = new URLSearchParams();
    const query = next.q?.trim();

    if (query) params.set("q", query);
    if (next.state) params.set("state", next.state);
    if (next.centre) params.set("centre", next.centre);

    const queryString = params.toString();

    startTransition(() => {
      router.push(`/admin/trainers${queryString ? `?${queryString}` : ""}`);
    });
  }

  return (
    <div
      className="flex flex-col gap-2 sm:items-end"
      data-pending={isPending ? "" : undefined}
    >
      <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          apply({
            centre: hubId || undefined,
            q: searchRef.current?.value,
            state: regionId || undefined,
          });
        }}
        className="relative"
      >
        <SearchIcon
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          ref={searchRef}
          type="search"
          name="q"
          defaultValue={search}
          placeholder="Search name or email"
          aria-label="Search trainers by name or email"
          className="h-9 w-56 pl-8.5"
        />
      </form>

      <Select
        name="state"
        items={regionItems}
        value={regionId || ALL}
        onValueChange={(value) =>
          apply({
            q: searchRef.current?.value,
            // A centre from the previous state would match nothing.
            state: value === ALL ? undefined : (value as string),
          })
        }
      >
        <SelectTrigger className="h-9 min-w-40" aria-label="Filter by state">
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="start">
          <SelectGroup>
            {Object.entries(regionItems).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      <Select
        name="centre"
        items={hubItems}
        value={hubId || ALL}
        disabled={!selectedRegion}
        onValueChange={(value) =>
          apply({
            centre: value === ALL ? undefined : (value as string),
            q: searchRef.current?.value,
            state: regionId || undefined,
          })
        }
      >
        <SelectTrigger
          className="h-9 min-w-48"
          aria-label="Filter by skill centre"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="start">
          <SelectGroup>
            {Object.entries(hubItems).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      </div>

      {hasFilters ? (
        <Link
          href="/admin/trainers"
          style={{ color: TINT.blue.fg }}
          className="px-1 text-sm font-medium underline-offset-4 hover:underline"
        >
          Clear filters
        </Link>
      ) : null}
    </div>
  );
}
