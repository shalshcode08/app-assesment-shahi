# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Trainer candidates who sign in with their name, trainer email address, state or region, and assigned training center or hub before taking an assessment.

## Product Purpose

Provide a clear, dependable flow for candidates to authenticate, complete a timed trainer assessment, review their responses, and submit an attempt. Success means the candidate can stay focused on answering questions and always understands their progress, remaining time, and available actions.

## Operating Context

Candidates enter through a dedicated login screen and continue into a formal online test-taking environment. The assessment includes multiple-choice questions, question navigation, answer status, flagged questions, progress, and a countdown timer.

## Capabilities and Constraints

- Built as a Next.js App Router application with shadcn UI primitives.
- Supabase PostgreSQL is the selected managed backend service.
- Candidate access is an unverified guest session rather than account authentication.
- Candidate identity, location, questions, attempt state, timing, scoring, and results are backend-owned.
- The assessment experience must remain conventional, professional, calm, and immediately recognizable as a test-taking screen.
- Decorative, playful, experimental, or visually distracting treatments are out of scope.
- The development server must not be started during agent work.

## Brand Commitments

- Use the supplied Shahi logo from `public/assets/logo.png`.
- Preserve the restrained neutral interface and blue primary action established by the login screen.
- Interface copy should be direct and functional.

## Evidence on Hand

- Shahi logo asset at `public/assets/logo.png`.
- Login and exam interface fixtures in the current project.
- The initial backend data model and guest-session boundary are implemented.
- The approved production question workbook has not yet been provided or imported.

## Product Principles

- Keep the candidate focused on the current question.
- Make time, progress, and navigation status continuously understandable.
- Use familiar assessment conventions instead of novel interaction patterns.
- Keep the structure ready for real candidate, question, and attempt data later.

## Accessibility & Inclusion

Use semantic form controls, visible keyboard focus, sufficient contrast, clear selected and disabled states, and status cues that do not rely on color alone.
