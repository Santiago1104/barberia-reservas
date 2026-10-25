// Service worker del panel: solo recibe notificaciones push y abre la agenda al tocarlas.
// No guarda nada en caché a propósito (la agenda siempre se pide al servidor).

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let datos = {};
  try {
    datos = event.data ? event.data.json() : {};
  } catch {
    datos = {};
  }

  const titulo = datos.titulo || 'Africa Latina';
  event.waitUntil(
    self.registration.showNotification(titulo, {
      body: datos.cuerpo || '',
      icon: '/icons/icon-192.png',
      data: { url: datos.url || '/admin' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/admin';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ventanas) => {
      // Si el panel ya está abierto, se usa esa ventana
      for (const ventana of ventanas) {
        if (new URL(ventana.url).pathname.startsWith('/admin') && 'focus' in ventana) {
          if ('navigate' in ventana) ventana.navigate(url);
          return ventana.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
