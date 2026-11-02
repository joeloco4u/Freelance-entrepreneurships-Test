// Mocks are ON by default in `vite dev` (no .env required) and OFF in production builds.
// An explicit `VITE_MOCK_MODE=true` at BUILD time enables mocks in a production build,
// intended for deployments without a backend. It must be unset/false for a real
// production deployment. The value is baked in at build time (changing it requires
// a rebuild); it is not read at runtime.
const explicitMock = import.meta.env.VITE_MOCK_MODE === "true";
const devDefault = import.meta.env.DEV && import.meta.env.VITE_MOCK_MODE !== "false";

// Explicit opt-in wins in ANY build (including a production/Vercel build).
// In development, mocks stay ON unless VITE_MOCK_MODE is exactly "false".
export const MOCK_MODE: boolean = explicitMock || devDefault;

// Reserved TLD (.invalid): no third-party DNS resolution is possible.
export const MOCK_SUPABASE_URL = "https://mock.invalid";

// A syntactically valid, unsigned anon key placeholder. Supabase only requires a non-empty key.
export const MOCK_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6Im1vY2siLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6NDEwMjQ0NDgwMH0.mock-signature-placeholder";
