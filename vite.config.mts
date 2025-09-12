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
			})
		],
		build: {
			outDir: "dist",
			sourcemap: true,
			rollupOptions: {
				output: {
					manualChunks: (id) => {
						// Create separate chunks for major dependencies
						if (id.includes('node_modules')) {
							if (id.includes('@fluidframework')) {
								return 'fluid-framework';
							}
							if (id.includes('react') || id.includes('react-dom')) {
								return 'react-vendor';
							}
							if (id.includes('@fluentui')) {
								return 'fluentui';
							}
							if (id.includes('@azure/msal')) {
								return 'azure-auth';
							}
							if (id.includes('tailwindcss') || id.includes('@tailwindcss')) {
								return 'tailwind';
							}
							// Group other node_modules
							return 'vendor';
						}
						
						// Split app code by feature
						if (id.includes('/src/utils/')) {
							return 'utils';
						}
						if (id.includes('/src/react/components/')) {
							return 'components';
						}
						if (id.includes('/src/schema/')) {
							return 'schema';
						}
						if (id.includes('/src/infra/')) {
							return 'infra';
						}
					}
				}
			}
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
