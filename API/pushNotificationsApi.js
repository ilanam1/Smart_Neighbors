import { PermissionsAndroid, Platform } from 'react-native';
import { getSupabase } from '../DataBase/supabase';

// Safely require Firebase Messaging to avoid crashes on environments
// where the native Firebase module (RNFBAppModule) is not installed or linked.
let messaging = null;
try {
  const fbMessaging = require('@react-native-firebase/messaging');
  messaging = fbMessaging.default || fbMessaging;
} catch (error) {
  console.warn('Firebase Messaging module is not available in JS environment:', error);
}

// Safely require Notifee to avoid crashes on environments
// where the native Notifee module is not installed or linked.
let notifee = null;
let AndroidImportance = { HIGH: 4 }; // fallback
try {
  const fbNotifee = require('@notifee/react-native');
  notifee = fbNotifee.default || fbNotifee;
  if (fbNotifee.AndroidImportance) {
    AndroidImportance = fbNotifee.AndroidImportance;
  }
} catch (error) {
  console.warn('Notifee module is not available in JS environment:', error);
}

/**
 * Helper to check if Firebase messaging and its native module are fully functional.
 */
function isMessagingAvailable() {
  if (!messaging) return false;
  try {
    // Calling messaging() will attempt to reference the native module.
    // If it's not linked, it throws "Native module RNFBAppModule not found".
    messaging();
    return true;
  } catch (error) {
    console.warn('Firebase Messaging is imported but native module is not functional:', error);
    return false;
  }
}

/**
 * Helper to check if Notifee and its native module are fully functional.
 */
function isNotifeeAvailable() {
  return !!notifee;
}

/**
 * בקשת הרשאה להתראות באנדרואיד
 */
export async function requestPushNotificationPermission() {
  try {
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );

      return result === PermissionsAndroid.RESULTS.GRANTED;
    }

    if (!isMessagingAvailable()) {
      console.warn('Push notification permission request bypassed: Firebase Messaging not available');
      return false;
    }

    const authStatus = await messaging().requestPermission();

    return (
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL
    );
  } catch (error) {
    console.error('Error requesting push permission:', error);
    return false;
  }
}

/**
 * קבלת FCM Token מהמכשיר
 */
export async function getFcmToken() {
  try {
    const hasPermission = await requestPushNotificationPermission();

    if (!hasPermission) {
      console.log('Push permission was not granted');
      return null;
    }

    if (!isMessagingAvailable()) {
      console.warn('Cannot retrieve FCM Token: Firebase Messaging not available');
      return null;
    }

    const token = await messaging().getToken();

    console.log('FCM TOKEN:', token);

    return token;
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
}

/**
 * שמירת ה-Token בטבלת push_tokens ב-Supabase
 */
export async function saveFcmTokenToSupabase(userId, role = 'user') {
  try {
    if (!userId) {
      console.log('Missing userId, cannot save FCM token');
      return null;
    }

    const token = await getFcmToken();

    if (!token) {
      console.log('No FCM token received');
      return null;
    }

    const supabase = getSupabase();

    const { data, error } = await supabase.functions.invoke('save-push-token', {
      body: {
        user_id: userId,
        token,
        platform: Platform.OS,
        role,
      },
    });

    if (error) {
      console.error('Error saving FCM token through Edge Function:', error.message);
      throw error;
    }

    console.log('FCM token saved through Edge Function successfully:', data);

    return token;
  } catch (error) {
    console.error('saveFcmTokenToSupabase error:', error);
    return null;
  }
}


/**
 * יצירת ערוץ התראות עבור Android
 * באנדרואיד חייבים Channel כדי להציג התראות מקומיות
 */
export async function createAndroidNotificationChannel() {
  try {
    if (!isNotifeeAvailable()) {
      console.warn('Notifee is not available, skipping createAndroidNotificationChannel');
      return;
    }
    await notifee.createChannel({
      id: 'smart_neighbors_default',
      name: 'Smart Neighbors Notifications',
      importance: AndroidImportance.HIGH,
      sound: 'default',
    });

    console.log('Android notification channel created');
  } catch (error) {
    console.error('Error creating notification channel:', error);
  }
}

/**
 * הצגת התראה מקומית כאשר מתקבלת הודעת Push בזמן שהאפליקציה פתוחה
 */
export async function displayForegroundNotification(remoteMessage) {
  try {
    if (!isNotifeeAvailable()) {
      console.warn('Notifee is not available, skipping displayForegroundNotification');
      return;
    }
    await createAndroidNotificationChannel();

    const title =
      remoteMessage?.notification?.title ||
      remoteMessage?.data?.title ||
      'Smart Neighbors';

    const body =
      remoteMessage?.notification?.body ||
      remoteMessage?.data?.body ||
      remoteMessage?.data?.message ||
      '';

    await notifee.displayNotification({
      title,
      body,
      android: {
        channelId: 'smart_neighbors_default',
        smallIcon: 'ic_launcher',
        pressAction: {
          id: 'default',
        },
      },
      data: remoteMessage?.data || {},
    });

    console.log('Foreground notification displayed');
  } catch (error) {
    console.error('Error displaying foreground notification:', error);
  }
}

/**
 * מאזין להודעות Firebase כשהאפליקציה פתוחה
 */
export function listenToForegroundFirebaseMessages() {
  if (!isMessagingAvailable()) {
    console.warn('Not listening to foreground firebase messages: Firebase Messaging not available');
    return () => {}; // return a no-op unsubscribe function
  }
  try {
    return messaging().onMessage(async remoteMessage => {
      console.log('Firebase foreground message received:', remoteMessage);
      await displayForegroundNotification(remoteMessage);
    });
  } catch (error) {
    console.error('Error in listenToForegroundFirebaseMessages:', error);
    return () => {};
  }
}