import "server-only";

import { z } from "zod";

import type { ReportId } from "@/features/admin/reports";
import { getAdminSessionTokenHash } from "@/features/auth/server/admin-session";
import {
  createServerSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";

const reportSchema = z.object({
  generatedAt: z.string(),
  report: z.string(),
  rows: z.array(z.record(z.string(), z.unknown())),
});

export type AdminReport = z.infer<typeof reportSchema>;

export async function getAdminReport({
  from,
  report,
  to,
}: {
  from?: string | null;
  report: ReportId;
  to?: string | null;
}): Promise<AdminReport | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const sessionTokenHash = await getAdminSessionTokenHash();

  if (!sessionTokenHash) {
    return null;
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_admin_report", {
    p_from: from || null,
    p_report: report,
    p_session_token_hash: sessionTokenHash,
    p_to: to || null,
  });

  if (error) {
    console.error("Unable to build the report", {
      code: error.code,
      message: error.message,
    });
    return null;
  }

  const parsed = reportSchema.safeParse(data);

  if (!parsed.success) {
    console.error("Report did not match the expected shape");
    return null;
  }

  return parsed.data;
}

const countsSchema = z.object({
  attempts: z.number(),
  centres: z.number(),
  questions: z.number(),
  trainers: z.number(),
});

export type ReportCounts = z.infer<typeof countsSchema>;

export async function getAdminReportCounts({
  from,
  to,
}: {
  from?: string | null;
  to?: string | null;
}): Promise<ReportCounts | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const sessionTokenHash = await getAdminSessionTokenHash();

  if (!sessionTokenHash) {
    return null;
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_admin_report_counts", {
    p_from: from || null,
    p_session_token_hash: sessionTokenHash,
    p_to: to || null,
  });

  if (error) {
    console.error("Unable to count report rows", {
      code: error.code,
      message: error.message,
    });
    return null;
  }

  const parsed = countsSchema.safeParse(data);

  return parsed.success ? parsed.data : null;
}
