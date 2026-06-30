import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, '.', '');

	// In production the site and the plants API share an origin (mynativeplantlist.com/api/...),
	// so the browser calls /api/* directly. For local dev there's no backend on the dev server,
	// so proxy /api/* to the upstream API's origin (taken from PLANTS_API_URL in .env).
	const apiOrigin = env.PLANTS_API_URL ? new URL(env.PLANTS_API_URL).origin : undefined;

	return {
		plugins: [tailwindcss(), sveltekit()],
		server: apiOrigin ? { proxy: { '/api': { target: apiOrigin, changeOrigin: true } } } : undefined
	};
});
