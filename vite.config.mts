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
			rollupOptions: {
				output: {
					manualChunks: {
						vendor: ['react', 'react-dom'],
						fluidFramework: ['@fluidframework/aqueduct', '@fluidframework/map'],
						azure: ['@azure/msal-browser']
					}
				}
			}
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
