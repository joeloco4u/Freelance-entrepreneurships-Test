# AGENTS.md

## Monorepo Commands

```bash
pnpm dev          # Run frontend + backend concurrently
pnpm dev:front    # Frontend only (Vite dev server)
pnpm dev:back     # Backend only (tsx watch)
pnpm build        # Build both: vite build + tsc
```

## Backend-only Commands

```bash
cd backend
pnpm lint         # biome lint .
pnpm format       # biome format --write .
pnpm build        # tsc output to dist/
```

## Required Environment Setup

Both `backend/.env` and `frontend/.env` must exist for real (non-mock) mode. Key vars:
- **Backend**: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PORT=3000`, `SLACK_TOKEN_SHEET_URL`
- **Frontend**: `VITE_API_URL=http://localhost:3000`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- **Frontend (optional)**: `VITE_MOCK_MODE` — `true` | `false`. Unset or `true` keeps mock mode ON during `vite dev` (no `.env`, Supabase project, or backend needed); `false` disables it. Always OFF in production builds — **never set it in a production build job**. See `frontend/README.md` ("Desarrollo local sin backend").

## Supabase Storage

Image uploads require a public bucket named `product-images` with RLS policies for authenticated INSERT/UPDATE.

## Code Style

- Biome config uses **tabs** for indentation and **double quotes** for JS
- Apply with `pnpm format` in backend (frontend uses ESLint/Prettier via Vite)

## Build Policy

Do NOT run `pnpm build` or `tsc --noEmit` automatically after every change. Only run builds when the user explicitly requests it, or when testing/verification is part of the task.

## .env Files

Never read, write, or request access to `.env` files. The developer handles all `.env` changes manually. If a new environment variable is needed, document it in this file and notify the developer with the exact key and expected value so they can add it themselves.

## Filesystem Access

Never request access to directories outside the project scope (the repository root). All operations must be contained within the project directory. If a tool requires external directory access, deny the request and find an alternative approach.

## Project Agents (`.opencode/agents/`)

Subagents defined in `.opencode/agents/` can be invoked via `@name`:

| Agent | Description | Tools |
|-------|-------------|-------|
| `@docs-writer` | Writes and maintains project documentation for features, APIs, and components | write, edit |
| `@security-auditor` | Audits codebase for vulnerabilities and ensures cybersecurity best practices | read-only |
| `@implementer` | Writes production-ready code following project conventions | write, edit, bash |
| `@code-reviewer` | Reviews code for quality, best practices, security, and performance | read-only (bash for git/grep) |
| `@git-committer` | Stages specified files and creates conventional commits | bash (git) |

## Skill Discovery

Before implementing any change, search for relevant skills with the `find-skills` skill or check `available_skills` in the system prompt. Skills provide specialized instructions (accessibility, SEO, Tailwind patterns, Zod validation, Vite config, deployment, etc.) that must be followed when applicable. Always ask "is there a skill for this?" before writing code.

## Standard Operating Procedure for Code Changes

This procedure must be followed strictly every time code changes are made. **Run independent steps in parallel** whenever possible.

1. **@code-reviewer** — First, review the existing code that will be worked on to verify it is in optimal condition. If issues are found, they must be corrected before proceeding.

2. **@implementer** — Once the existing code is in good shape, proceed to implement the requested changes.

3. **@code-reviewer** + **@security-auditor** — Review the implemented code and audit for security vulnerabilities. These two steps are independent and **must run in parallel**.

### For Commits and PRs

When **@git-committer** is asked to make a commit or a pull request, this agent should only gather the information generated during the previous process (changes made, reviews, audits, and documentation) to build the commit message or PR description. It must not perform any additional review or documentation on its own.