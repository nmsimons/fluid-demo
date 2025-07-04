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
							// Split Fluid Framework more granularly to avoid circular deps
							if (id.includes("@fluidframework/core-interfaces") || id.includes("@fluidframework/common-definitions")) {
								return "vendor-fluid-core";
							}
							if (id.includes("@fluidframework/container-definitions") || id.includes("@fluidframework/container-loader")) {
								return "vendor-fluid-container";
							}
							if (id.includes("@fluidframework/runtime-definitions") || id.includes("@fluidframework/datastore-definitions")) {
								return "vendor-fluid-runtime";
							}
							if (id.includes("@fluidframework/tree")) {
								return "vendor-fluid-tree";
							}
							if (id.includes("@fluidframework/presence")) {
								return "vendor-fluid-presence";
							}
							if (id.includes("@fluidframework")) {
								return "vendor-fluid-other";
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
			chunkSizeWarningLimit: 800,
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
