const CACHE="karbar-ai-v1";
const SHELL=["/","/index.html","/style.css","/app.js","/manifest.json","/assets/icon-192.png","/assets/icon-512.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)));self.skipWaiting();});
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))).then(()=>self.clients.claim()));
self.addEventListener("fetch",e=>{const r=e.request,u=new URL(r.url);if(r.method!=="GET"||u.origin!==self.location.origin||u.pathname.startsWith("/api/"))return;e.respondWith(fetch(r).then(res=>{if(res.ok)caches.open(CACHE).then(c=>c.put(r,res.clone()));return res;}).catch(async()=>await caches.match(r)||await caches.match("/index.html")));});
