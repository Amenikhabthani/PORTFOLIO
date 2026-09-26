const CACHE_NAME = "ameni-portfolio-v1";
const PAGE_URLS = ["", "index.html", "service-details-sr1.html", "service-details-sr2.html", "service-details-sr3.html"];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(PAGE_URLS.map(path => new URL(path, self.registration.scope).href));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.filter(name => name.startsWith("ameni-portfolio-") && name !== CACHE_NAME).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const requestUrl = new URL(request.url);

  if (request.method !== "GET" || requestUrl.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(request);
        if (response.ok) await cache.put(request, response.clone());
        return response;
      } catch {
        return await cache.match(request) || await cache.match(new URL("index.html", self.registration.scope).href);
      }
    })());
    return;
  }

  if (!requestUrl.pathname.includes("/assets/") || /\.(mp4|pdf)$/i.test(requestUrl.pathname)) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    const refresh = fetch(request).then(response => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    });

    if (cachedResponse) {
      event.waitUntil(refresh.catch(() => {}));
      return cachedResponse;
    }

    try {
      return await refresh;
    } catch {
      return Response.error();
    }
  })());
});