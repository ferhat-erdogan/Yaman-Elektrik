// Yaman Elektrik service worker
// - Sayfa, JSON ve scriptler: önce ağ (fiyatlar hep güncel), internet yoksa önbellek
// - Ürün resimleri (img/): önbellekten hemen göster, arkada güncelle
// - api.php ve POST istekleri: karışmaz
const V = 'yaman-v1', IMG = 'yaman-img-v1', MAX_IMG = 400;
const SCOPE = self.registration.scope;
const SHELL = ['./', 'index.html', 'crypto-fallback.js', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'products.json', 'costs.json']
  .map(u => new URL(u, SCOPE).href);

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(V);
    await Promise.all(SHELL.map(async u => {
      try { const r = await fetch(u, {cache: 'reload'}); if (r.ok) await c.put(u, r); } catch (_) {}
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== V && k !== IMG) await caches.delete(k);
    await self.clients.claim();
  })());
});

const keyOf = u => { const x = new URL(u); x.search = ''; x.hash = ''; return x.href; };

async function networkFirst(req) {
  const c = await caches.open(V);
  try {
    const res = await fetch(req);
    if (res.ok && res.status === 200) c.put(keyOf(req.url), res.clone());
    return res;
  } catch (_) {
    const hit = await c.match(keyOf(req.url));
    if (hit) return hit;
    if (req.mode === 'navigate') {
      const page = await c.match(new URL('index.html', SCOPE).href) || await c.match(new URL('./', SCOPE).href);
      if (page) return page;
    }
    return Response.error();
  }
}

async function imageSWR(e) {
  const c = await caches.open(IMG);
  const hit = await c.match(e.request);
  const net = fetch(e.request).then(async res => {
    if (res.ok && res.status === 200) {
      await c.put(e.request, res.clone());
      const ks = await c.keys();
      if (ks.length > MAX_IMG) for (const k of ks.slice(0, ks.length - MAX_IMG)) await c.delete(k);
    }
    return res;
  }).catch(() => null);
  e.waitUntil(net);
  return hit || (await net) || Response.error();
}

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin !== location.origin || u.pathname.endsWith('/api.php')) return;
  if (u.pathname.includes('/img/')) { e.respondWith(imageSWR(e)); return; }
  e.respondWith(networkFirst(r));
});

