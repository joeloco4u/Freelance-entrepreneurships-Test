# Sedes — Master Plan (Multi-Location Workstream)

**CRITICAL RULE: The AI agent MUST consult this plan to align context before executing a new Phase or proposing architectural changes.**

## Purpose and how to use this document

This file is the single source of truth for the Multi-Location (Sedes) workstream. It defines the locked business rules, the target data model, the phase sequence, the risks, and the guardrails that every future change must respect.

- Read this document **before** starting work on any phase.
- Read this document **before** proposing an architectural change to the catalog, cart, sales, stock, or administration surfaces.
- `CHANGELOG-SEDES.md` records what was **actually shipped**. This document records what **must be true**. When the two disagree about intent, this document wins; when they disagree about facts on disk, the code and changelog win and this document must be corrected.
- Any deviation from this plan requires **updating this document first**, then implementing. A deviation that is not recorded here is a defect.
- This document contains no SQL and no application code. It describes concepts and contracts. Implementation details belong in the code and in versioned migrations.

## Locked business rules

These seven decisions are closed. They are not open for renegotiation inside a phase.

| # | Area | Locked decision |
|---|---|---|
| 1 | Isolation | Strict isolation: one sale cannot mix locations. A cart belongs to exactly one sede for its entire lifetime. |
| 2 | Pricing | Prices are global. There is no per-location pricing anywhere in the system. |
| 3 | Visibility | A product is hidden from a location only when **no inventory association exists** for that location. A product with stock `0` at a location stays visible there and is unsellable. |
| 4 | Administration | The admin view is unified, with an `All / VF / GO` filter. The catalog header switcher is a **scope**; the admin control is a **filter**. The catalog header sede switcher is **public to all users (authenticated and guests)**; this permanently overrides the earlier ADMIN/IT-only restriction. The admin UI for this is deferred. |
| 5 | Transfers | There are no stock transfers between locations and no transfer ledger. Stock is created and adjusted per location, independently. |
| 6 | Detection | Onboarding + LocalStorage. On first visit, an unskippable modal asks the user to choose VF or GO; the choice is persisted in `localStorage` under `hq_location` and reused on that machine. Changing sede requires an explicit confirmation and clears the cart. This bypasses the office VPN/IP unreliability. No IP detection, no QR codes, no URL parameter. |
| 7 | Migration | All existing rows belong to `VF`. `GO` starts empty. `VF` spreadsheets are already automated; `GO` configuration is deferred to Administration. |

Rule 6 was revised on 2026-11-01 by explicit product decision; the previous URL-parameter strategy is superseded.

Rule 4 was revised on 2026-11-02 by explicit product decision: the catalog sede switcher is public; the previous ADMIN/IT restriction is superseded.

## Naming and conventions

- **Code and database identifiers are English:** `locations`, `location_id`, `product_stock`, `LocationCode`. Do not introduce Spanish identifiers, and do not create parallel naming schemes.
- **User-facing copy is Spanish.** Location display names come from the existing configuration (`Valle Frío`, `Grano de Oro`) and are rendered in title case in the hero subtitle.
- **The hook is `useSede`.** Never `useLocation`, which is reserved by `react-router`. Sede detection lives in `useSede`, backed by `localStorage` (`hq_location`). There is no URL handling.
- **No emojis anywhere:** not in code, not in UI copy, not in commit messages, not in documentation.
- **Mock mode was removed on 2026-11-02 at the start of Phase 2.** Every phase must run against the real Supabase and backend services; there are no fixtures, no `MOCK_MODE` flag, and no mock-injection path. A phase that depends on offline fixtures is not complete.

## Current state of the codebase

This is the factual baseline the plan is built on. It is descriptive, not aspirational.

- `products.current_stock` is a single scalar column. Composed-product availability is derived at read time from component stock in `enrichComposedStock` (`backend/src/controllers/ComposedProductController.ts`), which takes the minimum of `component_stock / quantity` across components.
- Stock deduction is delegated to a database trigger named `reduce_stock_on_sale`. The live definition was extracted and versioned at `backend/supabase/migrations/20261105_reduce_stock_on_sale.sql` on 2026-11-05 (working tree; not yet committed or applied).
- Sales are created through multiple non-atomic steps: product validation, sale header insert, sale items insert, then a post-hoc read that logs negative stock (a TOCTOU check that only writes to the server log). There is no transaction and no database-enforced non-negative guarantee.
- `POST /api/sales` is public and unauthenticated. The client supplies `consumer_id` in the request body. Only the read and mutation endpoints behind it require authentication.
- Admin metrics and summaries are aggregated client-side in `frontend/src/hooks/useAdminData.ts`.
- There is no shared types package between frontend and backend, no test suite, and no committed migrations.

## Target data model (conceptual)

The target model separates identity, offering, and quantity. No SQL is prescribed here.

### `locations`

- Primary key: `code` (`VF`, `GO`).
- Columns: display name, active flag, sort order.
- This table is the authority for which sedes exist. It is seeded, not user-created.

### `product_stock`

- Composite key: (`product_id`, `location_id`).
- `stock`: numeric, with a non-negative check constraint. This is the implemented column name; the earlier plan called it `quantity`.
- **The existence of the row means "offered at that sede".** A missing row means the product is not offered and is therefore hidden there. A row with `stock` `0` means offered and visible, but not sellable.

### `sales.location_id`

- Mandatory after backfill.
- Every existing sale is `VF`.
- The sale header is the single record of the location for the whole sale; sale items never carry a location of their own.

### Composed products

- An association row (product plus location) marks that the composed product is **offered** in that location.
- Quantity is always **derived** from component stock at that same location.
- Composed quantity is never manually editable and never stored as an authoritative number.

### `products.current_stock`

- It is a **write-only** compatibility bridge: it is written only on product creation or update; the trigger no longer maintains it and no code reads it. The source of truth for stock is `product_stock`.
- It is removed in Phase 5, once every consumer has migrated.
- Reintroducing per-sede data into this column is forbidden.

### API contract direction

- Catalog endpoints accept the validated `?sede` parameter (values `VF` / `GO`). The frontend sends `?sede` on every catalog request; the backend default of `VF` remains only as a temporary backward-compatible fallback.
- In catalog responses, `current_stock` means **stock at the requested location**, preserving the client field name.
- Backoffice endpoints return a per-location stocks map rather than a single scalar, so the administration surface can present a unified view.
- Sale creation accepts the location and records it on the sale header; the server validates that every item is offered at that location. The frontend sends `location_id` in the checkout payload; the value is still client-chosen until Phase 4 derives and validates it server-side.
- The admin `location` filter remains a server-side follow-up (`GET /sales?location=`); client-side filtering is explicitly accepted for Phase 5.

## The five phases

### Phase 1 — Context and detection (frontend)

**Status: COMPLETED (2026-10-31).**

**Revision note (2026-11-02):** mock mode and all mock fixtures referenced in this Phase 1 section were removed on 2026-11-02 when Phase 2 began. The mock-related references below are historical and describe the implementation as it existed in Phase 1; they are no longer current behavior and must not be used as a development path.

#### Objective

Let the public catalog be scoped to a sede during onboarding and persisted in localStorage, with mock data per sede, without touching the backend or the schema.

**Detection note (2026-11-01):** the original implementation read `?sede` from the URL. It was replaced by the onboarding modal + `localStorage` pivot; the work items and acceptance criteria below reflect the current behavior. The superseded URL approach is kept only as history in `CHANGELOG-SEDES.md`.

#### Scope

- **In:** `locations` configuration, `useSede` localStorage detection, per-sede mock fixtures, `useCatalog(location)`, the VF/GO switcher in the catalog header (the text badge was removed on 2026-11-01), banner/overlay/subtitle in the hero, cart clearing on switch, pagination clamping, Spanish copy.
- **Out:** any backend change, any schema change, any real-mode location parameter, admin-side sede selector, product-form sede controls, GO spreadsheet configuration.

#### Work items (shipped)

- Added `frontend/src/config/locations.ts` with `LOCATION_CODES`, `LocationCode`, `DEFAULT_LOCATION`, `LOCATIONS`, and `isLocationCode`.
- Added `frontend/src/hooks/useSede.ts`, reading `localStorage` key `hq_location` in a lazy initializer, returning `null` when the key is unset, normalizing and validating the stored value with `isLocationCode` before use, and using guarded read/write so a blocked `localStorage` cannot lock the UI.
- Added `frontend/src/components/features/catalog/LocationPromptModal.tsx`, an unskippable modal shown on first visit that makes the user choose a sede before the catalog is usable.
- Sede switching from the catalog header goes through an Ant Design `Modal.confirm` ("Cambio de Sede") that warns the cart will be emptied; confirming persists the choice, clears the cart, and closes the cart drawer. Clicking the already-active sede remains a no-op and never wipes the cart.
- Added per-sede mock fixtures in `frontend/src/config/mockData.ts` (`getMockCatalogForLocation`). Products missing from a sede's map are not offered there; products mapped to `0` remain visible and out of stock.
- Updated `useCatalog(location)` so mock mode derives and caches the per-sede array; real mode is untouched and does not send a location yet.
- Added a two-button switcher (desktop header and mobile strip) in `CatalogHeader`, visible to every user, authenticated or guest. The only condition is that a sede has been chosen, because `SedeSwitcher` requires a concrete `LocationCode`. The active-sede text badge introduced at the same time was removed on 2026-11-01.
- Added the sede banner, overlay color, and a location-name subtitle in `CatalogHero` (the `Sede ` prefix was removed on 2026-11-01).
- Cart is cleared and the cart drawer closed on an explicit switcher click; clicking the already-active sede is a no-op and never wipes the cart.
- Added the `safePage` clamp so a sede or filter change cannot leave the UI on an out-of-range page.
- All user-facing copy is Spanish and emoji-free.
- Header copy (superseded 2026-11-01; switcher made public on 2026-11-02): the active-sede text badge was removed from the desktop header and the mobile strip. The header now shows the VF/GO switcher to all users, authenticated or guest, once a sede has been chosen; there is no separate sede text. The hero subtitle shows only the location name (`Valle Frío` / `Grano de Oro`); the `Sede` context is carried by the switcher labels, the group label `Seleccionar sede`, and the banner alt text.

#### Acceptance criteria

- On a machine with no stored sede, an unskippable modal asks the user to choose before the catalog is usable.
- The stored value is normalized and validated; an invalid value re-opens onboarding.
- Switching sede requires confirmation, persists to `hq_location`, and clears the cart.
- Each sede shows only its offered products; zero-stock products remain visible.
- Every user, authenticated or guest, sees and can use the switcher once a sede is chosen; the hero subtitle and banner alt text still convey the active sede.
- Mock mode works with no `.env`, no Supabase project, and no backend.
- ESLint clean on touched files; `tsc` at the pre-existing baseline with no new errors.
- No backend, schema, or `.env` changes.

#### Known limitation (first-visit demo)

To demo the first-visit flow, clear `hq_location` in DevTools (Application -> Local Storage) or use a fresh incognito window. A machine that already chose a sede will not show the modal.

### Phase 2 — Data architecture (database and API read contract)

**Status: In progress — the backend API migration is implemented in code, the live `reduce_stock_on_sale` trigger is now versioned at `backend/supabase/migrations/20261105_reduce_stock_on_sale.sql`, and the temporary `VF` fallback was removed from `POST /api/sales` on 2026-11-05 (missing or invalid `location_id` now returns `400`). RLS verification on `product_stock`, the versioned `locations`/`product_stock` table migrations, the atomic refund increment, and integration tests for the trigger/RPC path remain. The frontend `?sede` integration is committed (Phase 3). This is the highest-risk phase; see the dedicated section below.** Mock mode was removed on 2026-11-02 at the start of this phase, so all work now runs against real Supabase and backend services.

#### Objective

Create the real multi-location schema, backfill all existing data to `VF`, and move the stock invariant into a versioned, database-enforced path.

#### Scope

- **In:** `locations` and `product_stock` tables, `sales.location_id`, trigger extraction and rewrite, backfill of existing rows to `VF`, versioned migrations, rollback path, API location parameter and per-location stock reads.
- **Out:** admin UI filter, product-form sede controls, GO spreadsheet configuration, cart/checkout behavior changes beyond what location validation requires.

#### Work items

- Extract the current `reduce_stock_on_sale` definition from the live database and review it, including its behavior for composed products. **Completed 2026-11-05 — versioned at `backend/supabase/migrations/20261105_reduce_stock_on_sale.sql` (working tree; not yet committed or applied).**
- Commit a versioned migration for `locations` and seed `VF` and `GO`.
- Commit a versioned migration for `product_stock` with the non-negative constraint and the composite key.
- Backfill `product_stock` from `products.current_stock` for `VF`; `GO` is created empty.
- Add `sales.location_id` as nullable, backfill every existing row to `VF`, then set it `NOT NULL`.
- Rewrite the trigger to resolve the location from the sale and update `product_stock` instead of `products.current_stock`. **Completed 2026-11-05 — versioned at `backend/supabase/migrations/20261105_reduce_stock_on_sale.sql` (working tree; not yet committed or applied).**
- Keep `products.current_stock` until Phase 5 as a **write-only** compatibility bridge: it is written only on product create/update, the trigger does not maintain it, and nothing reads it. The framing is temporary, and it must never become a source of truth.
- Add the validated `location` parameter to catalog endpoints, with `current_stock` interpreted as stock at that location.
- Add backoffice endpoints returning a per-location stocks map.
- Define and document the rollback path before applying anything.
- Add integration coverage for the trigger/RPC behavior. The project currently has no test suite; this phase introduces the first meaningful database-level coverage.

#### Acceptance criteria

- The `VF` catalog is identical to today's catalog, product for product, including zero-stock visibility.
- The `GO` catalog is empty at the end of the phase, because `GO` has no associations yet.
- Zero-stock products remain visible in both sedes that offer them.
- A sale at `VF` decrements `VF` stock exactly as the current system does.
- No sale row has a null `location_id`.
- Migrations are tracked and reproducible on a copy of production data.
- No negative quantity is representable in `product_stock`.

### Phase 3 — Catalog and cart isolation (frontend)

**Status: In progress — the frontend catalog and cart isolation, including the `location_id` checkout payload, is committed; the backend `VF` fallback was removed on 2026-11-05. The manual end-to-end verification against the real backend remains.**

**Revision note (2026-11-03; updated 2026-11-05):** the catalog request now carries `?sede=VF|GO`, and the checkout payload carries `location_id`. The work items below describe the target; the frontend isolation and the `location_id` payload are committed. See `CHANGELOG-SEDES.md` for the shipped details. The backend `VF` fallback was removed on 2026-11-05, so `POST /api/sales` now returns `400` when `location_id` is missing or invalid. The manual end-to-end verification against the real backend remains. Provider and admin product views still default to `VF` (Phase 5).

#### Objective

Make the catalog consume the validated location contract and guarantee that the catalog view and the cart are single-sede before any sale is submitted.

#### Scope

- **In:** catalog consuming the validated location from the API, the visibility rule (association exists means offered; zero stock stays visible and unsellable), cart bound to one sede, clearing or re-keying the cart on any sede change, checkout payload carrying the location on the client side.
- **Out:** the server-side transaction, stock deduction, refund restoration, trigger/RPC work (Phase 4); admin surfaces and the product form (Phase 5); per-location pricing; stock transfers; fixtures or offline checkout.

#### Work items

- Thread the validated location from `useSede` into catalog fetching and into the cart's identity.
- Render only products whose association exists for the active sede. The real path now enforces this rule through the API's per-sede offerings.
- Keep zero-stock products visible and make them unsellable at the UI boundary.
- Re-key or clear the cart whenever the effective sede changes by any mechanism: an explicit switcher confirmation, a sede change made in another tab, or clearing storage. The cart now resets on any sede change, and `useSede` syncs across tabs through a `localStorage` `storage` listener.
- Known limitation: the sede remains a per-browser preference but now syncs across tabs through a `storage` event; carts stay per-tab and in-memory.
- Include exactly one location in the checkout payload sent by the client.
- Keep the user-facing copy Spanish.

#### Acceptance criteria

- Switching sede never retains items.
- A product not offered in the active sede is absent from the catalog.
- A zero-stock product is visible and unsellable.
- The checkout payload carries exactly one location.
- Checkout runs against the real backend, with no fixtures or offline fallback.

### Phase 4 — Secure checkout (backend)

**Status: In progress — partially implemented on Test, not complete.** Option A landed in the working tree: `createSale` now delegates sale creation to a single `process_location_checkout` RPC, and a new migration prepares the legacy `reduce_stock_on_sale` trigger to be disabled. The migration has **not** been applied to any database from this workspace.

**Revision note (2026-11-05):** `backend/src/controllers/SaleController.ts` keeps its validation and pre-computation (location parsing, Zod, payment normalization, product/entrepreneur lookups, composed-product demand expansion, cumulative stock pre-check, and server-side `totalAmount` from DB prices) and replaces the separate `sales` insert + `sale_items` insert + compensating delete with one `supabaseAdmin.rpc("process_location_checkout", { p_consumer_id, p_total, p_payment_type, p_payment_method, p_note, p_location_id, p_cart_items })` call. `p_cart_items` carries `{ product_id, quantity, unit_price, subtotal }` per processed item and the RPC expands composed products internally; `p_total` is server-computed and never read from the request body. `p_payment_method` is nulled for credit sales and `p_note` is trimmed and nulled when empty. The RPC returns the inserted `sale_id`; the controller re-fetches the complete sale with nested consumer data and leaves the notification/low-stock/Slack block unchanged. Errors map `23503` to `400 "Comprador inválido o inexistente"` and `23514` to `409 "Stock insuficiente para completar la venta"`; other errors rethrow to `respondWithError`, and no raw SQL reaches the client. If the RPC commits but the re-fetch fails, the controller logs `{ sale_id }` and returns `201 { id }` with notifications skipped to avoid a duplicate retry.

The new migration `backend/supabase/migrations/20261106_disable_reduce_stock_on_sale.sql` **disables** (does not drop) the legacy `reduce_stock_on_sale` trigger on `public.sale_items`; it is dated `2026-11-06` so it sorts after `20261105_reduce_stock_on_sale.sql`. Its fail-closed `DO` block raises if `public.sale_items`, `public.process_location_checkout`, or the trigger is missing, skips with a notice when the trigger is already disabled, and verifies `tgenabled='D'` after the `ALTER`. Rollback requires **both** steps: deploy a controller that does not call the RPC (or make the RPC stop deducting) **and** run `ALTER TABLE public.sale_items ENABLE TRIGGER reduce_stock_on_sale;`. Enabling the trigger while the RPC still deducts double-deducts. `public.process_location_checkout` is **not versioned in this repository**; extract it with `pg_get_functiondef` before promoting beyond Test.

**Security condition for Test:** since the RPC is unversioned and lives only in Supabase, the repository cannot verify grants. The operator must confirm that `anon`, `authenticated`, and `PUBLIC` cannot `EXECUTE` `public.process_location_checkout` and that only `service_role` can (for example via `has_function_privilege`), and must confirm the trigger state is `tgenabled='D'`.

**Still open in Phase 4:** version the `process_location_checkout` RPC definition in the repository; verify the RPC ACL and `PUBLIC` execute privileges on Test; verify the trigger is disabled and that a sale decrements stock exactly once, including composed products; the optional idempotency key; the atomic refund increment; RLS verification on `product_stock`; integration tests for the trigger/RPC path. The `23503`/`23514` message ambiguity and the `400`-vs-`409` pre-check inconsistency are known follow-ups. Pre-existing and out of scope: `POST /api/sales` remains public with a client-supplied `consumer_id`, no idempotency key exists yet, refund stock restore remains non-atomic, and `deleteSale` does not restore stock. See `CHANGELOG-SEDES.md` for the shipped details.

#### Objective

Make sale creation a single, location-aware, atomic backend operation whose stock invariant has exactly one owner.

#### Scope

- **In:** `POST /api/sales` receiving and validating the location, offering validation per item, a single transactional path with row locking, trigger/RPC ownership of the invariant, refund restoration to `sales.location_id`, per-location deduction for composed products, per-location low-stock alerts, per-location Google Sheets resolution, an optional idempotency key.
- **Out:** catalog and cart UI (Phase 3); admin UI and the product form (Phase 5); stock transfers; per-location pricing; GO spreadsheet configuration fields (deferred).

#### Work items

- Accept the location on `POST /api/sales` and validate it before touching stock.
- Reject any item that is not offered at the requested location, with a clear Spanish message.
- Replace the current multi-step flow with a single transactional path: sale header, sale items, and stock deduction commit or roll back together, using row locking so concurrent checkouts cannot oversell.
- Remove the post-hoc negative-stock log; enforcement lives in the database path, not in a server-side read after the fact.
- Establish exactly one owner of the invariant (trigger/RPC), so application code and a trigger never both deduct stock.
- Restore refunded quantities to the sale's sede with atomic increments.
- Deduct composed-product components per location.
- Evaluate low-stock alerts per location, with per-sede wording.
- Resolve Google Sheets per location: `VF` keeps the existing automation as a legacy fallback, and `GO` is skipped with a warning until configured. Do not add `GO` configuration fields.
- Treat the idempotency key as optional.
- Keep the public-endpoint threat model as a deferred decision and document that it remains open.

#### Acceptance criteria

- Concurrent checkouts cannot oversell.
- A `GO` sale decrements only `GO` stock, and `VF` is unchanged.
- A refund restores the sale's sede.
- A failed sale leaves no partial rows.
- A `GO` sale with no spreadsheet configuration still succeeds with a warning.

### Phase 5 — Backoffice management

**Status: Pending.** The frontend UI shell was implemented on 2026-11-01; see "Phase 5 implementation status" below.

#### Objective

Give administrators per-sede management of offerings, stock, payroll, and reporting, and retire the legacy stock column as the closing cleanup item of the workstream.

#### Scope

- **In:** per-sede offered toggle and stock in the product form, read-only computed availability for composed products, a dedicated stock endpoint, product lists showing `VF`/`GO`, an admin `All / VF / GO` filter over metrics and payroll, payroll grouped by location, per-sede low-stock alert wording, sede in exports, `products.current_stock` removal.
- **Out:** checkout backend work (Phase 4); catalog and cart work (Phase 3); per-location pricing; stock transfers; any deferred decision that is still unresolved.

#### Work items

- Add the per-sede offered toggle and stock fields to the product form. Until Phase 2/4 add and return `location_id` and the per-location stock contract, this is an inert per-sede offered/stock matrix (the fields exist but are not serialized). Composed products show computed availability read-only and are never edited directly.
- Add a dedicated stock endpoint instead of overloading the multipart product route.
- Show offering per sede (`VF`/`GO`) in product lists.
- Add a "Sede" column to the Entrepreneurs summary, the Consumers summary, and both detailed Sales tables, with a compact Ant Design `Select` (`Todas` / `VF` / `GO`) in the column header.
- Keep the filter state page-local: `AdminEntrepreneurs` and `AdminConsumers` each own a `sedeFilter: "ALL" | "VF" | "GO"` state and pass it to `useAdminData(enabled, sedeFilter)`. No React Context, no Redux, no state manager, no URL parameter.
- Filter once in `useAdminData` (`scopedSales`) and feed every memo from that scoped set; derive the per-entity `sedes` from the unfiltered sales and render it in `LOCATION_CODES` order.
- Reset scope-bound page-local state (selection, `idsToProcess`, payroll modal, detailed view, selected entity/user, open refund modal) whenever the filter changes, so a batch payroll or refund never acts on rows hidden by the new filter.
- Show the `GO` configuration as a visually distinct, disabled copy of the VF Google Sheets fields, with an empty `AppConfig` and no keys created. `useSettings` stays single-location.
- Apply low-stock alert wording per sede.
- Include the sede in exports (deferred; not part of this phase's frontend UI).
- Keep `products.current_stock` as a write-only compatibility column, not a live mirror: nothing reads it and the trigger does not maintain it. Do not reintroduce per-location data into it.
- Closing cleanup item: migrate every remaining `products.current_stock` consumer and remove the column in a versioned migration with a rollback path. The removal belongs to this phase, not to a separate one.

#### Acceptance criteria

- An administrator can toggle offering and set stock per sede.
- Composed availability is computed and never editable.
- The admin filter and payroll agree per sede.
- The filter defaults to `Todas`, resets on page reload, and resets on navigation between admin pages.
- Filtered totals for `VF` and `GO` sum to the unfiltered totals.
- A selection cannot survive a filter change: payroll and refunds never act on rows hidden by the new filter.
- The Sede column and filter are hidden when no sale carries `location_id`.
- The settings tab shows the `GO` configuration as an inert, disabled empty block, and no `GO` configuration keys are created while the decision is deferred.
- The per-sede offered/stock matrix renders as an inert placeholder until Phase 2/4 return `location_id`; real mode is otherwise visually unchanged.
- No code reads `products.current_stock` while it is retained as a write-only compatibility column; the column is removed in the cleanup item.
- No deferred decision was implemented without an explicit resolution recorded in this document.

#### Table-level Sede filters (pivot)

The administration surface stays unified. The control is a **filter**, never a scope, per locked rule 4, and it never changes what the catalog or the cart see.

- **Rejected approach:** the global Topbar filter and the `AdminLocationProvider` approach described in an earlier revision of this plan were **rejected** by the product owner. Do not reintroduce them.
- **Default behavior:** admin panels show ALL data. The filter starts at `"ALL"` and resets on page reload and on navigation between admin pages. This is standard table UX and is explicitly accepted.
- **State ownership:** each admin page (`AdminEntrepreneurs`, `AdminConsumers`) owns a local `sedeFilter: "ALL" | "VF" | "GO"` state and passes it to `useAdminData(enabled, sedeFilter)`. There is no React Context, no Redux, no state manager, and no URL parameter.
- **Data aggregation:** `useAdminData` filters ONCE (`scopedSales`) and feeds every memo. The `sedes` array on each summary row is derived from the unfiltered sales and rendered in `LOCATION_CODES` order. Summaries stay one row per entity; the Sede cell can show `VF`, `GO`, or both. Detailed sales rows carry exactly one sede.
- **UI:** a "Sede" column is added to the Entrepreneurs summary, the Consumers summary, and both detailed Sales tables. The column header hosts a compact Ant Design `Select` (`Todas` / `VF` / `GO`) wired to the same page state. Because these are native `<table>` elements, this is a header `Select` rather than Ant Design `Table.filters`; migrating the tables to Ant Design `Table` is explicitly rejected to avoid a redesign (custom cells, row click, checkbox selection semantics, mobile duplicates).
- **Safety:** changing the filter resets scope-bound local state — selection, `idsToProcess`, payroll modal, detailed view, selected entity/user, and any open refund modal — so a batch payroll or refund can never act on rows hidden by the new filter. The `pendingIds`/`sedes` arrays are cloned so the static summary maps are never mutated.
- **Transition gating:** the Sede column and filter render only when at least one sale carries `location_id`. Until Phase 2/4 add and return that column, real mode is visually unchanged. The filter is client-side only and is not an authorization control.
- **Out of scope for this phase:** mobile layout work (on standby), exports including the sede (deferred), and server-side `GET /sales?location=` (documented scale follow-up).
- **Dashboard index:** `/dashboard` stays unfiltered (`ALL`) and shows no Sede control; only the three admin tables expose the column filter.

#### Settings — GO configuration (inert)

The "Hoja de Administración" settings tab keeps `VF` as the only active configuration. `GO` is shown as a placeholder until Administration resolves the deferred decision.

- The `GO` configuration is shown as a visually distinct, **disabled** copy of the VF Google Sheets fields, with an empty `AppConfig` and a Spanish note that configuration is pending Administration approval.
- No `GO` configuration keys are created, no request is made, and the disabled block cannot be saved. `useSettings` stays single-location.
- When Administration approves, the block will be enabled and namespaced keys (`spreadsheet_id_go`, `credits_sheet_go`, `payments_sheet_go`) will be added; `googleSheetsConfig` will then become location-aware with `VF` as the legacy fallback.
- VF behavior is unchanged.

## HIGH RISK — Phase 2 schema work

Phase 2 is the highest-risk phase in this workstream. The stock invariant lives in a database object that **was not versioned in the repository** before 2026-11-05, and the repository still contains no migration history for the rest of the schema. A wrong edit here corrupts stock silently, and there was no committed artifact to diff against.

**Status update (2026-11-05):** the live `reduce_stock_on_sale` trigger was extracted and reviewed; its definition is now versioned at `backend/supabase/migrations/20261105_reduce_stock_on_sale.sql` (working tree; not yet committed or applied), and the temporary `VF` fallback was removed from `POST /api/sales`. The remaining non-negotiables below still apply: RLS verification on `product_stock`, versioned `locations`/`product_stock` migrations, a rehearsal against production data, and a written rollback path.

The following are non-negotiable for Phase 2:

- **Extract and review the trigger first.** Before changing anything, extract the live `reduce_stock_on_sale` definition and confirm exactly how it handles composed products. Its behavior is the current source of truth for stock correctness.
- **All schema changes must be delivered as versioned migrations**, committed to the repository or applied through a tracked migration workflow. No blind edits against Supabase. If it is not in the repository, it did not happen.
- **Rehearse the migration against a copy of production data.** The rehearsal must include the backfill and the trigger swap.
- **`locations` and `product_stock` are created and backfilled.** `VF` receives the current stock values; `GO` is created empty.
- **`sales.location_id` is added nullable, backfilled to `VF`, then made `NOT NULL`.** Existing sales never lose their location.
- **The trigger is rewritten** to resolve the location from the sale and update `product_stock`, not `products.current_stock`.
- **A rollback path is required** and must be written down before apply. `products.current_stock` is no longer read by the backend; it remains until Phase 5 only as a compatibility column.
- **Phase 2 acceptance includes:** the `VF` catalog is identical to today; the `GO` catalog is empty; zero-stock products are still visible; and sales still decrement `VF` correctly.

If the extracted trigger's behavior cannot be fully explained, stop. Do not proceed to rewrite it from inference.

## Cross-cutting guardrails

- **Real services are non-negotiable.** Every phase must run against the real Supabase and backend services; a change that requires fixtures or mock-injection to render the app is incomplete.
- **The changelog is the final step of every Sedes task.** No Sedes task is complete until `CHANGELOG-SEDES.md` has an entry with date, files, behavior change, and verification.
- **Deploy order is fixed:** backend first in a backward-compatible form, then frontend, then make `location` required. Never ship a required parameter before a backend that accepts it exists.
- **No Redux and no new state manager.** Use custom hooks, early returns, and the existing Tailwind/AntD patterns.
- **No emojis** in code, UI copy, commit messages, or documentation.
- **Tests are currently absent.** Phase 2 must add integration coverage for the trigger/RPC path; later phases expand it.
- **One sale, one location.** Any implementation that can represent a mixed sale is invalid, regardless of UI safeguards.
- **Sede detection is a local preference, not an authorization control.** The backend must validate any sede used for stock, pricing, or sales. This is why the catalog header switcher is public to every user, authenticated or guest (locked rule 4).

## Deferred decisions

These are open. Do not implement them, and do not assume an answer to them.

| Decision | Owner | Status | Lands in |
|---|---|---|---|
| Product-form default toggles per sede | Office Manager | Deferred | Phase 5 |
| GO spreadsheet configuration | Administration | Deferred; UI shows a disabled empty GO block, and no GO keys are created until Administration approves. | Phase 4 (runtime fallback) and Phase 5 (configuration) |
| Admin-side sede selector placement | Product/Admin | Deferred; admin layout untouched | Phase 5 |
| Kiosk/device threat model for the public sale endpoint | Pending | Pending | Phase 4 |

## Phase status

| Phase | Name | Status | Date |
|---|---|---|---|
| 1 | Context and detection (frontend) | Completed | 2026-10-31 |
| 2 | Data architecture (database and API read contract) | In progress — backend API migration done in code; trigger definition versioned at `backend/supabase/migrations/20261105_reduce_stock_on_sale.sql` (2026-11-05). Still pending: `locations`/`product_stock` table migrations, RLS verification on `product_stock`, atomic refund increment, and integration tests for the trigger/RPC path | Started 2026-11-03 |
| 3 | Catalog and cart isolation (frontend) | In progress — frontend isolation and `location_id` payload committed; backend `VF` fallback removed 2026-11-05; manual end-to-end verification against the real backend pending | Started 2026-11-03 |
| 4 | Secure checkout (backend) | In progress — partially implemented on Test: `createSale` uses the `process_location_checkout` RPC and migration `20261106_disable_reduce_stock_on_sale.sql` is prepared (2026-11-05, working tree, not applied). Still pending: version the RPC, verify RPC ACL and trigger state on Test, idempotency key, atomic refund increment, RLS on `product_stock`, and integration tests | Started 2026-11-05 |
| 5 | Backoffice management | Pending (UI shell implemented) | UI shell 2026-11-01 |

## Phase 5 implementation status

The frontend UI shell for Phase 5 was implemented on **2026-11-01**. It covers the table-level Sede columns and filters, the inert GO settings block, and the per-sede offered/stock matrix in the product form.

The phase remains **Pending** until the real `location_id` data and the Phase 2/4 backend land. Until then, real mode renders no Sede column or filter (sales do not yet carry `location_id`), the GO settings block stays inert, and the product matrix is inert because its per-sede fields are not serialized.

## Agent checklist

Before starting work on any phase, confirm each item:

- [ ] Read this file in full.
- [ ] Read `CHANGELOG-SEDES.md` and identify the last shipped state.
- [ ] Verify the current phase status in the table above; do not start a phase out of order without an explicit instruction.
- [ ] Confirm that no deferred decision is being assumed or silently implemented.
- [ ] Confirm the change runs against the real Supabase and backend services and does not reintroduce fixtures or mock-injection.
- [ ] Confirm the change obeys the seven locked business rules.
- [ ] For Phase 2 and Phase 4, confirm the trigger has been extracted and reviewed before any schema edit or checkout rewrite.
- [ ] Update `CHANGELOG-SEDES.md` as the final step, with verification.
