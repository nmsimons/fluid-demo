declare const __APP_VERSION__: string;

interface ImportMetaEnv {
	readonly VITE_OPENAI_BASE_URL?: string;
	readonly VITE_OPENAI_API_KEY?: string;
	readonly VITE_AUTHORITY?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
