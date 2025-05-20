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
		build: {
			outDir: "dist",
			sourcemap: true,
		},
		server: {
			port: 8080,
			hot: true,
		},
		define: {
			"process.env": env,
		},
	};
});
