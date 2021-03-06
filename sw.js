const staticCacheName = 'restaurant-v1.0';
let cacheAssets = [
    // '/',
    'manifest.json',
    'index.html',
    'css/styles.css',
    'css/snackbar.css',
    'https://unpkg.com/leaflet@1.3.1/dist/leaflet.css',
    'data/restaurants.json',
    'js/main.js',
    'js/dbhelper.js',
    'js/snackbar.js',
    'https://unpkg.com/leaflet@1.3.1/dist/leaflet.js',
    'restaurant.html',
    'img/1.webp',
    'img/2.webp',
    'img/3.webp',
    'img/4.webp',
    'img/5.webp',
    'img/6.webp',
    'img/7.webp',
    'img/8.webp',
    'img/9.webp',
    'img/10.webp',
    'img/1.jpg',
    'img/2.jpg',
    'img/3.jpg',
    'img/4.jpg',
    'img/5.jpg',
    'img/6.jpg',
    'img/7.jpg',
    'img/8.jpg',
    'img/9.jpg',
    'img/10.jpg',
    'js/restaurant_info.js',
    'js/idb.js',
    'img/restaurant.png',
    'img/restaurant.svg',
];

// service worker install event
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(staticCacheName).then((cache) => {
            cache.addAll(cacheAssets);
            return cache.addAll(cacheAssets);
        }).catch(() => {
            console.error(`Error while caching assets.`);
        })
    );
});

/**
 * Network Call
 **/
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.open(staticCacheName).then((cache) => {
            // Uses network first and then cache approach
            return cache.match(event.request).then((response) => {
                var promise = fetch(event.request).then((networkResponse) => {
                    if (networkResponse.status === 404) {
                        return new Response(`Please check your service worker script path and scope path.`);
                    }
                    cache.put(event.request, networkResponse.clone());
                    return networkResponse;
                })
                return response || promise;

                // Uses cache first approach
                // return response || fetch(event.request).then((response) => {
                //     if (response.status === 404) {
                //         return new Response(`Please check your service worker script path and scope path.`);
                //     }
                //     cache.put(event.request, response.clone());
                //     return response;
                // }).catch(err => {
                //     return new Response(`Failed due to ${err}`);
                // });
            });
        }).catch(error => {
            console.error('Error:', error.stack);
            return;
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

// listen for background sync
self.addEventListener('sync', (event) => {
    // Should be unique for a given sync
    if (event.tag == 'myFirstSync') {
        console.info(`Back Online`);
        // event.waitUntil(promiseMethod());
    }
});