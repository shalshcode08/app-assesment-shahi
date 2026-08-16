import { NextResponse, type NextRequest } from "next/server";

import { getAdminLeaderboard } from "@/features/admin/data/get-admin-leaderboard";
import { parseSort, parseStatus } from "@/features/admin/leaderboard-options";

const HEADERS = [
  "Rank",
  "Name",
  "Email",
  "State",
  "Skill centre",
  "Score",
  "Maximum score",
  "Percentage",
  "Outcome",
  "Time (seconds)",
  "Tab warnings",
  "Submitted at",
];

/** Escapes a value for CSV: quote it, and double any quotes inside. */
function cell(value: string | number | null) {
  const text = value === null ? "" : String(value);

  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const leaderboard = await getAdminLeaderboard({
    search: params.get("q") ?? undefined,
    sort: parseSort(params.get("sort")),
    status: parseStatus(params.get("status")),
  });

  if (!leaderboard) {
    return NextResponse.json({ message: "Not authorised." }, { status: 401 });
  }

  const lines = [
    HEADERS.map(cell).join(","),
    ...leaderboard.rows.map((row) =>
      [
        row.rank,
        row.name,
        row.email,
        row.region,
        row.hub,
        row.scoreObtained,
        row.maximumScore,
        row.scorePercentage,
        row.qualified ? "Qualified" : "Not qualified",
        row.durationSeconds,
        row.tabWarningCount,
        row.submittedAt,
      ]
        .map(cell)
        .join(","),
    ),
  ];

  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(lines.join("\r\n"), {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="trainer-leaderboard-${stamp}.csv"`,
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
}
