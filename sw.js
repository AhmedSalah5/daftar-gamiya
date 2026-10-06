const CACHE = "daftar-gamiya-v3";   // ارفع الرقم عند كل تحديث

// ملفات أساسية: إن فشل أحدها يفشل التثبيت (فنعرف بالخطأ بدل أن يعمل بشكل ناقص)
const CORE = ["./", "./index.html", "./style.css", "./app.js", "./manifest.webmanifest"];
// ملفات ثانوية: لا يتوقف التثبيت إن تعذّر أحدها
const EXTRA = ["./icons/icon-192.png", "./icons/icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(async cache => {
      await cache.addAll(CORE.map(u => new Request(u, { cache: "reload" })));
      await Promise.all(
        EXTRA.map(u => cache.add(u).catch(err => console.warn("SW: لم يُخزَّن", u, err)))
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req, { ignoreSearch: true });

    const network = fetch(req)
      .then(res => {
        if (res.status === 200) cache.put(req, res.clone());
        return res;
      })
      .catch(() => null);

    if (hit) {
      e.waitUntil(network);      // يحدّث النسخة في الخلفية
      return hit;
    }

    const res = await network;
    if (res) return res;

    // لا إنترنت ولا نسخة محفوظة: نرجع الصفحة الرئيسية للتنقل
    if (req.mode === "navigate") {
      return (await cache.match("./index.html")) || (await cache.match("./"));
    }
    return Response.error();
  })());
});