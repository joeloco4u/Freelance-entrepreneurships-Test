import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig, loadEnv } from "vite";

const DEFAULT_PROXY_TARGET = "http://localhost:3000";

function resolveProxyTarget(raw: string | undefined): string {
	const origin = (raw ?? "")
		.trim()
		.replace(/\/+$/, "")
		.replace(/\/api$/i, "");

	return /^https?:\/\//i.test(origin) ? origin : DEFAULT_PROXY_TARGET;
}

export default defineConfig(({ mode }) => {
	const envDir = fileURLToPath(new URL(".", import.meta.url));
	const env = loadEnv(mode, envDir, "VITE_");

	return {
		plugins: [react(), tailwindcss()],
		build: {
			target: "esnext",
			sourcemap: false,
			minify: "esbuild",
			cssMinify: true,
			rollupOptions: {
				output: {
					manualChunks: {
						vendor: ["react", "react-dom", "react-router-dom"],
						ui: ["antd"],
					},
				},
			},
		},
		server: {
			port: 5173,
			proxy: {
				"/api": {
					target: resolveProxyTarget(env.VITE_API_URL),
					changeOrigin: true,
				},
			},
		},
	};
});
