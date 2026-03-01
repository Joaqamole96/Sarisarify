import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { createHash } from 'crypto';
import { readFileSync, writeFileSync } from 'fs';

// A short, stable hash derived from the current timestamp at build time.
// Changes on every build — guarantees returning users get the new service worker.
const BUILD_HASH = createHash('sha256')
	.update(Date.now().toString())
	.digest('hex')
	.slice(0, 8);

// Vite plugin that replaces __BUILD_HASH__ in the built sw.js with the actual hash.
// sw.js lives in /static and is copied as-is by SvelteKit — we rewrite it post-build.
function swCacheBuster() {
	return {
		name: 'sw-cache-buster',
		closeBundle() {
			const swPath = 'build/sw.js';
			try {
				const content = readFileSync(swPath, 'utf-8');
				const updated = content.replace('__BUILD_HASH__', BUILD_HASH);
				writeFileSync(swPath, updated);
				console.log(`[sw-cache-buster] Cache key: sarisarify-${BUILD_HASH}`);
			} catch {
				// Not a production build (e.g. `vite dev`) — sw.js is served from /static directly.
			}
		}
	};
}

export default defineConfig({
	plugins: [tailwindcss(), sveltekit(), swCacheBuster()]
});