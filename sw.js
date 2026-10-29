// Son Fener service worker: kod ağdan önce (no-cache ile ETag doğrulaması), görseller/fontlar önbellekten.
const VER='sf-b36-1-guide-w3',CORE=['./','index.html','game.js','logic.js','i18n.js','online.js','./guide.js','./world.js','lib/three.module.js','lib/supabase.js','manifest.webmanifest','img/icon-192.png','img/title.webp','img/cap_yusuf.webp'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(VER).then(c=>c.addAll(CORE.map(u=>new Request(u,{cache:'reload'})))).catch(()=>{}));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VER).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const r=e.request,u=new URL(r.url);if(r.method!=='GET'||u.origin!==location.origin)return;
 const img=/\.(webp|png|jpg|svg|woff2?|ttf|mp3|ogg)$/i.test(u.pathname);
 if(img){e.respondWith(caches.match(r).then(h=>h||fetch(r).then(n=>{if(n.ok){const c=n.clone();caches.open(VER).then(x=>x.put(r,c))}return n})));return}
 e.respondWith(fetch(r,{cache:'no-cache'}).then(n=>{if(n.ok){const c=n.clone();caches.open(VER).then(x=>x.put(r,c))}return n}).catch(()=>caches.match(r,{ignoreSearch:true}).then(h=>h||(r.mode==='navigate'?caches.match('index.html'):Response.error()))))});
self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(cs=>{for(const c of cs)if('focus' in c)return c.focus();return self.clients.openWindow('./')}))});
