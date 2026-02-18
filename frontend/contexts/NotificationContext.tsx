import React, { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

interface NotificationContextType {
  expoPushToken: string | null;
  hasPermission: boolean;
  requestPermission: () => Promise<boolean>;
  sendLocalNotification: (title: string, body: string, data?: any) => Promise<void>;
  scheduleReminder: (bookingId: string, serviceName: string, date: string, time: string) => Promise<string | null>;
  cancelReminder: (notificationId: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();

  useEffect(() => {
    // Check and request permissions on mount
    checkPermissions();

    // Listen for incoming notifications
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    // Listen for notification responses (when user taps notification)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
      // Handle navigation based on notification data
      const data = response.notification.request.content.data;
      if (data?.type === 'booking_confirmed' || data?.type === 'reminder') {
        // Could navigate to booking details here
      }
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  const checkPermissions = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    setHasPermission(status === 'granted');
    
    if (status === 'granted') {
      await getToken();
    }
  };

  const getToken = async () => {
    try {
      // For web, we don't need push tokens
      if (Platform.OS === 'web') {
        setExpoPushToken('web-notifications');
        return;
      }

      const token = await Notifications.getExpoPushTokenAsync({
        projectId: 'your-project-id', // Would need actual Expo project ID for push
      });
      setExpoPushToken(token.data);
    } catch (error) {
      console.log('Error getting push token:', error);
    }
  };

  const requestPermission = async (): Promise<boolean> => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      
      if (existingStatus === 'granted') {
        setHasPermission(true);
        await getToken();
        return true;
      }

      const { status } = await Notifications.requestPermissionsAsync();
      const granted = status === 'granted';
      setHasPermission(granted);
      
      if (granted) {
        await getToken();
      }
      
      return granted;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  };

  const sendLocalNotification = async (title: string, body: string, data?: any) => {
    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger: null, // Send immediately
    });
  };

  const scheduleReminder = async (
    bookingId: string,
    serviceName: string,
    date: string,
    time: string
  ): Promise<string | null> => {
    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) return null;
    }

    try {
      const [year, month, day] = date.split('-').map(Number);
      const [hours, minutes] = time.split(':').map(Number);
      
      const bookingDateTime = new Date(year, month - 1, day, hours, minutes);
      const reminderTime = new Date(bookingDateTime.getTime() - 60 * 60 * 1000); // 1 saat önce
      const now = new Date();

      if (reminderTime > now) {
        const notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Randevu Hatırlatması',
            body: `${serviceName} randevunuz 1 saat sonra başlayacak.`,
            data: { bookingId, type: 'reminder' },
            sound: true,
          },
          trigger: reminderTime,
        });
        return notificationId;
      }
      
      return null;
    } catch (error) {
      console.error('Error scheduling reminder:', error);
      return null;
    }
  };

  const cancelReminder = async (notificationId: string) => {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.error('Error canceling reminder:', error);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        expoPushToken,
        hasPermission,
        requestPermission,
        sendLocalNotification,
        scheduleReminder,
        cancelReminder,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
