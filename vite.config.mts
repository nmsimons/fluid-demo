import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import dotenv from "dotenv";
import tailwindcss from "@tailwindcss/vite";

// Load environment variables
dotenv.config();

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "");

	return {
		plugins: [react(), tailwindcss()],
		base: "/",
		build: {
			outDir: "dist",
			sourcemap: false,
			minify: "terser",
			rollupOptions: {
				treeshake: {
					moduleSideEffects: false,
				},
				output: {
					manualChunks: (id) => {
						// Split large dependencies into separate chunks to stay under Azure limits
						if (id.includes("node_modules")) {
							if (id.includes("react") || id.includes("react-dom")) {
								return "vendor-react";
							}
							// Keep all Fluid Framework in one chunk to avoid circular dependency issues
							if (id.includes("@fluidframework") || id.includes("fluid-framework")) {
								return "vendor-fluid";
							}
							if (id.includes("@fluentui")) {
								return "vendor-fluentui";
							}
							if (id.includes("@azure") || id.includes("msal")) {
								return "vendor-azure";
							}
							if (id.includes("lodash")) {
								return "vendor-lodash";
							}
							// Split other large dependencies
							if (id.includes("@microsoft/microsoft-graph")) {
								return "vendor-graph";
							}
							if (id.includes("@tanstack")) {
								return "vendor-tanstack";
							}
							return "vendor-other";
						}
					},
				},
			},
			chunkSizeWarningLimit: 2000,
		},
		publicDir: "public",
		server: {
			port: 8080,
			hot: true,
		},
		define: {
			"process.env": env,
		},
	};
});
