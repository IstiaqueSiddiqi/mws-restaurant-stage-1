const staticCacheName = 'restaurant-v1.0';

// Network Call
// self.addEventListener('fetch', (event) => {
//     console.log(event.request);
//     event.respondWith(
//         fetch(event.request).then(response => {
//             if (response.status === 404) {
//                 return new Response(`Please check your service worker script path and scope path.`);
//             }
//             return response;
//         }).catch(err => {
//             return new Response(`Failed due to ${err}`);
//         })
//     );
// }); 

// service worker install event
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(staticCacheName).then((cache) => {
            return cache.addAll([
                '/',
                'css/styles.css',
                'https://unpkg.com/leaflet@1.3.1/dist/leaflet.css',
                'data/restaurants.json',
                'img/',
                'js/dbhelper.js',
                'js/main.js',
                'js/restaurant_info.js',
                'https://unpkg.com/leaflet@1.3.1/dist/leaflet.js',
            ]);
        }).catch(() => {
            console.error(`Error while caching assets.`);
        })
    );
});


self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});


self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.filter((cacheName) => {
                    return cacheName.startsWith('restaurant-v') &&
                        cacheName != staticCacheName;
                }).map((cacheName) => {
                    return caches.delete(cacheName);
                })
            );
        })
    );
});

self.addEventListener('message', (event) => {
    if (event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
});