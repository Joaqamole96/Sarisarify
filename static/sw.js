const CACHE = 'sarisarify-v1';

// Install: nothing to prefetch — activate immediately
self.addEventListener('install', () => {
	self.skipWaiting();
});

// Activate: claim all clients immediately
self.addEventListener('activate', (event) => {
	event.waitUntil(self.clients.claim());
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

	// Navigation requests — network-first, cache on success, fall back to cache offline
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

	// Everything else (icons, manifest, fonts) — network-first, fall back to cache
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