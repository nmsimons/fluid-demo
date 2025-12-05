declare const __APP_VERSION__: string;

interface ImportMetaEnv {
	readonly DEV: boolean;
	readonly PROD: boolean;
	readonly SSR: boolean;
	readonly BASE_URL: string;
	readonly VITE_OPENAI_BASE_URL?: string;
	readonly VITE_OPENAI_API_KEY?: string;
	readonly VITE_AUTHORITY?: string;
	readonly VITE_FLUID_CLIENT?: string;
	readonly VITE_AZURE_CLIENT_ID?: string;
	readonly VITE_AZURE_REDIRECT_URI?: string;
	readonly VITE_AZURE_TENANT_ID?: string;
	readonly VITE_AZURE_FUNCTION_TOKEN_PROVIDER_URL?: string;
	readonly VITE_AZURE_ORDERER?: string;
	readonly VITE_AZURE_OPENAI_API_INSTANCE_NAME?: string;
	readonly VITE_AZURE_OPENAI_API_DEPLOYMENT_NAME?: string;
	readonly VITE_AZURE_OPENAI_API_VERSION?: string;
	readonly VITE_AZURE_OPENAI_MANUAL_TOKEN?: string;
	readonly VITE_AZURE_OPENAI_BASE_PATH?: string;
	readonly VITE_OPENAI_MODEL?: string;
	readonly VITE_OPENAI_AVAILABLE_MODELS?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
