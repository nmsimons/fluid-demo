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
						// Split large dependencies into separate chunks
						if (id.includes("node_modules")) {
							if (id.includes("react") || id.includes("react-dom")) {
								return "vendor-react";
							}
							if (id.includes("@fluidframework")) {
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
							return "vendor-other";
						}
					},
				},
			},
			chunkSizeWarningLimit: 1000,
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
