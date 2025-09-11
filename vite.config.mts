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
			// Only expose specific environment variables that are actually needed
			"process.env.FLUID_CLIENT": JSON.stringify(env.FLUID_CLIENT),
			"process.env.AZURE_TENANT_ID": JSON.stringify(env.AZURE_TENANT_ID),
			"process.env.AZURE_FUNCTION_TOKEN_PROVIDER_URL": JSON.stringify(
				env.AZURE_FUNCTION_TOKEN_PROVIDER_URL
			),
			"process.env.AZURE_ORDERER": JSON.stringify(env.AZURE_ORDERER),
			"process.env.AZURE_CLIENT_ID": JSON.stringify(env.AZURE_CLIENT_ID),
			"process.env.AZURE_REDIRECT_URI": JSON.stringify(env.AZURE_REDIRECT_URI),
			"process.env.NODE_ENV": JSON.stringify(env.NODE_ENV || mode),
		},
	};
});
