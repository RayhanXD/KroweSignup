# Repository Guidelines

## Project Structure & Module Organization
`app/` contains the Next.js App Router UI, route handlers, and page-specific client components. Key areas are `app/signup/` for the multi-step intake flow, `app/report/[sessionId]/` for generated report UI, `app/interviews/` for interview workflows, and `app/api/` for server endpoints. Shared logic lives in `lib/`: validation, Supabase clients, interview pipelines, and report generation. Curriculum code and its tests live in `lib/curriculum/`. Static assets are in `public/`, and database migrations are tracked in `supabase/migrations/`.

## Build, Test, and Development Commands
Use `npm run dev` to start the local Next.js server on `http://localhost:3000`. Use `npm run build` to create a production build and catch type or route issues before merging. Use `npm start` to run the production build locally. Use `npm run lint` for ESLint checks, and `npm test` or `npm run test:watch` for Vitest.

## Coding Style & Naming Conventions
This repo is TypeScript-first with `strict` mode enabled and the `@/*` path alias configured in `tsconfig.json`. Follow the existing file style: 2-space indentation in app code, semicolons, and predominantly double quotes in config and test files. Name React components in `PascalCase`, hooks like `useSignupSession` in `camelCase`, and keep route files as `page.tsx`, `layout.tsx`, or `route.ts`. Add new shared utilities under `lib/` instead of duplicating logic in route files.

## Testing Guidelines
Vitest is configured in `vitest.config.ts`. Keep tests close to the code they verify using `*.test.ts` naming, as seen in `lib/curriculum/schema.test.ts` and `lib/curriculum/filterTaskFramework.test.ts`. Cover schema parsing, pure helpers, and report or interview pipeline logic with deterministic fixtures where possible. Run `npm test` before opening a PR.

## Commit & Pull Request Guidelines
Recent history favors short, direct commit subjects such as `auth pipeline added` and `pivot mvp done`. Keep commits focused, use imperative summaries, and avoid mixing migrations, UI, and unrelated refactors in one change. PRs should explain the user-facing impact, list changed routes or tables, link the issue when available, and include screenshots for UI updates.

## Security & Configuration Tips
Secrets live in `.env.local` and are validated by `lib/env.ts`; do not commit real keys. When changing persisted data, add a new numbered SQL file under `supabase/migrations/` rather than editing old migrations.
