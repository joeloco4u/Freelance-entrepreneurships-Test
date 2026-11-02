# Legacy Audit Report — Sedes Project

**Baseline technical debt tracker prior to executing Phases 2, 3, and 4 of the Sedes project.**

| Field | Value |
|---|---|
| Audit date | `2026-11-01` |
| Mode | read-only static audit |
| Scope | `frontend/` and `backend/` |
| Status | Open |
| Related documents | `SEDES-MASTER-PLAN.md`, `CHANGELOG-SEDES.md` |

## Purpose and change control

This file is the permanent record of the audit findings. Each item has an ID and a Status.

- When an item is fixed, change its Status to `Closed` with the date and reference, and do not delete entries.
- New findings get the next free ID in the correct severity section.
- No code changes are made by this document.

## Severity definitions

| Severity | Definition |
|---|---|
| Critical | Exploitable or corrupts money, inventory, or PII. |
| High | Trust, data integrity, or authorization break with realistic preconditions. |
| Medium | Correctness, performance, or operability issue with workarounds. |
| Low | Cosmetic, hygiene, or documentation issue. |

## Executive summary

| Severity | Total | Original Codebase | Sedes |
|---|---|---|---|
| Critical | 3 | 3 | 0 |
| High | 10 | 8 | 2 |
| Medium | 15 | 10 | 5 |
| Low | 14 | 5 | 9 |

### Top five risks

1. Authorization roles are read from `user_metadata`, which the signed-in user can write.
2. A public batch endpoint returns entrepreneur payment PII.
3. Sale creation is non-atomic and depends on an unversioned trigger.
4. Bulk payroll and refunds can act on rows hidden by non-sede filters.
5. Delete endpoints for products, composed products, and entrepreneurships lack ownership checks.

## Section A — Original Codebase (Legacy)

### A1. Critical

**C1 — Authorization roles come from user-writable `user_metadata`**

- **Scope:** Original Codebase
- **Status:** `Open`
- **Evidence:** `backend/src/middleware/role.ts` reads `user.user_metadata.roles`; roles are written in `backend/src/controllers/UserController.ts` and `backend/src/controllers/AuthController.ts`.
- **Impact:** Supabase lets the signed-in user edit `user_metadata` via `auth.updateUser`, so a CONSUMIDOR can attempt to set `roles: ["ADMIN"]` and satisfy `authorize("ADMIN")` on sales, users, config, and refund routes.
- **Recommendation:** Store roles in `app_metadata` or a DB `user_roles` table, read only that source in `authorize`, and block client writes to the old key.

**C2 — Public endpoint leaks entrepreneur payment data**

- **Scope:** Original Codebase
- **Status:** `Open`
- **Evidence:** `backend/src/routes/entrepreneurPaymentDataRoutes.ts` mounts `POST /batch` before `authenticate`; `backend/src/controllers/EntrepreneurPaymentDataController.ts` returns Binance ID/email and Pago Móvil bank/phone/cédula for the owners of any submitted product IDs.
- **Impact:** Product IDs are public; anyone can enumerate products and harvest financial identifiers. Rate limiting does not prevent targeted harvesting.
- **Recommendation:** Require authentication or a kiosk session, return only the method in use with minimal fields, and consider a checkout-scoped RPC.

**C3 — Non-atomic sale creation with an unversioned stock trigger**

- **Scope:** Original Codebase
- **Status:** `Open`
- **Evidence:** `backend/src/controllers/SaleController.ts` validates, inserts `sales`, inserts `sale_items`, relies on the `reduce_stock_on_sale` trigger (referenced only in a comment), then re-reads stock and only logs negatives. No transaction and no row locks.
- **Impact:** Concurrent checkouts can oversell; partial writes are possible; the trigger body is not in the repository and cannot be reviewed.
- **Recommendation:** Use one transactional RPC with row locks and typed errors; remove or neutralize the trigger's deduction role; version the trigger and all migrations before changing them.

### A2. High

**H1 — Public consumer directory (PII)**

- **Scope:** Original Codebase
- **Status:** `Open`
- **Evidence:** `backend/src/routes/userRoutes.ts` exposes `GET /users/consumers` before `authenticate`; `getPublicConsumers` in `backend/src/controllers/UserController.ts` returns id, email, name, and departamento for every CONSUMIDOR.
- **Impact:** Employee directory enumeration.
- **Recommendation:** Require authentication or a kiosk credential; return only the fields checkout needs.

**H2 — Public endpoint exposes entrepreneur emails**

- **Scope:** Original Codebase
- **Status:** `Open`
- **Evidence:** `backend/src/routes/entrepreneurshipRoutes.ts` serves `/public`; `getActiveEntrepreneurships` in `backend/src/controllers/EntrepreneurshipController.ts` selects `users(id, name, email)`.
- **Impact:** Owner emails are public.
- **Recommendation:** Remove `email` from the public projection.

**H3 — Missing ownership checks on destructive endpoints**

- **Scope:** Original Codebase
- **Status:** `Open`
- **Evidence:** `deleteProduct` has no owner check and the route allows any PROVEEDOR; `deleteComposedProduct` has the same gap; `deleteEntrepreneurship` has no owner check and the route allows PROVEEDOR despite the IT-only comment.
- **Impact:** Cross-tenant deletion of products, combos, and entrepreneurships.
- **Recommendation:** Resolve `owner_id` and compare with `req.user.id`; restrict entrepreneurship deletion to IT/ADMIN unless explicitly owner-scoped.

**H4 — Hardcoded default password for IT-created users**

- **Scope:** Original Codebase
- **Status:** `Open`
- **Evidence:** `backend/src/controllers/UserController.ts` uses `"PasswordTemporal123!"` with `email_confirm: true`.
- **Impact:** Known credential until changed.
- **Recommendation:** Use a random password or invite link, plus forced reset on first login.

**H5 — Batch refunds restore the wrong stock for composed products**

- **Scope:** Original Codebase
- **Status:** `Open`
- **Evidence:** `processSingleRefund` in `backend/src/controllers/SaleController.ts` increments the item product's `current_stock`; the single-refund path handles composed components, the batch path does not.
- **Impact:** Refunding a combo inflates the combo row and never restores component stock, producing phantom inventory loss.
- **Recommendation:** Unify both refund paths behind one atomic helper that restores component rows.

**H6 — Public sale creation trusts `consumer_id`**

- **Scope:** Original Codebase
- **Status:** `Open`
- **Evidence:** `POST /api/sales` is unauthenticated and `createSale` accepts `consumer_id` from the body.
- **Impact:** Combined with H1, anyone can attribute purchases and payroll deductions to any employee.
- **Recommendation:** Authenticate the buyer or kiosk, derive the consumer server-side, or use a signed kiosk token.

**H9 — Mass assignment in composed-product update**

- **Scope:** Original Codebase
- **Status:** `Open`
- **Evidence:** `updateComposedProduct` in `backend/src/controllers/ComposedProductController.ts` starts from `{ ...req.body }` and deletes only a few keys.
- **Impact:** Arbitrary columns can be written (for example `current_stock`, `created_at`, `id`), corrupting records and bypassing the whitelist used by `ProductController.updateProduct`.
- **Recommendation:** Apply an explicit allowed-fields list.

**H10 — No pagination on heavy reads**

- **Scope:** Original Codebase
- **Status:** `Open`
- **Evidence:** `GET /sales` returns all sales with nested sale items, products, entrepreneurships, and users; `GET /products/public`, `GET /users/consumers`, and `GET /sales/consumer/:id` are unbounded. The admin pages fetch the full list three times (dashboard, entrepreneurs, consumers).
- **Impact:** Payload, DB/CPU, rendering cost, and PII exposure grow linearly.
- **Recommendation:** Add server-side pagination with date and sede filters, plus a summary endpoint for dashboards.

### A3. Medium

| ID | Scope | Finding | Evidence | Recommendation | Status |
|---|---|---|---|---|---|
| M5 | Original | Dashboard "Pendiente Liquidar" includes immediate sales, inflating pending payroll. | `useGeneralStats.ts` filters only `!payroll_processed && !refunded`. | Exclude `payment_type === "immediate"`, as the table summaries already do. | Open |
| M6 | Original | 207 partial batch responses are treated as success. | `updatePayrollStatusBatch` / `refundSaleBatch` return 207 with per-id failures; the axios interceptor resolves it. | Inspect `results[]` and surface partial failures. | Open |
| M7 | Original | `roles.includes` can throw when a user has no `roles` array. | Several controllers assume `user_metadata.roles` (sales by entrepreneurship, entrepreneurship update, product update). | Use `roles ?? []` consistently. | Open |
| M8 | Original | N+1 queries in composed-stock enrichment and sale creation. | `enrichComposedStock` runs per product; `createSale` queries per item and per component. | Batch-fetch components and products per request. | Open |
| M9 | Original | Checkout latency from sequential notifications. | Consumer, seller, and Slack notifications are awaited before the 201 response in `SaleController.createSale`. | Queue notifications or respond after the DB commit. | Open |
| M10 | Original | No error boundary; a render error white-screens the SPA. | `frontend/src/App.tsx` has no boundary. | Add a top-level boundary with a Spanish fallback. | Open |
| M11 | Original | SVG uploads allowed in a public bucket. | `backend/src/middleware/upload.ts` accepts `image/*`. | Allow only png/jpeg/webp or sanitize SVG. | Open |
| M13 | Original | `useCart.addToCart` ignores stock and inserts quantity 1 unconditionally. | `frontend/src/hooks/useCart.ts`; the UI disables the button but the hook invariant is wrong. | Clamp or refuse at zero stock inside the hook. | Open |
| M14 | Original | No tests and no CI. | Repository has no test runner or workflow. | Add integration coverage for sales, refunds, payroll, and sede filtering before Phase 4. | Open |
| M15 | Original | Catalog errors are not surfaced. | `useCatalog` returns `error`, but `CatalogPage` never renders it. | Show an inline error with retry. | Open |

### A4. Low

| ID | Scope | Finding | Recommendation | Status |
|---|---|---|---|---|
| L10 | Original | Root build scripts run `vite build` / `tsc` at the workspace root where neither binary is declared; `pre-build` uses `rm -rf` and is not a real npm lifecycle hook. | Use filtered pnpm commands and `prebuild`. | Open |
| L11 | Original | Port default is 3001 in code while README/AGENTS and the Vite proxy assume 3000. | Align on one value. | Open |
| L12 | Original | Both `package-lock.json` and `pnpm-lock.yaml` exist. | Pin pnpm and remove the stray lockfile. | Open |
| L13 | Original | `index.html` preconnect URLs are literal `<VITE_SUPABASE_URL>` placeholders. | Replace with real origins or remove. | Open |
| L14 | Original | `xlsx@0.18.5` has known CVEs; used only for writing exports. | Track a maintained build or migrate the export path. | Open |

### A5. Informational (Original)

- `import.meta.env` is untyped (no `vite-env.d.ts`).
- `useAuth`, `useDashboard`, and `CatalogHeader` each maintain their own Supabase auth subscription.
- `useAuth` and `useDashboard` disagree on `role` vs `roles` precedence.
- `GET /products/public` and `GET /sales` lack pagination (already captured in H10).

## Section B — Sedes Feature Notes (Phase 1 & 5)

These are not legacy debt. They are observations on the new feature, including interactions with legacy code. The sede filter reset itself works; the interaction issues are marked clearly.

### B1. High

**H7 — Bulk payroll/refund can process rows hidden by non-sede filters**

- **Scope:** Sedes interaction (root cause in legacy selection model)
- **Status:** `Open`
- **Evidence:** `useAdminData` clears selection only through `clearSelection`, called from `resetScopeState` on sede changes. Changing status, payment method, month, date range, or search does not clear `selectedSales`. `AdminEntrepreneurs` sends the full selection to payroll; `AdminConsumers` does the same.
- **Impact:** A user selects rows, changes a filter so those rows are hidden, then processes payroll or a refund on invisible sales; the bulk banner shows only a count.
- **Recommendation:** Clear selection on every filter change, or intersect selection with visible IDs; add the existing confirmation modal to the consumers bulk action.

**H8 — Real-mode sede switch changes branding but not data (latent)**

- **Scope:** Sedes
- **Status:** `Open`
- **Evidence:** `useCatalog` fetches with `getActiveProducts()` and an effect with empty deps; `location` only affects the mock derivation. `useCheckout` does not send a sede.
- **Impact:** Misleading UI today; a cross-sede data bug once Phase 2/4 add sede-scoped APIs.
- **Recommendation:** Keep the real catalog path blocked on Phase 2/3 and avoid presenting the switcher as functional in real mode until then.

### B2. Medium

| ID | Scope | Finding | Evidence | Recommendation | Status |
|---|---|---|---|---|---|
| M1 | Sedes | Multi-tab sede divergence; no storage listener; last-writer-wins, re-read only on load. | `frontend/src/hooks/useSede.ts`. | Add a storage listener with cart reset in Phase 3, or keep the documented limitation. | Open |
| M2 | Sedes | Onboarding is mounted only on the catalog route; a user who lands on `/dashboard` never chooses a sede. | `LocationPromptModal` is rendered only in `CatalogPage`. | Decide whether onboarding is global or explicitly catalog-only, and document it. | Open |
| M3 | Sedes | Client-side sede filtering is not authorization; all sales are fetched and filtered in the browser. | `useAdminData` filters `scopedSales` after `GET /sales`. | Enforce server-side scope when Phase 2 lands; label it a view filter. | Open |
| M4 | Sedes | Partial `location_id` rollout hides legacy sales under VF/GO, so filtered totals do not sum to "Todas". | `useAdminData` filters `sale.location_id === sedeFilter`. | Treat missing location as VF during rollout or surface a "Sin sede" state. | Open |
| M12 | Sedes interaction | Consumers bulk payroll has no confirmation modal, unlike entrepreneurs. | `AdminConsumers` calls `processPayroll(selectedSales)` directly. | Reuse the existing `ConfirmationModal` pattern. | Open |

### B3. Low

| ID | Scope | Finding | Recommendation | Status |
|---|---|---|---|---|
| L1 | Sedes | Static `Modal.confirm` logs an AntD dev warning because there is no `<App>`/`ConfigProvider`; the dialog lives in its own root. | Use `App.useApp().modal` or a controlled modal; production is unaffected. | Open |
| L2 | Sedes | `autoFocus` on the first onboarding card means Enter selects Valle Frío accidentally. | Focus the modal container instead. | Open |
| L3 | Sedes | A blocked `localStorage.setItem` silently keeps the choice in memory only; the modal reappears after reload. | Show a subtle "no se pudo guardar en este equipo" note or document it. | Open |
| L4 | Sedes | `hq_location` has no version or namespace. | Version the key or store a small object. | Open |
| L5 | Sedes | The onboarding modal is a 760 px centered dialog, not literally full-screen; the mask is full-viewport. | Confirm the intended visual with design. | Open |
| L6 | Sedes | The Sede column filter exists only on desktop tables; mobile is intentionally on standby. | Document as a known gap until the mobile pass. | Open |
| L7 | Sedes | The Sede header `Select` increases header row height. | Consider moving the control to the filter row if it looks heavy. | Open |
| L8 | Sedes | Product lists show only the VF stock mirror; GO availability is not visible outside the form. | Add a VF/GO stock cell in a later pass. | Open |
| L9 | Sedes | The mock catalog cache is not invalidated after a product edit; the catalog updates on reload only. | Invalidate the cache in mock save/delete if demoing that flow. | Open |

## Section C — Master plan compliance (Phase 1 & 5)

| Rule / criterion | Status | Note |
|---|---|---|
| Rule 6: onboarding + `localStorage` (`hq_location`), no IP/QR/URL | Compliant | Code and plan match. |
| First-visit modal is unskippable | Mostly compliant | No dismiss path, but onboarding is catalog-only (M2); browser Back leaves the page. |
| Sede choice persists on the machine | Compliant | Guarded read/write; storage failure degrades gracefully. |
| Switching sede requires confirmation and clears the cart | Compliant | Single `chooseSede` path; no single-tab race. |
| Sede is a preference, not authorization | Compliant | Documented and implemented. |
| Phase 5: default `Todas`, resets on reload/navigation | Compliant | Page-local state. |
| Phase 5: Sede column in Entrepreneurs, Consumers, both Sales tables | Compliant | Desktop only; mobile standby. |
| Phase 5: filtered VF + GO totals equal unfiltered | Not guaranteed | Fails for sales without `location_id` (M4). |
| Phase 5: "a selection cannot survive a filter change" | Partially violated | Only the sede filter resets selection (H7). |
| Phase 5: Sede UI hidden without `location_id` | Compliant | `hasLocationData` gate. |
| Phase 5: GO settings inert, no keys | Compliant | Disabled block, no request, no keys. |
| Phase 5: product matrix mock-only, real unchanged | Compliant | Real mode keeps the single stock field. |
| No emojis / Spanish UI copy | Compliant | Verified on touched files. |

## Section D — Recommended remediation order

1. **Before any production data:** C1 (roles), C2 (payment PII), C3 (atomic sale + trigger versioning).
2. **Before Phase 2:** H3 (ownership), H5 (batch refund components), H9 (mass assignment), H8/M3/M4 (sede scoping contract).
3. **Before Phase 3:** H7 (selection reset across all filters), M5, M6, H1/H2 (PII minimization).
4. **Before Phase 4:** H10/M8/M9 (pagination, batching, async notifications).
5. **Continuous:** M14 (tests/CI), M10 (error boundary), L10-L12 (build hygiene).

## Section E — Pre-demo checklist (Sedes)

1. Reset `hq_location` in DevTools or use a fresh incognito window before the first-visit demo.
2. Confirm `pnpm install` is clean and `pnpm dev:front` boots in mock mode.
3. Verify the modal has no dismiss path and both cards are keyboard-focusable.
4. Test stored values: `vf` resolves VF, `xx` re-opens onboarding, empty re-opens onboarding.
5. Test switching sede with a non-empty cart: Cancel preserves, OK empties and closes the drawer.
6. In admin tables, do not run bulk actions after changing a non-sede filter while rows are selected (H7).
7. Confirm the GO settings block is disabled and cannot save.
8. Do not use old `?sede=` URLs; they are inert.

## Appendix — Verification baseline

- Static review only; no runtime load testing.
- No test suite or CI in the repository; findings are not covered by automated regression.
- `tsc --noEmit` at the known 9-error baseline; ESLint clean on Sedes-touched files.
- Confirm dependencies with a clean `pnpm install` before the demo.
