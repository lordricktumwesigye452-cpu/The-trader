self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : { title: "Trade Signal", body: "New market alert!" };

  const options = {
    body: data.body,
    icon: "https://cdn-icons-png.flaticon.com/512/2534/2534204.png",
    vibrate: [200, 100, 200],
    data: { url: data.url || "/" },
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});
