/**
 * Shared by the server data accessor and the client filter controls, so this
 * module must stay free of `server-only` imports.
 */

export const SORT_OPTIONS = {
  recent: "Most recent",
  score_asc: "Lowest score",
  score_desc: "Highest score",
  time_asc: "Fastest time",
} as const;

export const STATUS_OPTIONS = {
  all: "All statuses",
  failed: "Not qualified",
  passed: "Qualified",
} as const;

export type SortKey = keyof typeof SORT_OPTIONS;
export type StatusKey = keyof typeof STATUS_OPTIONS;

export function parseSort(value: unknown): SortKey {
  return typeof value === "string" && value in SORT_OPTIONS
    ? (value as SortKey)
    : "score_desc";
}

export function parseStatus(value: unknown): StatusKey {
  return typeof value === "string" && value in STATUS_OPTIONS
    ? (value as StatusKey)
    : "all";
}
