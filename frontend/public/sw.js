// SafeVixAI Service Worker - offline cache plus queued SOS/report replay.

const CACHE_NAME = 'safevixai-v3';

const OFFLINE_DATA_URLS = [
  '/offline-data/first-aid.json',
  '/offline-data/india-emergency.geojson',
  '/offline-data/violations.csv',
  '/offline-data/state_overrides.csv',
  '/offline-data/accidents_summary.json',
];

const STATIC_ASSETS = [
  '/',
  '/sos',
  '/first-aid',
  '/emergency',
  '/offline-data/first-aid.json',
  '/offline-data/india-emergency.geojson',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([...OFFLINE_DATA_URLS, ...STATIC_ASSETS].filter(
        (url, i, arr) => arr.indexOf(url) === i
      )).catch(() => undefined);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (url.pathname.startsWith('/api/')) return;

  if (url.pathname.startsWith('/offline-data/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return cached || fetch(event.request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        });
      })
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'sos-queue-flush') {
    event.waitUntil(flushSafeVixSosQueue());
  }
  if (event.tag === 'road-report-queue-flush') {
    event.waitUntil(flushSafeVixRoadReportQueue());
  }
});

async function flushSafeVixSosQueue() {
  const db = await openSafeVixDb();
  const tx = db.transaction('sos-queue', 'readwrite');
  const store = tx.objectStore('sos-queue');
  const [items, keys] = await Promise.all([
    idbRequest(store.getAll()),
    idbRequest(store.getAllKeys()),
  ]);

  for (let i = 0; i < items.length; i += 1) {
    const pendingSOS = items[i];
    const key = keys[i];
    const apiBase = pendingSOS.apiUrl;
    if (!apiBase) continue;

    const resp = await fetch(
      `${apiBase.replace(/\/+$/, '')}/api/v1/emergency/sos?lat=${pendingSOS.lat}&lon=${pendingSOS.lon}`,
      { method: 'POST' }
    );

    if (!resp.ok) break;

    await idbRequest(store.delete(key));
    const clients = await self.clients.matchAll();
    clients.forEach((client) =>
      client.postMessage({ type: 'SOS_QUEUE_FLUSHED', success: true })
    );
  }
}

async function flushSafeVixRoadReportQueue() {
  const db = await openSafeVixDb();
  const tx = db.transaction('road-report-queue', 'readwrite');
  const store = tx.objectStore('road-report-queue');
  const [items, keys] = await Promise.all([
    idbRequest(store.getAll()),
    idbRequest(store.getAllKeys()),
  ]);

  for (let i = 0; i < items.length; i += 1) {
    const pendingReport = items[i];
    const key = keys[i];
    const apiBase = pendingReport.apiUrl;
    if (!apiBase) continue;

    const formData = new FormData();
    formData.append('lat', String(pendingReport.lat));
    formData.append('lon', String(pendingReport.lon));
    formData.append('issue_type', pendingReport.issue_type);
    formData.append('severity', String(pendingReport.severity));
    if (pendingReport.description) {
      formData.append('description', pendingReport.description);
    }
    if (pendingReport.photo) {
      formData.append('photo', pendingReport.photo, pendingReport.photoName || 'road-report.webp');
    }

    const resp = await fetch(`${apiBase.replace(/\/+$/, '')}/api/v1/roads/report`, {
      method: 'POST',
      body: formData,
    });

    if (!resp.ok) break;

    await idbRequest(store.delete(key));
    const clients = await self.clients.matchAll();
    clients.forEach((client) =>
      client.postMessage({ type: 'ROAD_REPORT_QUEUE_FLUSHED', success: true })
    );
  }
}

function openSafeVixDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('safevix-offline-db', 2);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('sos-queue')) {
        const store = db.createObjectStore('sos-queue', { keyPath: 'id', autoIncrement: true });
        store.createIndex('by-timestamp', 'timestamp');
      }
      if (!db.objectStoreNames.contains('road-report-queue')) {
        const store = db.createObjectStore('road-report-queue', { keyPath: 'id', autoIncrement: true });
        store.createIndex('by-timestamp', 'timestamp');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function idbRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
