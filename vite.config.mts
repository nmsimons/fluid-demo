import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import dotenv from "dotenv";
import tailwindcss from "@tailwindcss/vite";
import { visualizer } from "rollup-plugin-visualizer";

// Load environment variables
dotenv.config();

export default defineConfig(() => {
	return {
		plugins: [
			react(),
			tailwindcss(),
			visualizer({
				filename: "dist/bundle-analysis.html",
				open: false,
				gzipSize: true,
				brotliSize: true,
			}),
		],
		build: {
			outDir: "dist",
			sourcemap: true,
			rollupOptions: {
				/**
				 * It'd be nice to turn this on, but the following pattern used in tree is not properly processed by rollup:
				 *
				 * ```ts
				 * export const MapNodeSchema = {
				 * 	[Symbol.hasInstance](value: TreeNodeSchema): value is MapNodeSchema {
				 * 		return isMapNodeSchema(value);
				 * 	},
				 * } as const;
				 * ```
				 *
				 * Specifically, rollup decides the Symbol.hasInstance property is dead code and removes it.
				 * There is some commentary on this PR which is related, but alludes to this behavior being pre-existing
				 * (and the PR description seems to imply this is by design):
				 * https://github.com/rollup/rollup/pull/6046
				 */
				treeshake: false,
			},
			// Let Vite handle chunking automatically - no manual chunking
		},
		server: {
			port: 8080,
			host: true, // Allow access from network
			hot: true,
			strictPort: true, // Fail if port is already in use
		},
	};
});
