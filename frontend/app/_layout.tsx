import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '../contexts/ThemeContext';
import { CustomerProvider } from '../contexts/CustomerContext';

export default function RootLayout() {
  return (
    <ThemeProvider>
      <CustomerProvider>
        <SafeAreaProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="service-detail" options={{ headerShown: true, title: 'Hizmet Detayı' }} />
            <Stack.Screen name="booking" options={{ headerShown: true, title: 'Randevu Oluştur' }} />
            <Stack.Screen name="booking-success" options={{ headerShown: false }} />
            <Stack.Screen name="customer-login" options={{ headerShown: false }} />
            <Stack.Screen name="admin-login" options={{ headerShown: true, title: 'Yönetici Girişi' }} />
            <Stack.Screen name="user-settings" options={{ headerShown: true, title: 'Ayarlar' }} />
          </Stack>
        </SafeAreaProvider>
      </CustomerProvider>
    </ThemeProvider>
  );
}
