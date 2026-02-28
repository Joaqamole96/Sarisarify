import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		VitePWA({
			registerType: 'autoUpdate',
			// Service worker only active in prod build — dev uses hot reload
			devOptions: { enabled: false },
			manifest: {
				name: 'Sarisarify',
				short_name: 'Sarisarify',
				description: 'Sari-sari store management app',
				theme_color: '#16a34a',
				background_color: '#ffffff',
				display: 'standalone',
				orientation: 'portrait',
				scope: '/',
				start_url: '/',
				icons: [
					{
						src: '/icon-192.png',
						sizes: '192x192',
						type: 'image/png'
					},
					{
						src: '/icon-512.png',
						sizes: '512x512',
						type: 'image/png'
					}
				]
			},
			workbox: {
				globDirectory: 'build',
				globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
				navigateFallback: 'index.html',
				runtimeCaching: []
			}
		})
	]
});