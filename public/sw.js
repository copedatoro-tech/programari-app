self.addEventListener('install', () => {
  console.log('Chronos Service Worker Installed');
});

self.addEventListener('fetch', () => {
  // Lasă cererile să treacă normal
});