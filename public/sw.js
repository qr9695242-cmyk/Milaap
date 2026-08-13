// Minimal service worker — sirf install-eligibility ke liye (Chrome PWA
// criteria mein ek registered service worker chahiye hota hai). Jaan-boojh
// kar koi caching nahi ki gayi hai taake app hamesha latest data dikhaye.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // No-op — let the browser handle every request normally.
});
