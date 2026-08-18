import { NextResponse } from "next/server";
import { z } from "zod";

import { getAttemptTokenHash } from "@/features/exam/server/attempt-session";
import {
  createServerSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";

const eventSchema = z.object({
  clientOccurredAt: z.string().datetime({ offset: true }),
  dedupeKey: z.uuid(),
  eventType: z.enum([
    "page_hidden",
    "window_blurred",
    "fullscreen_exited",
    "connection_lost",
    "connection_restored",
    "attempt_resumed",
  ]),
});

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ message: "Backend unavailable." }, { status: 503 });
  }

  const origin = request.headers.get("origin");
  const expectedHost =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");

  if (origin && expectedHost && new URL(origin).host !== expectedHost) {
    return NextResponse.json({ message: "Invalid request origin." }, { status: 403 });
  }

  let requestBody: unknown;

  try {
    requestBody = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  const parsedEvent = eventSchema.safeParse(requestBody);

  if (!parsedEvent.success) {
    return NextResponse.json({ message: "Invalid attempt event." }, { status: 400 });
  }

  const attemptTokenHash = await getAttemptTokenHash();

  if (!attemptTokenHash) {
    return NextResponse.json({ message: "Session expired." }, { status: 401 });
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.rpc("record_guest_attempt_event", {
    p_attempt_token_hash: attemptTokenHash,
    p_client_occurred_at: parsedEvent.data.clientOccurredAt,
    p_dedupe_key: parsedEvent.data.dedupeKey,
    p_event_type: parsedEvent.data.eventType,
  });

  if (error) {
    console.error("Unable to record guest attempt event", {
      code: error.code,
      message: error.message,
    });
    return NextResponse.json({ message: "Event was not recorded." }, { status: 409 });
  }

  // The attempt is submitted server-side once the test's tab-switch allowance
  // is passed. The tally comes back so the exam screen can tell the candidate
  // how many switches they have left before that happens.
  const outcome = z
    .object({
      autoSubmitted: z.boolean(),
      maxTabSwitches: z.number().int().nonnegative().nullable(),
      tabWarningCount: z.number().int().nonnegative(),
    })
    .safeParse(data);

  if (!outcome.success) {
    return NextResponse.json({
      autoSubmitted: false,
      maxTabSwitches: null,
      tabWarningCount: 0,
    });
  }

  return NextResponse.json(outcome.data);
}
