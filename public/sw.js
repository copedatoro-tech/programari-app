self.addEventListener('install', (e) => {
  console.log('Chronos Service Worker Installed');
});

self.addEventListener('fetch', (e) => {
  // Lasă cererile să treacă normal
});