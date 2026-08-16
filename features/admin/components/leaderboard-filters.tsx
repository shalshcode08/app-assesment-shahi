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
import {
  SORT_OPTIONS,
  STATUS_OPTIONS,
  type SortKey,
  type StatusKey,
} from "@/features/admin/leaderboard-options";

export function LeaderboardFilters({
  search,
  sort,
  status,
}: {
  search: string;
  sort: SortKey;
  status: StatusKey;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const searchRef = useRef<HTMLInputElement>(null);
  const hasFilters = Boolean(search) || status !== "all" || sort !== "score_desc";

  function apply(next: { q?: string; sort?: SortKey; status?: StatusKey }) {
    const params = new URLSearchParams();
    const query = (next.q ?? search)?.trim();
    const nextStatus = next.status ?? status;
    const nextSort = next.sort ?? sort;

    if (query) params.set("q", query);
    if (nextStatus !== "all") params.set("status", nextStatus);
    if (nextSort !== "score_desc") params.set("sort", nextSort);

    const queryString = params.toString();

    startTransition(() => {
      router.push(`/admin/leaderboard${queryString ? `?${queryString}` : ""}`);
    });
  }

  return (
    <div className="flex flex-col gap-2 sm:items-end">
      <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            apply({ q: searchRef.current?.value });
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
            placeholder="Search name, email, state or centre"
            aria-label="Search the leaderboard"
            className="h-9 w-64 pl-8.5"
          />
        </form>

        <Select
          name="status"
          items={STATUS_OPTIONS}
          value={status}
          onValueChange={(value) => apply({ status: value as StatusKey })}
        >
          <SelectTrigger className="h-9 min-w-36" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="start">
            <SelectGroup>
              {Object.entries(STATUS_OPTIONS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        <Select
          name="sort"
          items={SORT_OPTIONS}
          value={sort}
          onValueChange={(value) => apply({ sort: value as SortKey })}
        >
          <SelectTrigger className="h-9 min-w-40" aria-label="Sort the leaderboard">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="start">
            <SelectGroup>
              {Object.entries(SORT_OPTIONS).map(([value, label]) => (
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
          href="/admin/leaderboard"
          style={{ color: TINT.blue.fg }}
          className="px-1 text-sm font-medium underline-offset-4 hover:underline"
        >
          Clear filters
        </Link>
      ) : null}
    </div>
  );
}
