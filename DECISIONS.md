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
