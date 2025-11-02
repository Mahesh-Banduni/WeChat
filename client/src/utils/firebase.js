import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
import api from '@/lib/api';
import { successToast } from "../components/ui/toast";

const firebaseConfig = {
  apiKey: "AIzaSyBUq9To17YDqOtBKDl5uE8Qm_omikFyb-M",
  authDomain: "hrms-45491.firebaseapp.com",
  projectId: "hrms-45491",
  storageBucket: "hrms-45491.appspot.com",
  messagingSenderId: "1043908578710",
  appId: "1:1043908578710:web:a5a8c4fbdc8b8471c1e1b7",
  measurementId: "G-3B2BCZTW3Q"
};

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// Only declare messaging if supported
let messaging = null;

export const requestFCMPermission = async () => {
  const supported = await isSupported();
  if (!supported) {
    console.warn("🚫 Firebase messaging is not supported in this browser.");
    return;
  }

  messaging = getMessaging(app); // ✅ Moved inside isSupported block

  if (Notification.permission === "granted") {
    try {
      const token = await getToken(messaging, {
        vapidKey: "BLfs3aFkbF5UOv8zM60vMdRUtIau8zOWsTK981baWgWXK_FWkBIpo_oSKMboqkKBoorNtDc0ewAbOSXJDuUThRE"
      });

      console.log("✅ FCM Token:", token);

      const storeToken = await api.post('notification/store', { token });
      console.log("FCM token sent successfully", storeToken);
    } catch (err) {
      console.error("❌ Error getting FCM token:", err);
    }

  } else if (Notification.permission === "default") {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      try {
        const token = await getToken(messaging, {
          vapidKey: "BLfs3aFkbF5UOv8zM60vMdRUtIau8zOWsTK981baWgWXK_FWkBIpo_oSKMboqkKBoorNtDc0ewAbOSXJDuUThRE"
        });
        console.log("✅ FCM Token after permission:", token);
        // send token to backend
      } catch (err) {
        console.error("❌ Error getting token:", err);
      }
    } else {
      console.warn("🔕 Notifications not granted.");
    }
  } else {
    alert("Notifications are blocked. Please enable them in browser settings.");
  }
};

export const initForegroundNotificationListener = async (onReceiveCallback) => {
  const supported = await isSupported();
  if (!supported) return;

  if (!messaging) {
    messaging = getMessaging(app);
  }

  onMessage(messaging, (payload) => {
    console.log("📩 Foreground FCM payload:", payload);

    const { title, body } = payload.notification || {};
    const data = payload.data || {};

    // Optional: show toast (can remove this if you want to only use component)
    //successToast(`${title || "Notification"}: ${body || data.message}`);

    // 🔁 Call your app-level callback
    if (onReceiveCallback) {
      onReceiveCallback({ data });
    }
  });
};

// Export what you need
export { messaging, getToken, onMessage };
