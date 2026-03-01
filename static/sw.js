// __BUILD_HASH__ is replaced with an 8-character hex hash by the swCacheBuster
// Vite plugin at build time. In dev, the literal string is used — that's fine.
const CACHE = 'sarisarify-__BUILD_HASH__';

// Install: nothing to prefetch — activate immediately
self.addEventListener('install', () => {
	self.skipWaiting();
});

// Activate: delete all caches that don't match the current build hash,
// then claim all clients so the new SW takes effect without a page reload.
self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys().then((keys) =>
			Promise.all(
				keys
					.filter((key) => key !== CACHE)
					.map((key) => caches.delete(key))
			)
		).then(() => self.clients.claim())
	);
});

self.addEventListener('fetch', (event) => {
	const { request } = event;
	const url = new URL(request.url);

	// Only handle same-origin requests
	if (url.origin !== self.location.origin) return;

	// Immutable assets (content-hashed by SvelteKit) — cache-first, forever
	if (url.pathname.startsWith('/_app/immutable/')) {
		event.respondWith(
			caches.match(request).then((cached) => cached ?? fetchAndCache(request))
		);
		return;
	}

	// Navigation requests — network-first, fall back to cached shell offline
	if (request.mode === 'navigate') {
		event.respondWith(
			fetch(request)
				.then((response) => {
					const clone = response.clone();
					caches.open(CACHE).then((cache) => cache.put('/index.html', clone));
					return response;
				})
				.catch(() => caches.match('/index.html'))
		);
		return;
	}

	// Everything else (icons, manifest) — network-first, fall back to cache
	event.respondWith(
		fetch(request)
			.then((response) => {
				const clone = response.clone();
				caches.open(CACHE).then((cache) => cache.put(request, clone));
				return response;
			})
			.catch(() => caches.match(request))
	);
});

function fetchAndCache(request) {
	return fetch(request).then((response) => {
		const clone = response.clone();
		caches.open(CACHE).then((cache) => cache.put(request, clone));
		return response;
	});
}