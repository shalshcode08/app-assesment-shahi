import { NextResponse, type NextRequest } from "next/server";

import { getAdminReport } from "@/features/admin/data/get-admin-report";
import { buildWorkbook } from "@/features/admin/lib/write-workbook";
import { findReport } from "@/features/admin/reports";

const XLSX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** `2026-08-19` from a date input, or nothing when it is absent or malformed. */
function parseDate(value: string | null, endOfDay = false) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  // The window is half-open, so "to" means the end of the day the admin picked.
  if (endOfDay) {
    date.setDate(date.getDate() + 1);
  }

  return date.toISOString();
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const definition = findReport(params.get("report"));

  if (!definition) {
    return NextResponse.json({ message: "Unknown report." }, { status: 400 });
  }

  const from = parseDate(params.get("from"));
  const to = parseDate(params.get("to"), true);
  const report = await getAdminReport({ from, report: definition.id, to });

  if (!report) {
    return NextResponse.json({ message: "Not authorised." }, { status: 401 });
  }

  const rows = report.rows.map((row) => {
    // Excel has no boolean cell worth the name; Yes/No reads better in a filter.
    const cells: Record<string, unknown> = { ...row };

    for (const [key, value] of Object.entries(cells)) {
      if (typeof value === "boolean") {
        cells[key] = value ? "Yes" : "No";
      }
    }

    return cells;
  });

  const workbook = buildWorkbook([
    { columns: definition.columns, name: definition.sheetName, rows },
  ]);

  const stamp = new Date().toISOString().slice(0, 10);
  const range = from || to ? `-${params.get("from") ?? "start"}_${params.get("to") ?? "today"}` : "";

  return new NextResponse(new Uint8Array(workbook), {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="${definition.fileName}${range}-${stamp}.xlsx"`,
      "Content-Length": String(workbook.length),
      "Content-Type": XLSX_CONTENT_TYPE,
    },
  });
}
