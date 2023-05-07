const OFFLINE_CACHE_NAME = 'offline-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(OFFLINE_CACHE_NAME)
      .then((offlineCache) => offlineCache.addAll([getOfflinePageUrl()]))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch((error) => {
      if (event.request.mode !== 'navigate') throw error;
      return caches.open(OFFLINE_CACHE_NAME).then((offlineCache) =>
        offlineCache.match(getOfflinePageUrl()).then((offlineResponse) => {
          if (offlineResponse) return offlineResponse;
          throw error;
        })
      );
    })
  );
});

self.addEventListener("fetch", event => {
    console.log(`URL requested: ${event.request.url}`);
});

function getOfflinePageUrl() {
  return '/resource/pwa/offlinepage.html';
}