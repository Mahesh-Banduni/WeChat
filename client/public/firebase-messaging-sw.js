// public/firebase-messaging-sw.js

importScripts("https://www.gstatic.com/firebasejs/9.6.10/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.6.10/firebase-messaging-compat.js");

// Initialize Firebase app in the service worker
firebase.initializeApp({
  apiKey: "AIzaSyBUq9To17YDqOtBKDl5uE8Qm_omikFyb-M",
  authDomain: "hrms-45491.firebaseapp.com",
  projectId: "hrms-45491",
  storageBucket: "hrms-45491.appspot.com",
  messagingSenderId: "1043908578710",
  appId: "1:1043908578710:web:a5a8c4fbdc8b8471c1e1b7"
});

// Retrieve messaging instance
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage(function (payload) {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);

  const { title, body } = payload.notification;

  const notificationOptions = {
    body,
  };

  self.registration.showNotification(title, notificationOptions);
});
