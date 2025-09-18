import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import dotenv from "dotenv";
import tailwindcss from "@tailwindcss/vite";
import { visualizer } from "rollup-plugin-visualizer";

// Load environment variables
dotenv.config();

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "");

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
			// Let Vite handle chunking automatically - no manual chunking
		},
		server: {
			port: 8080,
			host: true, // Allow access from network
			hot: true,
			strictPort: true, // Fail if port is already in use
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
			// Azure OpenAI environment variables
			"process.env.AZURE_OPENAI_API_KEY": JSON.stringify(env.AZURE_OPENAI_API_KEY),
			"process.env.AZURE_OPENAI_API_INSTANCE_NAME": JSON.stringify(
				env.AZURE_OPENAI_API_INSTANCE_NAME
			),
			"process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME": JSON.stringify(
				env.AZURE_OPENAI_API_DEPLOYMENT_NAME
			),
			"process.env.AZURE_OPENAI_API_VERSION": JSON.stringify(env.AZURE_OPENAI_API_VERSION),
			"process.env.AZURE_OPENAI_BASE_PATH": JSON.stringify(env.AZURE_OPENAI_BASE_PATH),
			"process.env.OPENAI_API_KEY": JSON.stringify(env.OPENAI_API_KEY),
			"process.env.OPENAI_MODEL": JSON.stringify(env.OPENAI_MODEL),
			"process.env.AZURE_OPENAI_MANUAL_TOKEN": JSON.stringify(env.AZURE_OPENAI_MANUAL_TOKEN),
			"process.env.AUTHORITY": JSON.stringify(env.AUTHORITY),
		},
	};
});
