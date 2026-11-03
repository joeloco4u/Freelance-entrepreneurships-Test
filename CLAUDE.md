# Codebase Overview — Freelance-Entrepreneurships Marketplace

## Project Summary
Full-stack marketplace platform for Freelance Latin America's entrepreneurs to manage product catalogs and customers. Built with React, Express, and Supabase.

---

## Monorepo Structure (pnpm workspaces)
```
├── frontend/          # React 19 + Vite + TypeScript
├── backend/           # Express 5 + Node.js + TypeScript
├── biome.json         # Shared linter/formatter config
└── pnpm-workspace.yaml
```

**Root scripts:**
- `pnpm dev` — Run frontend + backend concurrently
- `pnpm dev:front` — Frontend only (Vite, port 5173)
- `pnpm dev:back` — Backend only (Express, port 3000 by default)
- `pnpm build` — TypeScript compilation + Vite build

---

## Frontend (React 19 + Vite)

**Key Dependencies:**
- `@supabase/supabase-js` — Database + Auth client
- `axios` — HTTP with interceptors
- `react-router-dom` — Navigation
- `antd` — UI components
- `tailwindcss` — Styling
- `react-toastify` — Toast notifications
- `react-loading-skeleton` — Loading states
- `xlsx` — Excel file handling

**Dev Environment:**
- `src/config/supabaseClient.ts` — Supabase anon key client
- `src/config/api.ts` — Axios instance with Bearer token injection via request interceptor
- `src/types/index.ts` — Comprehensive type definitions (User, Product, Sale, Entrepreneurship, etc.)
- Entry: `src/config/supabaseClient.ts` (reads `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)

**Scripts:**
- `pnpm dev` — Vite dev server
- `pnpm build` — Production build
- `pnpm lint` — ESLint (`eslint .`)

**Env vars:**
```
VITE_API_URL=http://localhost:3000
VITE_SUPABASE_URL=<supabase-url>
VITE_SUPABASE_ANON_KEY=<anon-key>
```

---

## Backend (Express + TypeScript)

**Key Dependencies:**
- `express` — REST API
- `@supabase/supabase-js` — Admin + Auth client
- `cors` — CORS middleware (configurable via `CORS_ORIGIN` env var)
- `express-rate-limit` — Rate limiting (60 req/min on `/api`, 10 req/min on `/api/auth`)
- `multer` — File upload middleware
- `zod` — Schema validation (used in controllers)
- `@slack/web-api` — Slack notifications
- `@googleapis/sheets` — Google Sheets integration
- `resend` — Email service

**Structure:**
- `src/index.ts` — Express app setup, middleware, route mounting
- `src/config/env.ts` — Centralized env loading + Zod validation (the only module that reads `process.env`)
- `src/controllers/` — Business logic (Auth, Product, Sale, User, etc.)
- `src/routes/` — Route definitions mounting controllers
- `src/middleware/` — `auth.ts` (JWT validation), `role.ts` (RBAC), `upload.ts` (Multer)
- `src/db.ts` — Supabase clients setup
- `src/services/` — External integrations (Slack, Google Sheets, Supabase Storage)

**Route Prefixes (all under `/api`):**
- `/api/auth` — SignupRequest, Login, GetPendingRequests, ApproveSignup, RejectSignup
- `/api/users` — User management
- `/api/categories` — Product categories
- `/api/config` — App configuration
- `/api/entrepreneur-payment-data` — Payment method storage
- `/api/entrepreneurships` — Entrepreneurship CRUD + metadata
- `/api/products` — Product CRUD
- `/api/composed-products` — Bundle products
- `/api/sales` — Sales transactions + payroll processing
- `/api/software-updates` — Changelog/versions

**Scripts:**
- `pnpm dev` — tsx watch mode
- `pnpm build` — tsc compilation
- `pnpm lint` — `biome lint .`
- `pnpm format` — `biome format --write .`
- `pnpm start` — Run dist/index.js

**Env vars:**
```
PORT=3000
SUPABASE_URL=<supabase-url>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
CORS_ORIGIN=http://localhost:5173
ALLOWED_IPS=<comma-separated-ips>
APP_URL=http://localhost:5173        # frontend base URL, used for auth redirect links
RESEND_API_KEY=<resend-key>
EMAIL_FROM=<verified-sender>
SLACK_WEBHOOK_URL_IT=<webhook>
SLACK_TOKEN_SHEET_URL=<sheet-url>
GOOGLE_SERVICE_ACCOUNT_EMAIL=<email>
GOOGLE_PRIVATE_KEY=<key>
```

Env loading is centralized in `backend/src/config/env.ts`, which resolves `backend/.env` regardless of the working directory and validates it with Zod. See `backend/.env.example` for the full annotated list.

---

## Authentication & Authorization

**Flow:**
1. Frontend calls `/api/auth/request-access` or `/api/auth/login` (public routes)
2. Supabase returns JWT access token stored in client session
3. Frontend injects token in `Authorization: Bearer <token>` header via Axios request interceptor
4. Backend `authenticate` middleware validates token with Supabase Auth
5. Role middleware (`authorize(...)`) checks `user.user_metadata.roles` array

**Middleware Pattern:**
- `authenticate` — Validates JWT, attaches `req.user` (type `User` from Supabase)
- `authorize("IT", "ADMIN")` — Restricts to specified roles
- **Role Types:** `"IT" | "ADMIN" | "PROVEEDOR" | "CONSUMIDOR"`

**Protected Route Example:**
```typescript
authRouter.get("/pending-requests", authenticate, authorize("IT"), GetPendingRequests);
```

---

## Key Conventions

**Error Handling:**
- Controllers wrap logic in try/catch, return JSON: `{ error: "message" }` or `{ message: "..." }`
- Frontend `AppError` class extends Error with optional `status` field
- Response interceptor unwraps server errors into `AppError` instances

**Validation:**
- Backend uses Zod schemas for request body validation
- Type-safe responses via TypeScript interfaces in `frontend/src/types/index.ts`

**File Uploads:**
- Multer middleware on `/api/upload` routes
- Destination: `Supabase Storage` bucket `product-images`
- Multer temp storage: OS temp directory

**Supabase Clients:**
- **Frontend:** Anon key client (user session-based auth)
- **Backend:** Service Role key client (admin operations)
- **Auth validation:** Special `supabaseAuth` instance in backend (token validation only)

**Rate Limiting:**
- Global: 60 req/min
- Auth: 10 req/min (prevents brute force)

**Code Quality:**
- Biome (formatter + linter) — replaces Prettier/ESLint
- Tab indentation, double quotes (JavaScript)
- Import organization via Biome assist
- TypeScript strict mode across both packages

---

## Notable Implementation Details

- **Multi-role users:** `user_metadata.roles` is an array; auth middleware checks any match
- **Payroll/Sale processing:** Sales marked `payroll_processed` flag (used for deductions)
- **Product ownership:** Providers can only modify products within their `entrepreneurship_id`
- **Google Sheets sync:** Backend integrates with Sheets API for payroll tracking
- **Slack notifications:** Signup requests trigger Slack webhook to IT channel

---

## Useful Commands Quick Ref

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Full-stack dev (both services) |
| `pnpm dev:front` | Frontend only |
| `pnpm dev:back` | Backend only |
| `pnpm build` | Compile TypeScript + bundle frontend |
| `pnpm --filter backend biome lint .` | Backend lint |
| `pnpm --filter backend biome format --write .` | Backend format |
| `pnpm --filter frontend eslint .` | Frontend lint |

---

## Critical Constraints

- **Never commit or push migration `.sql` files** — run migrations directly against Supabase.
- **`for...of` over `forEach`** — Biome enforces this; `forEach` calls will fail the lint check.
- **Stable `useEffect` dependencies** — arrays are compared by reference, so passing a derived array directly causes infinite re-render loops. Reduce arrays to a stable primitive first (e.g. sort IDs and join with `,`) and use that string as the dependency instead.

---

Generated with Claude Code.
