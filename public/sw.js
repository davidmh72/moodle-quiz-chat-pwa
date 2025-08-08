// Service Worker for Moodle Quiz Chat PWA
const CACHE_NAME = 'moodle-quiz-chat-v1';
const OFFLINE_PAGE = '/offline.html';

// Files to cache for offline functionality
const CORE_CACHE = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  OFFLINE_PAGE
];

// Install event - cache core files
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching core files');
        return cache.addAll(CORE_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Clearing old cache');
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version or fetch from network
        return response || fetch(event.request)
          .then(fetchResponse => {
            // Cache successful responses
            if (fetchResponse.status === 200) {
              const responseClone = fetchResponse.clone();
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseClone);
                });
            }
            return fetchResponse;
          })
          .catch(() => {
            // Return offline page for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match(OFFLINE_PAGE);
            }
          });
      })
  );
});

// Background sync for quiz submissions
self.addEventListener('sync', event => {
  if (event.tag === 'quiz-submission') {
    event.waitUntil(syncQuizSubmissions());
  }
});

// Sync pending quiz submissions when online
async function syncQuizSubmissions() {
  try {
    const submissions = await getStoredSubmissions();
    for (const submission of submissions) {
      await submitQuizToMoodle(submission);
      await removeStoredSubmission(submission.id);
    }
    console.log('Quiz submissions synced successfully');
  } catch (error) {
    console.error('Failed to sync quiz submissions:', error);
  }
}

// Helper functions for IndexedDB operations
async function getStoredSubmissions() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('MoodleQuizDB', 1);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['submissions'], 'readonly');
      const store = transaction.objectStore('submissions');
      const getAll = store.getAll();
      getAll.onsuccess = () => resolve(getAll.result);
      getAll.onerror = () => reject(getAll.error);
    };
    request.onerror = () => reject(request.error);
  });
}

async function removeStoredSubmission(id) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('MoodleQuizDB', 1);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['submissions'], 'readwrite');
      const store = transaction.objectStore('submissions');
      const deleteReq = store.delete(id);
      deleteReq.onsuccess = () => resolve();
      deleteReq.onerror = () => reject(deleteReq.error);
    };
    request.onerror = () => reject(request.error);
  });
}

async function submitQuizToMoodle(submission) {
  // Submit quiz data to Moodle API
  const response = await fetch('/api/moodle/submit-quiz', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${submission.token}`
    },
    body: JSON.stringify(submission.data)
  });
  
  if (!response.ok) {
    throw new Error(`Failed to submit quiz: ${response.status}`);
  }
  
  return response.json();
}