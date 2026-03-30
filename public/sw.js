// Minimal service worker for PWA "Add to Home Screen" support.
// Does NOT cache aggressively — this is a dev/testing tool, not offline-first.

const CACHE_NAME = 'primer-v1'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  // Pass through all requests — no caching for now.
  // The service worker exists only to enable PWA install prompt.
  event.respondWith(fetch(event.request))
})
