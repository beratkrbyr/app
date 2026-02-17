import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="dashboard" options={{ title: 'Admin Dashboard' }} />
      <Stack.Screen name="bookings" options={{ title: 'Randevu Yönetimi' }} />
      <Stack.Screen name="services" options={{ title: 'Hizmet Yönetimi' }} />
      <Stack.Screen name="calendar" options={{ title: 'Takvim Yönetimi' }} />
      <Stack.Screen name="settings" options={{ title: 'Ayarlar' }} />
    </Stack>
  );
}
