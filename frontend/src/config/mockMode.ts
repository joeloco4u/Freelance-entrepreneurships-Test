// Local development only. Mocks are ON by default in `vite dev` and OFF in production builds.
// Disable with VITE_MOCK_MODE=false in development; production is always gated by DEV.
// No .env file is required: these values are self-contained so the app boots offline.
export const MOCK_MODE: boolean = import.meta.env.DEV && import.meta.env.VITE_MOCK_MODE !== "false";

// Reserved TLD (.invalid): no third-party DNS resolution is possible.
export const MOCK_SUPABASE_URL = "https://mock.invalid";

// A syntactically valid, unsigned anon key placeholder. Supabase only requires a non-empty key.
export const MOCK_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6Im1vY2siLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6NDEwMjQ0NDgwMH0.mock-signature-placeholder";
