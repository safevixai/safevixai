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

// P1-12: Each item is flushed in its own isolated transaction.
// If the network fails mid-loop, only successfully-sent items are deleted.
// The remaining items stay in the queue and are retried on the next sync event.
async function flushSafeVixSosQueue() {
  let db;
  try {
    db = await openSafeVixDb();

    // Read all pending items in a read-only transaction first
    const readTx = db.transaction('sos-queue', 'readonly');
    const readStore = readTx.objectStore('sos-queue');
    const [items, keys] = await Promise.all([
      idbRequest(readStore.getAll()),
      idbRequest(readStore.getAllKeys()),
    ]);

    for (let i = 0; i < items.length; i += 1) {
      const pendingSOS = items[i];
      const key = keys[i];
      const apiBase = pendingSOS.apiUrl;
      if (!apiBase) continue;

      // S19: Include Authorization header when available.
      // The authToken is stored in the IDB item at queue time (see offline-sos-queue.ts).
      const headers = { 'Content-Type': 'application/json' };
      if (pendingSOS.authToken) {
        headers['Authorization'] = `Bearer ${pendingSOS.authToken}`;
      }

      const resp = await fetch(
        `${apiBase.replace(/\/+$/, '')}/api/v1/emergency/sos?lat=${pendingSOS.lat}&lon=${pendingSOS.lon}`,
        { method: 'POST', headers }
      );

      if (!resp.ok) break; // Stop on first failure; remaining items stay in queue

      // Delete only this successfully-sent item in its own atomic transaction
      const delTx = db.transaction('sos-queue', 'readwrite');
      await idbRequest(delTx.objectStore('sos-queue').delete(key));

      await notifyClients({ type: 'SOS_QUEUE_FLUSHED', success: true });
    }
  } catch (error) {
    await notifyClients({
      type: 'SOS_QUEUE_FLUSHED',
      success: false,
      error: error instanceof Error ? error.message : 'SOS queue replay failed',
    });
  } finally {
    db?.close?.();
  }
}

async function flushSafeVixRoadReportQueue() {
  let db;
  try {
    db = await openSafeVixDb();

    const readTx = db.transaction('road-report-queue', 'readonly');
    const readStore = readTx.objectStore('road-report-queue');
    const [items, keys] = await Promise.all([
      idbRequest(readStore.getAll()),
      idbRequest(readStore.getAllKeys()),
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

      // Delete only this successfully-sent item atomically
      const delTx = db.transaction('road-report-queue', 'readwrite');
      await idbRequest(delTx.objectStore('road-report-queue').delete(key));

      await notifyClients({ type: 'ROAD_REPORT_QUEUE_FLUSHED', success: true });
    }
  } catch (error) {
    await notifyClients({
      type: 'ROAD_REPORT_QUEUE_FLUSHED',
      success: false,
      error: error instanceof Error ? error.message : 'Road report queue replay failed',
    });
  } finally {
    db?.close?.();
  }
}

// P1-15: Push Notification handler stub (audit H13)
// Displays a native OS notification and routes clicks to the correct page.
self.addEventListener('push', (event) => {
  let data = { title: 'SafeVixAI', body: 'You have a new safety alert.', url: '/sos' };
  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: data.tag || 'safevixai-alert',
    renotify: true,
    data: { url: data.url || '/' },
    actions: [
      { action: 'open', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});

function openSafeVixDb() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in self)) {
      reject(new Error('IndexedDB is unavailable in this browser context'));
      return;
    }
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

async function notifyClients(message) {
  const clients = await self.clients.matchAll();
  clients.forEach((client) => client.postMessage(message));
}

function idbRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
