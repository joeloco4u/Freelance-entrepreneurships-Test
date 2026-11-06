# Changelog — Multi-Location (Sedes)

> **MANDATORY RULE — DO NOT SKIP**
>
> This file **MUST be updated as the FINAL step of EVERY task or code modification** related to the **Multi-Location (Sedes)** feature.
>
> - Every entry must always include: **date** (ISO `YYYY-MM-DD`), **files added / modified / deleted**, and a **description of the logic or behavior change**.
> - **No PR or task related to Sedes is considered complete until the entry exists.**
> - Format: **newest entry first**, under `## [Unreleased]` or under dated headings.
> - **All future entries MUST be written in English.** This file is English-only from now on; entries in any other language must not be added.
>
> The pre-existing Spanish entry below was translated into English on `2026-10-31` without removing any content; all new entries must remain in English.

## [Unreleased]

### Admin Dashboard — per-sede revenue breakdown on stat cards

- **Date:** `2026-11-06`
- **Type:** `feat` (frontend)
- **Scope:** Admin Dashboard multi-location awareness. Adds a per-sede breakdown line to the admin "Ventas Globales" and "Pendiente Liquidar" stat cards. Frontend only; no backend, schema, RLS, or database changes.
- **Files added:** none.
- **Files modified:**
  - `frontend/src/components/features/dashboard/shared/StatCard.tsx`
  - `frontend/src/components/features/dashboard/hooks/useGeneralStats.ts`
  - `frontend/src/components/features/dashboard/AdminSection.tsx`
  - `frontend/src/types/index.ts`
  - `CHANGELOG-SEDES.md`
- **Description:** the admin dashboard now splits its headline revenue metrics by sede. No API or data contract changed; the breakdown is derived entirely from the sales already loaded by `useAdminData`.
  - **`StatCard` (`shared/StatCard.tsx`):** gained an optional `secondary?: ReactNode` prop. When provided, it renders after the existing description inside the same `space-y-1` block as a paragraph styled `text-[11px] text-gray-400 font-medium tabular-nums pt-0.5 leading-tight`. The prop is optional and defaults to `undefined`, so every existing consumer keeps its current rendering unchanged. Only the dashboard-scoped `frontend/src/components/features/dashboard/shared/StatCard.tsx` was touched; the separate shared component at `frontend/src/components/shared/StatCard.tsx` was not modified.
  - **`useGeneralStats` (`hooks/useGeneralStats.ts`):** now computes `revenueBySede` and `pendingBySede` (both typed `SedeBreakdown = { VF, GO, unassigned }`) in the same single pass over `sales` that already produced `totalRevenue` and `pendingPayroll`. Each sale contributes to exactly one bucket per metric, so `VF + GO + unassigned` always equals the headline value for both metrics. Both breakdowns are exposed on `adminStats`.
  - **Sede normalization:** `sale.location_id` is normalized with `trim().toUpperCase()` before being classified with `isLocationCode`. Missing, empty, or unknown values fall into the `unassigned` bucket; they are never coerced to `VF`.
  - **Pending predicate correction (intentional behavior change):** the `pendingPayroll` predicate was corrected to the canonical credit-only rule `payment_type !== "immediate" && !payroll_processed && !refunded`, matching `useAdminData` and the backend's refusal to liquidate immediate-payment sales. This is an intentional change to what the "Pendiente Liquidar" card reports: immediate-payment sales no longer inflate the pending total, and refunded sales are excluded. The per-sede `pendingBySede` buckets use the same rule.
  - **Gross revenue preserved:** `totalRevenue` intentionally remains gross (`sum(sale.total)`) and is unchanged by this work; the per-sede revenue buckets are accumulated with the same rule, so they sum to the same gross figure.
  - **`AdminSection` (`AdminSection.tsx`):** renders `VF: $X • GO: $Y` as the `secondary` line on the "Ventas Globales" (from `revenueBySede`) and "Pendiente Liquidar" (from `pendingBySede`) cards. It appends `Sin sede: $Z` only when `unassigned > 0`, and suppresses the whole line (passing `null`) when all three buckets are zero. Values are formatted with the existing `formatCurrency` helper.
  - **`GeneralDashboard.tsx`:** unchanged. It already forwards `stats.adminStats` to `AdminSection` as a whole, so the two new `adminStats` fields flow through without a code change.
  - **Type placement:** `SedeBreakdown` lives in `frontend/src/types/index.ts`; both the hook and `AdminSection` import it with `import type`.
- **Verification:** ESLint passes on the touched files. No build or type-check was run, per the project Build Policy. Code review and security audit returned PASS with only low-priority nits; the `text-[11px] text-gray-400` contrast follows the product's explicit styling request.

### Phase 5 — frontend per-sede stock matrix modal (desktop table, mobile cards, search)

- **Date:** `2026-11-05`
- **Type:** `feat` (frontend)
- **Scope:** Phase 5 (frontend half). Adds the entrepreneur-facing per-sede stock matrix modal that reads and writes the completed backend matrix contract. Frontend only; no backend, schema, RLS, or database changes.
- **Files added:**
  - `frontend/src/hooks/useStockMatrix.ts`
  - `frontend/src/constants/stock.ts`
  - `frontend/src/components/features/my-entrepreneurships/EntrepreneurShipsMenu/products/StockMatrixModal.tsx`
  - `frontend/src/components/features/my-entrepreneurships/EntrepreneurShipsMenu/products/StockMatrixTable.tsx`
  - `frontend/src/components/features/my-entrepreneurships/EntrepreneurShipsMenu/products/StockMatrixCardsMobile.tsx`
- **Files modified:**
  - `frontend/src/types/index.ts`
  - `frontend/src/services/productService.ts`
  - `frontend/src/hooks/useProducts.ts`
  - `frontend/src/components/shared/BaseFormModal.tsx`
  - `frontend/src/components/shared/SearchInput.tsx`
  - `frontend/src/components/features/my-entrepreneurships/EntrepreneurShipsMenu/products/ProductHeader.tsx`
  - `frontend/src/components/features/my-entrepreneurships/EntrepreneurShipsMenu/products/MyProducts.tsx`
  - `frontend/src/constants/errorMessages.ts`
  - `CHANGELOG-SEDES.md`
  - `SEDES-MASTER-PLAN.md`
- **Description:** the frontend half of the Phase 5 stock matrix is now in the working tree.
  - **Integration point:** the entrepreneur opens the modal with the new secondary "Editar stock" action in `ProductHeader` on `/dashboard/entrepreneurships/:id/products`. The button is disabled when the entrepreneurship has no simple products (`hasEditableProducts` derived from `allProducts`). `MyProducts` conditionally mounts `StockMatrixModal` only while open (`isStockModalOpen`), so the hook fetches only while the modal is open and tears down cleanly on close. After a successful save, `MyProducts` calls `refreshProducts` via the modal's `onSaved`.
  - **Data and scope:** `useStockMatrix` calls `getEntrepreneurshipProducts` for the entrepreneurship and keeps only `!is_composed` products. Composed products are excluded because their availability is computed from components; the modal shows a note explaining this and counts them via `composedCount`. `StockMatrixItem` / `StockMatrixPayload` / `StockMatrixResponse` were added to `frontend/src/types/index.ts`, and `getEntrepreneurshipProducts` now accepts an optional `AbortSignal`.
  - **Per-sede cells:** each simple product renders a `VF` (Valle Frío) and a `GO` (Grano de Oro) cell, each with an AntD `Switch` labeled "Ofrecer" and a numeric stock input. Desktop uses `StockMatrixTable`; mobile uses `StockMatrixCardsMobile`. Both are rendered and CSS-hidden (`hidden md:block` / `md:hidden`). The stock input is disabled when the sede is not offered. Per-cell helper text makes the semantics explicit: offered off shows "No ofrecido", offered on with stock `0` shows "Agotado" (the product stays visible in that sede's catalog). The modal banner explains that stock `0` means sold out but still visible, and that disabling "Ofrecer" deletes the `product_stock` row so the product disappears from that sede.
  - **State model:** one draft map keyed by product id holds `{ VF: { offered, stock }, GO: { offered, stock } }`, with a cloned baseline snapshot and a dirty diff. Only products whose cells differ from the baseline are submitted, and both sedes are always sent for each submitted product. An empty payload is never sent. The dirty count is capped at `MAX_STOCK_MATRIX_ITEMS = 200`, matching the backend `StockMatrixSchema` cap; over-limit state disables submit and shows a limit message. Stock is clamped to `[MAX_STOCK, 0]` with integer truncation, where `MAX_STOCK = 2147483647` matches the backend int4 `StockCellSchema` bound.
  - **Fetch and save safety:** the load effect is abortable and race-safe (`AbortController` plus a `cancelled` flag), and resets products, draft, baseline, and composed count at the start of each load. `reload` is a no-op while a save is in flight, and `save` has a re-entrancy guard (`savingRef`) in addition to the disabled submit state. `updateProductStockMatrix` in `productService.ts` sends the payload as JSON (the Axios client appends `/api` to the backend origin).
  - **Payload contract:** `PUT /api/products/stock/matrix` with JSON `{ entrepreneurship_id, items: [{ product_id, stocks: { VF: { offered, stock }, GO: { offered, stock } } }] }`. Success returns `200 { message: "Stock actualizado correctamente", data: { updated: <number of items> } }`.
  - **Post-save refresh:** `useProducts` now exposes `allProducts` (unfiltered list) and consolidates loading into a shared `loadProducts`. `fetchProducts` shows the page skeleton and toasts on failure; `refreshProducts` runs without the skeleton and warns on failure, so the page-level skeleton never unmounts the just-saved modal and a refresh failure does not discard the success toast.
  - **Modal and input support:** `BaseFormModal` gained `2xl`/`3xl` widths, a `submitDisabled` prop, dialog ARIA (`role="dialog"`, `aria-modal`, `aria-labelledby`), focus capture and restore, Escape close, a basic Tab focus trap, and an explicit close label. `SearchInput` gained an optional `onKeyDown`, used to prevent Enter on the search field and on the numeric stock inputs from implicitly submitting the form.
  - **Error copy:** `errorMessages.ts` gained `products.stockMatrix`, `products.stockMatrixLimit`, and `products.refreshAfterStock`.
- **Behavior change:** entrepreneurs can now view and edit both sedes' offered/stock state for every simple product from a single modal reached from the products header. Offering a sede upserts its row; un-offering it removes only that sede's row. Stock `0` while offered keeps the product visible as sold out. Only changed products are written, both sedes are always included per written product, and the page list refreshes after a successful save without unmounting the modal.
- **Status:** working-tree changes only; not staged, committed, or pushed. The backend endpoint exists in local backend commit `958c2ea`; its push to the `Freelance-entrepreneurships-Test` remote is currently blocked by a server-side `commit_refs_rules` rejection, and the original repository is never targeted. No SQL or migrations were applied.
- **Verification:** `pnpm lint` in `frontend` exited 0. `pnpm exec tsc --noEmit -p tsconfig.app.json` in `frontend` reported the feature files clean, with only 5 pre-existing errors in untouched files (`EntrepreneurshipOverview.tsx:16`, `ProductFilters.tsx:41/52/63`, `UpdatesModal.tsx:60`). Code review after fixes: ready to document, no critical/high functional or security findings. Security audit: no critical/high/medium vulnerabilities; authorization remains backend-enforced, no XSS sinks, and tokens are not exposed. No browser-level manual testing was performed, and no frontend test suite exists.
- **Residual / still open:**
  - No frontend automated tests or browser QA.
  - The dialog focus trap is a basic first/last cycle and does not cover AntD portal content.
  - The desktop table and mobile cards are both mounted (CSS-hidden), so large lists can render up to roughly twice the controls.
  - Product image URLs are rendered as supplied by the backend; there is no origin allowlist.
  - Per-sede low-stock wording remains a backend follow-up.
  - Phase 5 still has other open items: admin sede filters/payroll, `products.current_stock` removal, and RLS verification.

### Phase 5 — backend per-sede stock matrix read contract and bulk update endpoint

- **Date:** `2026-11-05`
- **Type:** `feat` (backend)
- **Scope:** Phase 5 (backend half). Adds the per-sede stock read contract and a dedicated bulk stock-matrix update endpoint. Backend only; the frontend matrix modal is not started.
- **Files added:** none.
- **Files modified:**
  - `backend/src/controllers/ProductController.ts`
  - `backend/src/routes/productRoutes.ts`
  - `backend/src/schemas/schema.ts`
  - `CHANGELOG-SEDES.md`
  - `SEDES-MASTER-PLAN.md`
- **Description:** the backend half of the Phase 5 stock matrix is now in the working tree. (1) `getProductsByEntrepreneurship` (`GET /api/products/entrepreneurship/:entrepreneurship_id`) now also returns, per product, a `stocks` object shaped as `{ VF: { offered, stock }, GO: { offered, stock } }`, mirroring the existing behavior of `getAllProducts` (`GET /api/products`), while the existing `current_stock` field is preserved and still reports the stock at the requested `?sede` (defaulting to `VF`), so current consumers are unchanged. `buildStocks` maps the `product_stock` rows to those cells, defaulting an absent location to `{ offered: false, stock: 0 }`. (2) A new `updateProductStockMatrix` controller implements the dedicated bulk write path instead of overloading the multipart product route. Its contract is `PUT /api/products/stock/matrix` with JSON `{ entrepreneurship_id, items: [{ product_id, stocks: { VF: { offered, stock }, GO: { offered, stock } } }] }`, returning `200 { message: "Stock actualizado correctamente", data: { updated: <number of items> } }`. (3) `StockCellSchema`, `StockMatrixSchema`, `StockCellInput`, and `StockMatrixInput` were added to `backend/src/schemas/schema.ts`: strict objects reject unknown fields; `entrepreneurship_id` and `product_id` must be UUIDs; `items` must contain 1 to 200 entries; both `VF` and `GO` are required per item; `stock` must be an integer from 0 to 2147483647; `offered` must be boolean; and duplicate `product_id` values are rejected case-insensitively via `superRefine`. (4) The route is registered after `authenticate` and before `PUT /:id` with `authorize("ADMIN", "IT", "PROVEEDOR")` so the literal `/stock/matrix` path is not captured by `/:id`. (5) Authorization is enforced server-side: `PROVEEDOR` must own the `entrepreneurship_id`, every product must belong to that entrepreneurship, and composed products are rejected because their availability is computed, not edited. (6) Write semantics are absolute and idempotent: `offered: true` produces one bulk upsert of `product_stock` rows on `(product_id, location_id)`, while `offered: false` deletes only that location's row. (7) `products.current_stock` is best-effort synced to the `VF` value (`0` when `VF` is not offered) in batches of 20; the bridge is not read back and its failures are logged without failing the request. (8) Low-stock notification runs only for changed, still-offered cells below 5 units, deduplicated per product by keeping the smallest stock, and is fire-and-forget with error logging so it never blocks the `200` response. (9) Database errors go through `respondWithError` with stock-specific messages for `23514` and `23503`; unexpected database failures remain `500`. No RPC or migration was added — the transactional RPC was explicitly deferred.
- **Behavior change:** clients can now read both sedes' offered/stock state from the product list while `current_stock` keeps its existing per-`?sede` meaning, and administrators and providers can update the full matrix for up to 200 products in a single `PUT /api/products/stock/matrix` request. Offering a sede upserts its row; un-offering it removes only that sede's row. Repeated identical requests are safe because the values are absolute.
- **Status:** prepared for commit/push to the `Freelance-entrepreneurships-Test` remote; the original repository is never targeted. Backend-only in the working tree; the frontend modal is not started.
- **Verification:** code review and security audit both returned "safe to commit". No migrations were applied and no database changes were made. `express.json`'s default 100KB body limit was confirmed sufficient for the 200-item cap.
- **Residual / still open:**
  - No transaction spans the upsert, the delete, and the `current_stock` bridge; the transactional RPC was explicitly deferred.
  - Pre-existing app-wide `user_metadata.roles` authorization issue (not introduced by this change): roles are read from client-influenced user metadata.
  - Pre-existing `deleteProduct` IDOR.
  - Per-sede low-stock wording is not implemented yet; notifications still carry a single product-level stock value.
  - The frontend matrix modal (desktop table, mobile cards, and `SearchInput`) remains pending.
  - RLS verification on `product_stock` and integration tests for the matrix path remain open.

### Phase 4 — single-RPC checkout and legacy stock trigger disabled

- **Date:** `2026-11-05`
- **Type:** `feat` (backend, database)
- **Scope:** Phase 4 (Option A) — move sale creation onto a single transactional RPC and disable the legacy stock-deduction trigger so the invariant has exactly one owner. Prepared for the Test environment; no SQL was applied to any database from this workspace.
- **Files added:**
  - `backend/supabase/migrations/20261106_disable_reduce_stock_on_sale.sql`
- **Files modified:**
  - `backend/src/controllers/SaleController.ts`
  - `CHANGELOG-SEDES.md`
  - `SEDES-MASTER-PLAN.md`
- **Description:** two changes landed together as the backend half of Phase 4. (1) A new migration, `backend/supabase/migrations/20261106_disable_reduce_stock_on_sale.sql`, **disables** (does not drop) the legacy `reduce_stock_on_sale` trigger on `public.sale_items`. It is dated `2026-11-06` so it sorts lexicographically after `20261105_reduce_stock_on_sale.sql`. The migration uses a fail-closed `DO` block that raises if `public.sale_items` is missing, if `public.process_location_checkout` is missing, or if the trigger is missing; it skips with a notice if the trigger is already disabled, and it verifies `tgenabled='D'` after the `ALTER`. Rolling it back requires **both** (a) deploying a controller that does not call the RPC (or making the RPC stop deducting) and (b) `ALTER TABLE public.sale_items ENABLE TRIGGER reduce_stock_on_sale;`. Enabling the trigger while the RPC still deducts stock would double-deduct. The `public.process_location_checkout` function is **not yet versioned in this repository**; it must be extracted with `pg_get_functiondef` before promoting beyond Test. (2) `createSale` in `backend/src/controllers/SaleController.ts` now keeps all validation and pre-computation intact — location parsing, Zod validation, payment normalization, product/entrepreneur lookups, composed-product demand expansion, cumulative stock pre-check, and the server-side `totalAmount` derived from DB prices — but replaces the separate `sales` insert + `sale_items` insert + compensating delete with one `supabaseAdmin.rpc("process_location_checkout", { p_consumer_id, p_total, p_payment_type, p_payment_method, p_note, p_location_id, p_cart_items })` call. `p_cart_items` carries one entry per processed item as `{ product_id, quantity, unit_price, subtotal }`, and the RPC expands composed products internally; `p_total` is always server-computed from DB prices and never taken from the request body. `p_payment_method` is nulled for credit sales, and `p_note` is trimmed and nulled when empty. The RPC returns the inserted `sale_id`; the controller re-fetches the complete sale with nested consumer data, and the notification/low-stock/Slack block is unchanged. Error mapping: SQLSTATE `23503` becomes `400 "Comprador inválido o inexistente"`, `23514` becomes `409 "Stock insuficiente para completar la venta"`, and other errors are rethrown to `respondWithError`. Errors are logged server-side with `{ code, consumer_id, location, itemCount }`, and no raw SQL reaches the client. If the RPC commits but the re-fetch fails, the controller logs `{ sale_id }` and returns `201 { id }` with notifications skipped, to avoid a duplicate retry. `extractInsertedSaleId` accepts a scalar string, an array, or an object with `sale_id`/`id`.
- **Behavior change:** `POST /api/sales` now commits the sale header, its items, and the stock deduction through a single `process_location_checkout` RPC instead of the previous multi-step controller flow, and the legacy `reduce_stock_on_sale` trigger is intended to be disabled on Test. A sale therefore decrements stock exactly once, through the RPC. Validation failures and DB constraint violations map to `400`/`409` as described above.
- **Status:** working-tree changes; not committed and not pushed. The migration has **not** been applied to any database from this workspace — it is ready for the Test project.
- **Verification:** code review approved for Test with no blocking issues. Security audit cleared proceeding on Test, conditional on verifying the RPC ACL on the Test project: because the RPC is unversioned and lives only in Supabase, the repository cannot verify grants, so the operator must confirm that `anon`, `authenticated`, and `PUBLIC` cannot `EXECUTE` `public.process_location_checkout` and that only `service_role` can (for example with `has_function_privilege`), and must also confirm the trigger state is `tgenabled='D'`. No migrations were applied to any database.
- **Residual / still open:**
  - Version the `process_location_checkout` RPC definition in the repository (extract with `pg_get_functiondef`).
  - Verify the RPC ACL and `PUBLIC` execute privileges on Test.
  - Verify the trigger is disabled and a sale decrements stock exactly once, including composed products.
  - Idempotency key (optional per the plan).
  - Atomic refund increment.
  - RLS verification on `product_stock`.
  - Integration tests for the trigger/RPC path.
  - The `23503`/`23514` message ambiguity and the `400`-vs-`409` pre-check inconsistency are known follow-ups.
  - Pre-existing and out of scope: `POST /api/sales` remains public with a client-supplied `consumer_id`; no idempotency key yet; refund stock restore remains non-atomic; and `deleteSale` does not restore stock.

### Phase 2 cleanup — trigger versioned and temporary VF fallback removed

- **Date:** `2026-11-05`
- **Type:** `fix` (backend, database)
- **Scope:** Phase 2/3 — version the live stock-deduction trigger and make `location_id` mandatory on sale creation.
- **Files added:**
  - `backend/supabase/migrations/20261105_reduce_stock_on_sale.sql`
- **Files modified:**
  - `backend/src/controllers/SaleController.ts`
  - `CHANGELOG-SEDES.md`
  - `SEDES-MASTER-PLAN.md`
- **Description:** two related cleanups landed together. (1) The live `public.reduce_stock_on_sale()` PL/pgSQL function is now versioned in `backend/supabase/migrations/20261105_reduce_stock_on_sale.sql`, together with an `AFTER INSERT FOR EACH ROW` trigger named `reduce_stock_on_sale` on `public.sale_items` (`EXECUTE FUNCTION public.reduce_stock_on_sale()`). The function resolves `public.sales.location_id`, raises SQLSTATE `23502` when the sale has no location, deducts composed-product components or the simple product from `public.product_stock` filtered by `location_id`, and raises when the target row is not offered at that sede. The migration drops any trigger of the same name before creating it, so it is idempotent, but it has not been applied to any database. (2) `createSale` in `backend/src/controllers/SaleController.ts` no longer has the temporary `VF` fallback or its `console.warn`: it now calls `const location = parseLocation(req.body?.location_id);` and returns HTTP 400 `"Sede inválida o ausente"` for a missing or invalid `location_id`, before the schema parse and before any database work. `DEFAULT_LOCATION` is still imported and is still used by the refund restore paths for legacy sales that have no `location_id`.
- **Behavior change:** `POST /api/sales` now requires a valid `location_id` (`VF` / `GO`); missing or invalid values return `400` instead of silently creating a `VF` sale.
- **Status:** working-tree changes; not committed and not pushed.
- **Verification:** code review approved; security audit passed with residual findings. The reviewer ran `npx tsc --noEmit -p backend/tsconfig.json` (exit 0) and targeted Biome lint on `SaleController.ts` (only two pre-existing warnings at untouched lines). No migrations were applied to any database.
- **Residual / still open:**
  - RLS verification on `product_stock`.
  - Versioned migrations for the `locations` and `product_stock` tables.
  - Atomic refund increment RPC.
  - Integration tests for the trigger and RPC path.
  - Confirm on the live database that the existing trigger name and table match this migration before applying it, to avoid creating a duplicate trigger.
- **Policy note:** `CLAUDE.md:197` says not to commit `.sql` migrations, while `SEDES-MASTER-PLAN.md` requires versioned migrations. This file follows the plan and the conflict still needs a human decision.

### Catalog hero — decorative active-sede badge

- **Date:** `2026-11-04`
- **Type:** `feat` (frontend, visual only)
- **Scope:** public catalog banner (`CatalogHero`). No backend, API, schema, or environment changes.
- **Files added:** none.
- **Files modified:**
  - `frontend/src/components/features/catalog/CatalogHero.tsx`
- **Description:** the office manager asked for a quick visual cue on the catalog banner showing the active sede. A decorative circular badge was added as the last child of the existing `relative` banner container, positioned `absolute top-4 right-4`, rendering the active `LocationCode` (`VF` / `GO`) from the existing `sede` prop. The final styling is a **3D frosted-glass bubble** (an earlier solid brand-blue draft and a later thin-glass `bg-white/20` draft were both replaced). Final classes on line 45: `pointer-events-none select-none absolute top-4 right-4 w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center bg-white/50 backdrop-blur-xl text-slate-900 font-extrabold text-4xl md:text-5xl shadow-2xl border border-white/60 ring-1 ring-inset ring-white/30 [text-shadow:0_1px_0_rgba(255,255,255,0.65)]`. Behavior and design notes:
   - The bubble uses a more opaque frosted white (`bg-white/50`) with a stronger blur (`backdrop-blur-xl`), so the banner photo reads as diffused frost behind the lettering instead of showing through. The reflective outer edge is `border border-white/60`, the inner highlight is `ring-1 ring-inset ring-white/30`, and `shadow-2xl` provides the 3D bubble lift off the image. `bg-white/20`, `backdrop-blur-lg`, `border-white/40`, `border-4 border-white`, and the solid `bg-primary` token are all no longer used.
   - Ink is `text-slate-900`, **not** `text-white`: white text over the more opaque white glass fails the WCAG 3:1 large-text threshold on both banner overlays, while slate-900 on `bg-white/50` measures ~6.6:1 over the Valle Frío overlay and ~5.0:1 over the Grano de Oro overlay. The arbitrary utility `[text-shadow:0_1px_0_rgba(255,255,255,0.65)]` adds a top-edge highlight for depth without reducing contrast.
   - Sizing, weight, and content are unchanged: `w-20 h-20 text-4xl` on phones scaling to `md:w-24 md:h-24 md:text-5xl` on desktop, `font-extrabold`, rendering `{sede}`.
   - The banner container (line 16) is `relative h-96 md:h-80 overflow-hidden`, so the mobile hero is 384px tall while the desktop hero stays 320px. The badge size is unchanged, so these heights are unchanged.
   - The hero text wrapper (line 27) is `absolute inset-0 flex flex-col items-center justify-center text-center px-8 pt-24 md:pt-0`; the `pt-24` reserves the badge zone on mobile so the badge does not cover the centered eyebrow text ("Emprendimientos internos"), while `md:pt-0` keeps desktop centering unchanged. Both values are unchanged by this restyle.
   - The badge is `aria-hidden="true"`, `pointer-events-none select-none`, and renders the `{sede}` prop, so it adds no screen-reader output and does not intercept clicks; the hero subtitle and banner alt text remain the accessible source of the sede context. These attributes are unchanged.
   - No `z-index` was added: DOM order paints the badge above the banner image, overlay, and text, while the sticky header stays above it. Adding a stacking context here could have caused the badge to paint over the header. This is unchanged.
   - No `useSede` was introduced; the `sede` prop passed by `CatalogPage.tsx` remains the single source of truth, so the badge cannot drift from the catalog/cart sede.
   - This restyle is visual only: no layout, copy, data, or behavior of the catalog, cart, or checkout changed.
- **Status:** working-tree changes; not committed and not pushed.
- **Verification:** code review approved; security audit passed (decorative, non-interactive, no data exposure); ESLint clean on the changed file. No build was run per project build policy.

### Phase 3 — catalog and cart isolation by sede

- **Date:** `2026-11-03`
- **Type:** `feat` (frontend)
- **Scope:** Phase 3 — catalog and cart isolation by sede (frontend only; the backend contract shipped in Phase 2).
- **Files added:** none.
- **Files modified:**
  - `frontend/src/services/productService.ts`
  - `frontend/src/hooks/useCatalog.ts`
  - `frontend/src/hooks/useCheckout.ts`
  - `frontend/src/hooks/useCart.ts`
  - `frontend/src/hooks/useSede.ts`
  - `frontend/src/pages/CatalogPage.tsx`
  - `frontend/src/types/index.ts`
  - `SEDES-MASTER-PLAN.md`
- **Description:** the catalog and the cart are now bound to a single sede before any sale is submitted. Behavior changes:
  - `getActiveProducts(sede, signal?)` now requires a `LocationCode` and requests `GET /api/products/public?sede=VF|GO`, so every catalog request carries the active sede.
  - `useCatalog(sede: LocationCode | null)` does not fetch until a sede is chosen, refetches when the sede changes, and exposes a derived `settledSede` / `isStale` guard that returns an empty product list with `loading: true` until the new sede's response lands. The previous sede's products and stock can no longer render under the new header, including from page 2 or later.
  - A monotonic request token plus an `AbortController` discard late responses, and `refreshProducts` always targets the current sede through a ref, so a late post-checkout refresh cannot overwrite the active sede's data.
  - Categories are fetched independently of products; a category failure is non-fatal and keeps the last loaded categories instead of breaking the product load. The page resets to 1 on every sede change, while search, sort, hide-out-of-stock, and the selected category are preserved.
  - `useCheckout` now requires a `location: LocationCode` prop, snapshots the location when the checkout modal opens, rejects an empty cart before any API call, and sends `location_id` in the `createSale` payload. On success it clears the cart and shows the success state before a best-effort catalog refresh.
  - `CatalogPage` passes the nullable `sede` to `useCatalog(sede)` and `useCart(allProducts, sede)`, passes `activeSede` to `useCheckout`, closes an open checkout when the sede changes, and renders the catalog content only once a sede exists, so no empty-state flash appears behind the onboarding modal.
  - `useCart` resets the cart and closes the drawer whenever the sede changes (every path), and `cartCount` is derived from the visible cart entries.
  - `useSede` syncs the sede across tabs through a `localStorage` `storage` listener that ignores `sessionStorage`, so a change made in another tab also resets this tab's catalog and cart.
  - Types: `CreateSalePayload.location_id` is required; `Sale.location_id` is optional.
- **Status:** working-tree changes; not committed and not pushed.
- **Verification:** `tsc --noEmit -p frontend/tsconfig.app.json` stays at the 5 pre-existing errors with 0 new ones; ESLint clean on the changed files.
- **Known pending items:**
  - Provider and admin product views still default to `VF`; per-sede administration is Phase 5.
  - `location_id` is client-chosen until Phase 4 derives and validates it server-side.
  - The backend temporary `VF` fallback can now be removed once this ships.

### Phase 2 — backend API migration to `product_stock`

- **Date:** `2026-11-03`
- **Type:** `feat` (backend)
- **Scope:** Phase 2 — backend API migration from `products.current_stock` to `product_stock`.
- **Files added:**
  - `backend/src/config/locations.ts`
- **Files modified:**
  - `backend/src/controllers/SaleController.ts`
  - `backend/src/controllers/ProductController.ts`
  - `backend/src/controllers/ComposedProductController.ts`
  - `backend/src/schemas/schema.ts`
  - `backend/src/utils/errors.ts`
  - `backend/src/services/notificationService.ts`
  - `backend/src/services/slackService.ts`
  - `SEDES-MASTER-PLAN.md`
- **Description:** the backend no longer depends on the frozen `products.current_stock` column and now reads from and writes to `product_stock(product_id, location_id, stock)`. Behavior changes:
  - New `backend/src/config/locations.ts` with `LOCATION_CODES = ["VF", "GO"]`, `DEFAULT_LOCATION = "VF"`, and the `parseLocation` / `isLocationCode` helpers.
  - `POST /api/sales` receives and validates `location_id` (zod `SaleRequestSchema`), writes it to `sales`, checks that every item is offered at that sede, validates cumulative demand (components shared across cart lines), rejects non-positive quantities, caps the cart at 100 items, and no longer runs the post-insert TOCTOU check. A **temporary fallback to `VF` with a warning** remains only when `location_id` is missing (the frontend does not send it yet).
  - Refunds restore `product_stock` at the sale's sede idempotently (items already refunded are skipped; the row is marked first and restored afterwards), and composed products restore their components.
  - `GET /api/products/public` accepts `?sede=VF|GO` (defaults to `VF`, returns 400 when invalid), inner joins `product_stock` at that sede (products without a row are excluded; stock `0` remains visible), and keeps the `current_stock` field name mapped from that sede's stock.
  - `GET /api/products` (ADMIN/IT) returns `current_stock` plus a per-sede `stocks` map.
  - `GET /api/products/:id` and the provider listing return `current_stock` mapped from the requested sede or the default one (no `stocks` map, to limit exposure).
  - `enrichComposedStock(products, location)` computes availability from component stock at that sede, in batches (no N+1), and returns `0` for recipes with invalid quantities.
  - Creating a product (simple or composed) or updating a simple product's stock now also writes the `VF` row in `product_stock`; `products.current_stock` is kept only as a temporary write-only bridge. Composed-product updates do not write stock, because their availability is derived.
  - Low-stock notifications use the post-trigger stock, and every sale read endpoint (`getAllSales` and the per-entrepreneurship, per-consumer, and by-id reads) returns `location_id`.
  - Input limits: at most 50 components and at most 100 items. New 409 mapping for check violations ("Stock insuficiente…").
- **Status:** working-tree changes; not committed and not pushed.
- **Verification:** `tsc --noEmit -p backend/tsconfig.json` exits with code 0; Biome lint reports 7 pre-existing warnings and 0 new ones.
- **Known pending items:**
  - Atomic increment RPC for refunds.
  - Versioned migrations and the trigger definition committed to the repository: **trigger definition completed 2026-11-05** at `backend/supabase/migrations/20261105_reduce_stock_on_sale.sql`. The `locations` and `product_stock` table migrations are still pending.
  - RLS verification on `product_stock`.
  - Remove the `VF` fallback once the frontend sends `location_id`: **completed 2026-11-05** — a missing or invalid `location_id` now returns `400` (`"Sede inválida o ausente"`) instead of defaulting to `VF`.
  - Per-sede administration matrix (Phase 5).

### Removed all mock mode code for Phase 2

- **Date:** `2026-11-02`
- **Type:** `refactor`
- **Files deleted:**
  - `frontend/src/config/mockData.ts`
  - `frontend/src/config/mockMode.ts`
- **Files modified:**
  - `frontend/src/config/supabaseClient.ts`
  - `frontend/src/hooks/useAdminData.ts`
  - `frontend/src/hooks/useCatalog.ts`
  - `frontend/src/hooks/useDashboard.ts`
  - `frontend/src/hooks/useITData.ts`
  - `frontend/src/hooks/useProducts.ts`
  - `frontend/src/hooks/useSoftwareUpdates.ts`
  - `frontend/src/components/features/login/hooks/useAuth.ts`
  - `frontend/src/components/features/catalog/CatalogHeader.tsx`
  - `frontend/src/components/features/admin-consumers/AdminConsumers.tsx`
  - `frontend/src/components/features/admin-entrepreneurs/AdminEntrepreneurs.tsx`
  - `frontend/src/components/features/my-entrepreneurships/EntrepreneurShipsMenu/products/ProductFormModal.tsx`
  - `frontend/src/pages/CatalogPage.tsx`
  - `frontend/README.md`
  - `AGENTS.md`
  - `SEDES-MASTER-PLAN.md`
- **Description:** mock mode, the fixtures in `mockData.ts`, and every `MOCK_MODE` / `MOCK_*` / `VITE_MOCK_MODE` gate were removed from the frontend, so the application always uses the real API (`VITE_API_URL`) and real Supabase auth. Initial hook states were reset to empty/null with real loading flags instead of seeded fixtures; `useCatalog()` no longer takes a location argument, so `CatalogPage` was updated to call it without one. The `useITData` and `useProducts` loading initializers were chosen so the UI does not stay on permanent skeletons. `supabaseClient.ts` now fails closed: it throws "Faltan las variables de entorno de Supabase en el Frontend" at module load unless `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are defined. The catalog sede switcher remains public, but catalog contents do not yet vary by sede until the backend accepts a `location` parameter. Per-sede stock fields remain in the product form types but are inert (not serialized) and are a Phase 2 follow-up. `frontend/README.md`, `AGENTS.md`, and `SEDES-MASTER-PLAN.md` were updated to describe the real-only workflow and to record that mock mode was removed at the start of Phase 2.
- **Verification:** `npx tsc -p tsconfig.app.json --noEmit` at the pre-existing 9-error baseline (`CartDrawer.tsx:153/164/181`, `EntrepreneurshipOverview.tsx:16`, `ProductFilters.tsx:41/52/63`, `UpdatesModal.tsx:60`, `CatalogPage.tsx:132`) with no new errors; targeted ESLint clean on all touched files; grep for `mock` in `frontend/src` returns zero hits; no build was run per project build policy; no backend, schema, or `.env` changes; no emojis.

### Mock software updates cleared for demo

- **Date:** `2026-11-02`
- **Type:** `chore`
- **Files modified:**
  - `frontend/src/config/mockData.ts`
  - `frontend/src/components/layout/SoftwareUpdatesWidget.tsx`
  - `frontend/README.md`
- **Description:** the three fake software-update fixtures in `MOCK_SOFTWARE_UPDATES` were removed, so the exported array is now intentionally empty (`[]`) for the stakeholder demo; the `SoftwareUpdate` type import is retained because the exported annotation still uses it. The shared empty state in `SoftwareUpdatesWidget` now reads "No hay notificaciones nuevas" instead of "Sin novedades este mes". Because the same widget backs both the catalog header bell popover (`CatalogHeader.tsx`) and the sidebar "Ver novedades" modal (`Sidebar.tsx` via `UpdatesModal.tsx`), both surfaces now show the same clean empty state. With an empty array, `useSoftwareUpdates` yields `loading: false` in mock mode and `unreadCount: 0`, so the bell and sidebar badges hide automatically. The real (non-mock) notifications path is unchanged except for the shared empty-state copy; no behavior, endpoint, or data contract changed. `frontend/README.md` was updated to describe the intentionally empty fixture list instead of the former three samples.
- **Verification:** targeted ESLint clean on both code files; `@code-reviewer` and `@security-auditor` found no regressions, no new type or lint errors, no XSS or data leak, and no security control removed; no build was run per project build policy; no backend, schema, SQL, or `.env` changes; no emojis.

### Public catalog sede switcher and production mock-mode fix

- **Date:** `2026-11-02`
- **Type:** `fix`
- **Files modified:**
  - `frontend/src/components/features/catalog/CatalogHeader.tsx`
  - `frontend/src/config/mockMode.ts`
  - `frontend/src/hooks/useCatalog.ts`
  - `frontend/src/config/mockData.ts`
  - `SEDES-MASTER-PLAN.md`
  - `frontend/README.md`
  - `AGENTS.md`
- **Description:** two changes shipped together. (1) The VF/GO sede switcher in the catalog header is now public to every user, authenticated or guest, on both the desktop header and the mobile strip. The `useAuth` dependency and the `canSwitch` ADMIN/IT gate were removed from `CatalogHeader`; the only remaining condition is `showSwitcher = sede !== null`, because `SedeSwitcher` requires a concrete `LocationCode` and the onboarding modal guarantees a sede is chosen before the catalog is usable. This is a permanent product decision that overrides the earlier ADMIN/IT-only restriction, since the sede is a local view preference in `localStorage` (`hq_location`), not an authorization control. (2) `frontend/src/config/mockMode.ts` previously computed `MOCK_MODE` as `import.meta.env.DEV && import.meta.env.VITE_MOCK_MODE !== "false"`, so `vite build` statically replaced `DEV` with `false`, the flag folded to `false`, the mock branches and fixtures were dead-code-eliminated, `useCatalog` took the real API path, `VITE_API_URL` was unreachable in the Vercel deployment, and the catalog rendered "No encontramos lo que buscas". The new expression is `explicitMock = import.meta.env.VITE_MOCK_MODE === "true"`, `devDefault = import.meta.env.DEV && import.meta.env.VITE_MOCK_MODE !== "false"`, and `MOCK_MODE: boolean = explicitMock || devDefault`; `VITE_MOCK_MODE=true` at build time now enables mock mode in any build, including production/Vercel, while unset keeps production in real mode and, in development, keeps mocks ON by default unless `VITE_MOCK_MODE=false`. The value is baked in at build time and requires a rebuild to change. `useCatalog` now returns `getMockCatalogForLocation(location)` directly as an explicit ternary and clears stale errors on successful loads, and `getMockCatalogForLocation` uses safe optional chaining (`MOCK_PRODUCT_STOCKS[product.id]?.[location]`) so a missing location entry cannot crash the catalog; fixture values are unchanged. Operational requirement: the Vercel project must define `VITE_MOCK_MODE=true` in its build environment variables for the current backend-less demo, and it must be unset or `false` for any real production deployment with a live backend.
- **Verification:** targeted ESLint clean on the four code files; `@code-reviewer` and `@security-auditor` reviewed the diff; no build was run per project build policy; no backend, schema, or `.env` changes; no emojis.

### Header sede badge removed

- **Date:** `2026-11-01`
- **Type:** `chore`
- **Files modified:**
  - `frontend/src/components/features/catalog/CatalogHeader.tsx`
  - `SEDES-MASTER-PLAN.md`
- **Description:** removed the full location-name text badge from the desktop header and the mobile strip. The VF/GO switcher is unchanged and remains the only header sede control for `ADMIN`/`IT`. The now-unused `SEDE_BADGE_CLASS` constant was deleted. The mobile strip now renders only when the switcher is available, so non-admin users no longer see an empty bar. Non-admin users rely on the hero subtitle ("Valle Frío" / "Grano de Oro") and the banner alt text for the active sede; this is an accepted trade-off from the removal.
- **Verification:** ESLint clean on `CatalogHeader.tsx`; `tsc -p tsconfig.app.json --noEmit` at the pre-existing 9-error baseline with no new unused-variable errors; no `SEDE_BADGE_CLASS` references remain; `SedeBadge.tsx`, `CatalogHero.tsx`, and `Settings.tsx` untouched; no emojis; no backend, schema, or `.env` changes.

### Legacy audit report baseline committed

- **Date:** `2026-11-01`
- **Type:** `docs`
- **Files added:**
  - `LEGACY-AUDIT-REPORT.md`
- **Description:** the codebase audit findings are now permanently tracked, split into Original Codebase (legacy) and Sedes feature notes, with IDs, severity, evidence, recommendations, and an `Open` status for each item. This is the baseline before Phases 2, 3, and 4.
- **Verification:** documentation-only change; no code, SQL, schema, or `.env` modified; existing entries and the rule blockquote untouched.

### Sede detection pivot — onboarding modal and localStorage

- **Date:** `2026-11-01`
- **Type:** `chore`
- **Files added:**
  - `frontend/src/components/features/catalog/LocationPromptModal.tsx`
- **Files modified:**
  - `frontend/src/hooks/useSede.ts`
  - `frontend/src/config/locations.ts`
  - `frontend/src/pages/CatalogPage.tsx`
  - `frontend/src/components/features/catalog/CatalogHeader.tsx`
  - `SEDES-MASTER-PLAN.md`
  - `frontend/README.md`
- **Description:** sede detection no longer reads `?sede=`. `useSede` reads `localStorage["hq_location"]` in a lazy initializer, normalizes and validates it with `isLocationCode`, and returns `null` when unset or invalid; `setSede` writes the key and updates state, with guarded read/write so blocked storage cannot lock the UI. A new unskippable Ant Design modal (`LocationPromptModal`) asks "¿En qué sede te encuentras hoy?" with two full-size buttons and only closes when a sede is chosen. Switching sede now goes through an Ant Design `Modal.confirm` ("Cambio de Sede"), warns that the cart will be emptied, and uses the same `chooseSede` path (clear cart, close drawer, persist). The header badge/switcher and hero are hidden while no sede is chosen. `parseLocationParam`, `toLocationParam`, and `urlValue` were removed.
- **Verification:** ESLint clean on all touched files; `tsc -p tsconfig.app.json --noEmit` at the pre-existing 9-error baseline (the `CatalogPage` entry is still the known `addToCart` drift, shifted line); no `?sede`/`useSearchParams`/`parseLocationParam`/`toLocationParam`/`urlValue` remain under `frontend/src`; no emojis; no backend, schema, or `.env` changes.
- **Known limitation:** the sede is per-browser and last-writer-wins across tabs; it is re-read only on load.

### Hero subtitle copy — removed the Sede prefix

- **Date:** `2026-11-01`
- **Type:** `chore`
- **Files modified:**
  - `frontend/src/components/features/catalog/CatalogHero.tsx`
  - `SEDES-MASTER-PLAN.md`
- **Description:** the hero subtitle under "Catálogo de productos" now renders only the location name (`Valle Frío` / `Grano de Oro`) instead of `Sede <name>`. The header badge keeps its `sr-only` "Sede " prefix and the banner alt text still provides the context, so no accessibility regression. No behavior, layout, or other copy changed.
- **Verification:** `npx eslint src/components/features/catalog/CatalogHero.tsx` clean; single text-node change with the same paragraph and classes; no emojis; no backend, schema, or `.env` changes.

### Phase 5 — backoffice Sede columns, GO settings block, and per-sede product matrix (mock UI)

- **Date:** `2026-11-01`
- **Type:** `feat`
- **Files added:**
  - `frontend/src/components/shared/SedeBadge.tsx`
  - `frontend/src/components/shared/SedeColumnFilter.tsx`
- **Files modified:**
  - `frontend/src/config/locations.ts`
  - `frontend/src/config/mockData.ts`
  - `frontend/src/types/index.ts`
  - `frontend/src/hooks/useAdminData.ts`
  - `frontend/src/hooks/useProducts.ts`
  - `frontend/src/components/features/admin-entrepreneurs/AdminEntrepreneurs.tsx`
  - `frontend/src/components/features/admin-entrepreneurs/SummaryView.tsx`
  - `frontend/src/components/features/admin-entrepreneurs/SummaryDesktop.tsx`
  - `frontend/src/components/features/admin-entrepreneurs/DetailedView.tsx`
  - `frontend/src/components/features/admin-entrepreneurs/DetailedDesktop.tsx`
  - `frontend/src/components/features/admin-entrepreneurs/SummaryEmptyState.tsx`
  - `frontend/src/components/features/admin-entrepreneurs/hooks/useAdminEntrepreneurs.ts`
  - `frontend/src/components/features/admin-consumers/AdminConsumers.tsx`
  - `frontend/src/components/features/admin-consumers/ConsumersDesktop.tsx`
  - `frontend/src/components/features/admin-consumers/ConsumerDetailedDesktop.tsx`
  - `frontend/src/components/features/admin-consumers/hooks/useAdminConsumers.ts`
  - `frontend/src/components/features/settings/Settings.tsx`
  - `frontend/src/components/features/settings/SettingsForm.tsx`
  - `frontend/src/components/features/my-entrepreneurships/EntrepreneurShipsMenu/products/ProductFormModal.tsx`
  - `frontend/src/components/features/my-entrepreneurships/EntrepreneurShipsMenu/products/hooks/useProductForm.ts`
  - `frontend/src/components/features/my-entrepreneurships/EntrepreneurShipsMenu/products/hooks/useComposedProductForm.ts`
  - `SEDES-MASTER-PLAN.md`
- **Description:** six seeded mock sales (`MOCK_SALES`, 2026 dates) now carry `location_id`; the Entrepreneurs, Consumers, and detailed Sales tables gain a Sede column with a compact header AntD filter (`Todas` / `VF` / `GO`) backed by page-local state; `useAdminData(enabled, sedeFilter)` filters once and derives per-entity `sedes`; filter changes reset selection/detail/modal state; the Settings Google Sheets tab shows a disabled empty GO block with no keys; the product form shows a per-sede Offered/Stock matrix only in mock mode, with `current_stock` kept as the VF mirror; the master plan records the pivot away from the global Topbar filter.
- **Verification:** ESLint clean on all touched files; `tsc -p tsconfig.app.json --noEmit` at the pre-existing 9-error baseline with no new errors; mock refund and payroll paths simulate locally; real mode renders no Sede column when sales lack `location_id`; mobile components untouched; no emojis; no backend, schema, or `.env` changes.

### Phase 5 — admin filter and settings UI strategy documented

- **Date:** `2026-11-01`
- **Type:** `docs`
- **Files modified:**
  - `SEDES-MASTER-PLAN.md`
- **Description:** Phase 5 now documents where the global admin location filter lives (`AdminLocationProvider` in `DashboardPage`, consumed by `useAdminData(enabled, locationFilter)`), the single-`Select` placement in `Topbar`, the reset semantics on filter change, the per-sede Google Sheets settings separation with `GO` gated by the deferred decision, and the server-side filtering follow-up. Phase 5 gained two subsections ("Admin location filter — UI strategy" and "Settings — Google Sheets per sede"), the matching work items and acceptance criteria, an admin `location` filter note in the API contract direction, and an updated `GO` spreadsheet row in the deferred decisions table.
- **Verification:** documentation-only change; no code, SQL, schema, or `.env` modified; Phases 1–4 content untouched.

### Phase 1 — badge copy adjustment and architectural harness

- **Date:** `2026-10-31`
- **Type:** `chore`
- **Files added:**
  - `SEDES-MASTER-PLAN.md`
- **Files modified:**
  - `frontend/src/components/features/catalog/CatalogHeader.tsx`
- **Description:** the active-sede badge now shows only the location name, rendered uppercase by the unchanged badge class (`VALLE FRÍO` / `GRANO DE ORO`), with an `sr-only` `Sede ` prefix preserving the full screen-reader string. The hero subtitle and the switcher labels are intentionally unchanged. Both the desktop and the mobile badge sites were updated identically. `SEDES-MASTER-PLAN.md` was added as the mandatory context document for every future phase.
- **Verification:** ESLint clean on `CatalogHeader.tsx`; `tsc -p tsconfig.app.json --noEmit` at the pre-existing 9-error baseline with no new errors; `CatalogHero.tsx` untouched; no emojis; no backend, service, schema, or `.env` changes.

### Phase 1 — frontend sede selection and per-sede mock catalog

- **Date:** `2026-10-31`
- **Type:** `feat` (frontend-only, mock mode)
- **Files added:**
  - `frontend/src/config/locations.ts`
  - `frontend/src/hooks/useSede.ts`
- **Files modified:**
  - `frontend/src/config/mockData.ts`
  - `frontend/src/hooks/useCatalog.ts`
  - `frontend/src/pages/CatalogPage.tsx`
  - `frontend/src/components/features/catalog/CatalogHero.tsx`
  - `frontend/src/components/features/catalog/CatalogHeader.tsx`
- **Description:** the catalog is now scoped to a sede (`VF` = Valle Frío, `GO` = Grano de Oro). The selected sede is read from the `sede` query param and defaults to `VF`; `useSede` writes it back with a functional `setSearchParams` updater and `{ replace: true }`, so other query params are preserved and switching does not add history entries. `useCatalog` receives the sede and, in mock mode, returns a cached per-sede product array built by `getMockCatalogForLocation`: products absent from a sede's stock map are not offered there, and products mapped to `0` remain visible out of stock. Switching sede clears the cart and closes the cart drawer (a cart belongs to a single sede), `CatalogHero` renders the sede banner and an overlay color from `LOCATIONS`, and `CatalogHeader` shows a sede badge plus a two-button switcher (desktop and a mobile strip) that is only visible to `ADMIN`/`IT` roles. Pagination is clamped with `safePage` so a filter/sede change cannot leave the UI on an out-of-range page. The real (non-mock) data path is untouched: the fetch effect still has empty deps and `remoteProducts` keeps the same behavior. Review follow-ups: selecting the already-active sede is a no-op, so an in-session cart is never cleared by a redundant click, the active switcher button is `disabled` while keeping its active styling, and the per-sede mock array is only derived and cached when `MOCK_MODE` is on. After the fix pass, clicking the already-active sede is a no-op that never wipes the cart, the active switcher button is disabled, and mock catalog derivation is gated behind `MOCK_MODE` so real mode performs no mock work.
- **Deferred (not in Phase 1):**
  - Product-form default toggles per sede — deferred pending the Office Manager's decision; the product form is unchanged.
  - GO spreadsheet configuration — deferred pending Administration; no new config fields were added and `VF` keeps the existing spreadsheet setup.
  - Admin-side sede selector — deferred; the admin layout and dashboards were not modified. The only switcher is in the public catalog header.
- **Known limitations (to close in Phase 3):**
  - The cart is cleared on an explicit switcher click only. Changing `?sede=` by editing the URL, a bookmark, or browser back/forward does not clear it; binding the cart to the sede and sending the sede with checkout is Phase 3 work. (Superseded on 2026-11-01 by the onboarding + localStorage pivot entry above.)
  - In mock mode the hardcoded user always has `["ADMIN", "IT"]`, so the "consumer sees the badge but no switcher" path cannot be exercised offline without editing `MOCK_ROLES`.
  - In real mode the catalog API ignores the location (the backend has no sede model yet); the UI badge is ahead of the data contract until Phase 2.
  - The real data path (`getActiveProducts`, `refreshProducts`) is intentionally unchanged and does not send a location yet.
- **Verification:** `npx eslint` is clean on the seven touched files after the fix pass, including a re-check of `CatalogPage.tsx`, `useCatalog.ts`, and `CatalogHeader.tsx`. `tsc -p tsconfig.app.json --noEmit` was reported by review at the pre-existing 9-error baseline (one of them, the `CartDrawer`/`CatalogPage` `addToCart` id type drift, predates this change). `pnpm build` was intentionally not run per project build policy. No emojis in code or UI copy. No backend, service, schema, or `.env` files were modified.

### Development infrastructure — local mock mode (Sedes prerequisite)

- **Date:** `2026-10-31`
- **Type:** `chore` (development infrastructure)
- **Scope:** `frontend/` only. No changes to the backend, database, or API contract.
- **Files deleted:** none.

This entry **does not implement the Sedes feature**. It documents the local prerequisite that allows the Sedes interface to be worked on without a Supabase project and without a backend. As of the date of this entry, there is no Sedes code in the repository.

#### Summary

With a missing or incomplete `frontend/.env`, the application aborted at startup with:

```text
Uncaught Error: Missing Supabase environment variables in the Frontend
```

The runtime error is shown above translated into English; the shipped literal is `"Faltan las variables de entorno de Supabase en el Frontend"`. It is thrown by `frontend/src/config/supabaseClient.ts` when `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` are not defined, and it prevents the React tree from mounting. Local mock mode removes that dependency: it allows the UI to render with **no Supabase project and no backend**, so Sedes interface work can begin without infrastructure blockers.

#### Files added (2)

- `frontend/src/config/mockMode.ts`
- `frontend/src/config/mockData.ts`

#### Files modified (12)

- `frontend/src/config/supabaseClient.ts`
- `frontend/src/components/features/login/hooks/useAuth.ts`
- `frontend/src/hooks/useDashboard.ts`
- `frontend/src/hooks/useCatalog.ts`
- `frontend/src/hooks/useProducts.ts`
- `frontend/src/hooks/useSoftwareUpdates.ts`
- `frontend/src/hooks/useAdminData.ts`
- `frontend/src/hooks/useITData.ts`
- `frontend/src/components/features/catalog/CatalogHeader.tsx`
- `frontend/src/components/features/my-entrepreneurships/EntrepreneurShipsMenu/products/ProductFormModal.tsx`
- `frontend/README.md`
- `AGENTS.md`

#### Behavior

- Under `pnpm dev:front`, mock mode is **enabled by default**: the app starts without `.env`, without Supabase, and without a backend.
- `/` (catalog) and `/dashboard` render with sample data and **make no HTTP requests**.
- With `VITE_MOCK_MODE=false`, the frontend returns to the real flow (`VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) with no behavior changes.
- Mock mode **can never be enabled in a production build**, because it is gated by `import.meta.env.DEV`.

#### How the bypass works

The flag is defined in `frontend/src/config/mockMode.ts`:

```ts
export const MOCK_MODE =
  import.meta.env.DEV && import.meta.env.VITE_MOCK_MODE !== "false";
```

With that expression: in development it is on unless `VITE_MOCK_MODE=false` is set; in production `import.meta.env.DEV` is `false` and the flag is always off.

`frontend/src/config/supabaseClient.ts` replaces the credentials in mock mode with a reserved URL and a non-secret placeholder key, so that `createClient` never throws:

```ts
const url = MOCK_MODE ? MOCK_SUPABASE_URL : supabaseUrl; // "https://mock.invalid"
const key = MOCK_MODE ? MOCK_SUPABASE_ANON_KEY : supabaseAnonKey;
```

`mock.invalid` uses the reserved `.invalid` TLD, so it cannot be resolved by DNS and there is no risk of reaching a real service.

The hooks seed their initial state from the fixtures and short-circuit their effects and callbacks with `if (MOCK_MODE) return;`:

```ts
const [products, setProducts] = useState(() =>
  MOCK_MODE ? MOCK_CATALOG_PRODUCTS : [],
);

useEffect(() => {
  if (MOCK_MODE) return; // guard inside the effect, never before a hook
  // ...real fetch
}, []);
```

The guards live **inside effects and asynchronous actions**, never before a hook call, to respect the rules of hooks. That is why hooks are always declared and the short-circuit happens afterward.

Breakdown by hook:

| Hook / component | Behavior in mock mode |
|---|---|
| `useAuth` | Injects the `MOCK_AUTH_USER` user with roles `["ADMIN", "IT"]`; logout is local and redirects to `/login`. |
| `useDashboard` | Injects `MOCK_SIDEBAR_USER` (`Mock Admin`) and the roles `["ADMIN", "IT"]`. |
| `useCatalog` | Returns the static product and category arrays with `loading: false`. |
| `useProducts` | Returns the static products and simulates create / update / delete by mutating local state, with the same toasts. |
| `useSoftwareUpdates` | Returns `MOCK_SOFTWARE_UPDATES`. |
| `useAdminData` | Returns an empty sales list; `processPayroll` responds with a simulated-payroll toast (literal Spanish UI copy: `"Nómina simulada (mock mode)"`). |
| `useITData` | Returns zeroed metrics (`totalUsers`, `pendingRequests`, `activeSessions`). |
| `CatalogHeader` | Forces the authenticated branch (`isLoggedIn = true`) without checking the session. |
| `ProductFormModal` | Fills the category and simple-product dropdowns from the fixtures. |

#### Mock fixtures

Everything lives in `frontend/src/config/mockData.ts`:

| Fixture | Content |
|---|---|
| Products | **6 products** for the catalog and entrepreneurship, including `"4 Torontos"` and `"Bolitas de coco"`. |
| Categories | **3**: Food, Drinks, and Desserts. |
| Software updates | **3** (`MOCK_SOFTWARE_UPDATES`). |
| Mock user | `mock.admin@example.com` with roles `["ADMIN", "IT"]`. |

#### Verification

- `/` and `/dashboard` make **zero HTTP requests** in mock mode (confirmed in the DevTools Network tab).
- **ESLint clean** across all touched files.
- `tsc` reports **only pre-existing errors** in files not touched by this change.
- With `VITE_MOCK_MODE=false`, the real behavior remains **byte-for-byte unchanged**.

#### Known limitations

- Mock writes are **in-memory only**: they are lost when the component unmounts or the page reloads.
- Mock logout is **cosmetic**: on reload, the sample user is seeded again.
- Still calling the real API: **checkout**, **settings**, **admin lists**, **signup requests**, **my purchases**, and **entrepreneurship detail / sales**. Without a backend they produce error toasts or empty lists.
- Mock mode is **development-only** and **must never be enabled in a production build**.

#### Review notes

Two issues found in review and fixed:

1. `/` was still calling `/software-updates/current-month` and broke the catalog when a non-array response reached the state. The request is now protected by the mock guard and the response is normalized with `Array.isArray`.
2. The original flag expression could be enabled in a production build if `VITE_MOCK_MODE=true` was present. It is now fully gated by `import.meta.env.DEV`.

## How to add an entry

1. Copy the template below.
2. Paste it **at the top**, right under `## [Unreleased]` (newest entry first).
3. Fill in the date, type, files, and description of the logic or behavior change. Entries must be written in English.
4. Record how the change was verified (lint, type checks, routes reviewed, manual testing).
5. Do it as the **final step** of the task, before opening the PR.

Template:

```markdown
### <Short, descriptive title of the change>

- **Date:** `YYYY-MM-DD`
- **Type:** `feat` | `fix` | `chore` | `refactor` | `docs`
- **Files:**
  - Added: `path/to/file.ts`
  - Modified: `path/to/file.tsx`
  - Deleted: `path/to/file.ts` (or "none")
- **Description:** what changed in the logic or behavior and why.
- **Verification:** commands run, routes reviewed, ESLint and `tsc` results.
```
