const CACHE_NAME = 'admvc-v2.6.0'
const OFFLINE_URL = '/offline.html'

// Cache static assets on install
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll([
                OFFLINE_URL,
                '/images/logo_admvc.png',
            ])
        })
    )
    self.skipWaiting()
})

// Clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            )
        })
    )
    self.clients.claim()
})

// Network-first strategy with offline fallback
self.addEventListener('fetch', (event) => {
    // Only handle navigation requests
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request).catch(() => {
                return caches.match(OFFLINE_URL)
            })
        )
    }
})

// ── PUSH NOTIFICATIONS ─────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
    if (!event.data) return

    const data = event.data.json()
    const title = data.title || 'ADMVC'
    const options = {
        body: data.body || '',
        icon: '/images/icon-192x192.png',
        badge: '/images/favicon-48x48.png',
        vibrate: [200, 100, 200],
        tag: data.tag || 'admvc-notification',
        renotify: true,
        data: { url: data.url || '/membros/dashboard' },
    }

    event.waitUntil(self.registration.showNotification(title, options))
})

// Clique na notificacao → abrir a URL
self.addEventListener('notificationclick', (event) => {
    event.notification.close()
    const url = event.notification.data?.url || '/membros/dashboard'
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // Se ja tem uma janela aberta, focar nela
            for (const client of windowClients) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.navigate(url)
                    return client.focus()
                }
            }
            // Senao, abrir nova janela
            return clients.openWindow(url)
        })
    )
})
