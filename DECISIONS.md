# Technical Decisions

## 2026-08-13: Login page foundation

- Keep the route as a Server Component and isolate interactive select behavior inside the generated shadcn component.
- Use the official shadcn `login-01` block as the authentication UI baseline.
- Preserve the block structure and replace only the fields required by the product flow.
- Use neutral contrast levels for authentication text, with labels at medium contrast and icons and helper copy at low contrast, while retaining the primary blue action.
- Keep state and hub options as temporary presentation data until the backend data model is defined.

## 2026-08-13: Feature-oriented project structure

- Keep `app/` focused on routing, layouts, metadata, and page composition.
- Place domain-specific UI and supporting data under `features/<feature>`.
- Reserve `components/ui/` for reusable shadcn primitives and add broader shared components only when reuse is established.
- Avoid creating abstraction layers before they have a concrete responsibility.

## 2026-08-14: Exam workspace foundation

- Keep `/exam` as a thin route and place assessment behavior, data, and types under `features/exam`.
- Use a Server Action for the temporary login-to-exam transition so candidate details are not placed in the URL.
- Keep candidate context and assessment questions as frontend fixture data until the backend owns login sessions, exam content, and attempts.
- Use a focused assessment layout with one primary question surface, compact navigation, and restrained status indicators.

## 2026-08-14: Selected exam layout

- Use the certification-style composition at `/exam`, with the question content as the primary workspace and a persistent status palette on the right.
- Keep exam state, controls, timer, question options, and navigation as focused feature components.
- Remove the temporary comparison routes after selecting the final composition.

## 2026-08-16: Managed backend and guest assessment sessions

- Use Supabase PostgreSQL as the managed backend and keep its secret key exclusively in server code.
- Treat login details as unverified candidate claims; do not represent this flow as identity authentication.
- Protect each assessment with a random opaque token in an HTTP-only cookie and store only its SHA-256 hash.
- Route all guest database operations through Next.js server boundaries because an unauthenticated browser has no safe RLS identity.
- Persist each candidate's sampled question order and option order so reloads never reshuffle an active attempt.
- Keep answer keys in a private schema and score the complete attempt transactionally on the server.
- Start the authoritative database timer only when the candidate proceeds through the instruction modal.
