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
