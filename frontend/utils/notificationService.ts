import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function requestNotificationPermissions() {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return false;
  }

  return true;
}

export async function scheduleBookingNotification(
  bookingId: string,
  serviceName: string,
  bookingDate: string,
  bookingTime: string
) {
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return null;

  // Parse booking date and time
  const [year, month, day] = bookingDate.split('-').map(Number);
  const [hours, minutes] = bookingTime.split(':').map(Number);
  
  const bookingDateTime = new Date(year, month - 1, day, hours, minutes);
  const reminderTime = new Date(bookingDateTime.getTime() - 60 * 60 * 1000); // 1 hour before
  const now = new Date();

  // Only schedule if reminder time is in the future
  if (reminderTime > now) {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Randevu Hatırlatması! 🔔',
        body: `${serviceName} randevunuz 1 saat sonra başlayacak.`,
        data: { bookingId, type: 'reminder' },
        sound: true,
      },
      trigger: reminderTime,
    });
    return notificationId;
  }
  
  return null;
}

export async function sendImmediateNotification(
  title: string,
  body: string,
  data?: any
) {
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return null;

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true,
    },
    trigger: null, // Send immediately
  });
}

export async function cancelNotification(notificationId: string) {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
