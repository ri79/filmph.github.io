// Cache ismi için versiyon numarası ekleyelim
const CACHE_NAME = 'bookmarks-cache-v1';

// Cache'lenecek dosyaların listesi
const urlsToCache = [
  '/',
  '/index.html',
  '/muzik',
  '/film',
  '/fotograf',
  '/kitap',
  '/link',
  '/favicon.ico',
  // Eğer varsa diğer statik dosyaları da ekleyin (resimler, CSS, JS dosyaları vb.)
];

// Service Worker kurulumu
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache opened');
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('Cache installation failed:', error);
      })
  );
});

// Cache'i aktif etme ve eski versiyonları temizleme
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Ağ isteklerini yönetme
self.addEventListener('fetch', event => {
  event.respondWith(
    // "Network First, Cache Fallback" stratejisi
    fetch(event.request)
      .then(response => {
        // Başarılı ağ yanıtını cache'e kaydet
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseClone);
            });
        }
        return response;
      })
      .catch(() => {
        // Ağ bağlantısı yoksa cache'den yanıt ver
        return caches.match(event.request)
          .then(response => {
            if (response) {
              return response;
            }
            
            // Eğer istek cache'de yoksa ve çevrimdışıysa özel bir hata sayfası göster
            if (event.request.mode === 'navigate') {
              return caches.match('/offline.html');
            }
            
            // Diğer kaynaklar için hata döndür
            return new Response('Çevrimdışı modda bu içeriğe erişilemiyor.', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain;charset=UTF-8'
              })
            });
          });
      })
  );
});

// Push bildirimlerini yönetme
self.addEventListener('push', event => {
  if (event.data) {
    const options = {
      body: event.data.text(),
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: 1
      }
    };

    event.waitUntil(
      self.registration.showNotification('Bookmarks Bildirimi', options)
    );
  }
});

// Bildirime tıklanma olayını yönetme
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow('/')
  );
});

// Periyodik senkronizasyon (opsiyonel)
self.addEventListener('periodicsync', event => {
  if (event.tag === 'update-content') {
    event.waitUntil(updateContent());
  }
});

// İçerik güncelleme fonksiyonu
async function updateContent() {
  try {
    // Burada içeriği güncellemek için gerekli işlemleri yapabilirsiniz
    const cache = await caches.open(CACHE_NAME);
    await cache.add('/'); // Ana sayfayı yeniden cache'le
  } catch (error) {
    console.error('Content update failed:', error);
  }
}

// Offline.html sayfası için basit bir içerik oluştur
const offlineContent = `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Çevrimdışı - Bookmarks</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            padding: 20px;
            text-align: center;
            background-color: #111111;
            color: #ffffff;
        }
        h1 { margin-bottom: 1rem; }
        p { margin-bottom: 2rem; }
        button {
            padding: 10px 20px;
            background-color: #3498db;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
        }
        button:hover {
            background-color: #2980b9;
        }
    </style>
</head>
<body>
    <h1>Çevrimdışısınız</h1>
    <p>İnternet bağlantınız olmadığı için bu içeriğe şu anda erişilemiyor.</p>
    <button onclick="window.location.reload()">Yeniden Dene</button>
</body>
</html>
`;

// Offline sayfasını cache'e ekle
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.put('/offline.html', new Response(offlineContent, {
        headers: {
          'Content-Type': 'text/html;charset=UTF-8'
        }
      }));
    })
  );
});
