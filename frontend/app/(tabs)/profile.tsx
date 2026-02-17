import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ScrollView,
  Alert,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCustomer } from '../../contexts/CustomerContext';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Booking {
  id: string;
  service_name: string;
  booking_date: string;
  booking_time: string;
  total_price: number;
  discount_applied: number;
  status: string;
  customer_address: string;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { customer, isAuthenticated, logout } = useCustomer();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated && customer) {
      fetchBookings();
    }
  }, [isAuthenticated, customer]);

  const fetchBookings = async () => {
    if (!customer?.phone) return;
    
    setLoadingBookings(true);
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/bookings/check?phone=${encodeURIComponent(customer.phone)}`
      );
      const data = await response.json();
      setBookings(data);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoadingBookings(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings();
  };

  const showAlert = (title: string, message: string, onOk?: () => void) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
      if (onOk) onOk();
    } else {
      Alert.alert(title, message, [{ text: 'Tamam', onPress: onOk }]);
    }
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    if (Platform.OS === 'web') {
      if (window.confirm(`${title}\n\n${message}`)) {
        onConfirm();
      }
    } else {
      Alert.alert(
        title,
        message,
        [
          { text: 'Hayır', style: 'cancel' },
          { text: 'Evet', style: 'destructive', onPress: onConfirm },
        ]
      );
    }
  };

  const handleCancelBooking = (bookingId: string) => {
    showConfirm(
      'Randevu İptali',
      'Bu randevuyu iptal etmek istediğinizden emin misiniz?',
      () => cancelBooking(bookingId)
    );
  };

  const cancelBooking = async (bookingId: string) => {
    if (!customer?.phone) return;
    
    setCancellingId(bookingId);
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/bookings/${bookingId}/cancel?phone=${encodeURIComponent(customer.phone)}`,
        { method: 'PUT' }
      );
      
      if (response.ok) {
        showAlert('Başarılı', 'Randevunuz iptal edildi.');
        fetchBookings();
      } else {
        const error = await response.json();
        showAlert('Hata', error.detail || 'Randevu iptal edilemedi.');
      }
    } catch (error) {
      console.error('Error cancelling booking:', error);
      showAlert('Hata', 'Bir hata oluştu.');
    } finally {
      setCancellingId(null);
    }
  };

  const handleLogout = () => {
    showConfirm(
      'Çıkış Yap',
      'Çıkış yapmak istediğinizden emin misiniz?',
      performLogout
    );
  };

  const performLogout = async () => {
    try {
      await logout();
      router.replace('/customer-login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return '#10b981';
      case 'completed':
        return '#6b7280';
      case 'cancelled':
        return '#ef4444';
      default:
        return '#f59e0b';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Bekliyor';
      case 'confirmed':
        return 'Onaylandı';
      case 'completed':
        return 'Tamamlandı';
      case 'cancelled':
        return 'İptal Edildi';
      default:
        return status;
    }
  };

  const canCancel = (status: string) => {
    return status === 'pending' || status === 'confirmed';
  };

  const renderBooking = ({ item }: { item: Booking }) => (
    <View style={styles.bookingCard}>
      <View style={styles.bookingHeader}>
        <Text style={styles.serviceName}>{item.service_name}</Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) },
          ]}
        >
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </View>

      <View style={styles.bookingDetail}>
        <Ionicons name="calendar-outline" size={16} color="#6b7280" />
        <Text style={styles.detailText}>
          {new Date(item.booking_date).toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </Text>
      </View>

      <View style={styles.bookingDetail}>
        <Ionicons name="time-outline" size={16} color="#6b7280" />
        <Text style={styles.detailText}>{item.booking_time}</Text>
      </View>

      <View style={styles.bookingDetail}>
        <Ionicons name="location-outline" size={16} color="#6b7280" />
        <Text style={styles.detailText} numberOfLines={1}>
          {item.customer_address}
        </Text>
      </View>

      <View style={styles.priceRow}>
        <Text style={styles.priceLabel}>Toplam Ücret:</Text>
        <View>
          {item.discount_applied > 0 && (
            <Text style={styles.discountText}>
              ₺{item.discount_applied.toFixed(2)} indirim
            </Text>
          )}
          <Text style={styles.priceText}>₺{item.total_price.toFixed(2)}</Text>
        </View>
      </View>

      {canCancel(item.status) && (
        <Pressable
          style={({ pressed }) => [
            styles.cancelButton,
            pressed && { opacity: 0.7 }
          ]}
          onPress={() => handleCancelBooking(item.id)}
          disabled={cancellingId === item.id}
          accessibilityRole="button"
        >
          {cancellingId === item.id ? (
            <ActivityIndicator size="small" color="#ef4444" />
          ) : (
            <>
              <Ionicons name="close-circle-outline" size={20} color="#ef4444" />
              <Text style={styles.cancelButtonText}>Randevuyu İptal Et</Text>
            </>
          )}
        </Pressable>
      )}
    </View>
  );

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profil</Text>
        </View>

        <View style={styles.notAuthContainer}>
          <Ionicons name="person-circle-outline" size={80} color="#9ca3af" />
          <Text style={styles.notAuthTitle}>Giriş Yapmanız Gerekiyor</Text>
          <Text style={styles.notAuthText}>
            Profilinizi görmek ve randevularınızı takip etmek için giriş yapın
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.loginButton,
              pressed && { opacity: 0.8 }
            ]}
            onPress={() => router.push('/customer-login')}
            accessibilityRole="button"
          >
            <Ionicons name="log-in-outline" size={24} color="#ffffff" />
            <Text style={styles.loginButtonText}>Giriş Yap</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profil</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={48} color="#ffffff" />
          </View>
          <Text style={styles.profileName}>{customer?.name}</Text>
          <Text style={styles.profilePhone}>{customer?.phone}</Text>
          {customer?.email && (
            <Text style={styles.profileEmail}>{customer.email}</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Randevularım</Text>
          {loadingBookings ? (
            <ActivityIndicator color="#2563eb" style={{ marginVertical: 20 }} />
          ) : bookings.length > 0 ? (
            <FlatList
              data={bookings}
              renderItem={renderBooking}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          ) : (
            <View style={styles.emptyBookings}>
              <Ionicons name="calendar-outline" size={48} color="#9ca3af" />
              <Text style={styles.emptyText}>Henüz randevunuz yok</Text>
            </View>
          )}
        </View>

        <View style={styles.menuSection}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/user-settings')}
          >
            <Ionicons name="color-palette-outline" size={24} color="#2563eb" />
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemTitle}>Tema Ayarları</Text>
              <Text style={styles.menuItemDescription}>
                Açık/Koyu tema seçimi
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        <Pressable 
          style={({ pressed }) => [
            styles.logoutButton,
            pressed && { opacity: 0.8 }
          ]} 
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={24} color="#ef4444" />
          <Text style={styles.logoutButtonText}>Çıkış Yap</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: '#2563eb',
    padding: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  notAuthContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  notAuthTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 24,
    marginBottom: 12,
  },
  notAuthText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  loginButton: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    width: '100%',
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
  },
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  profilePhone: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#9ca3af',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  bookingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  bookingDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#6b7280',
    flex: 1,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  priceLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  priceText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2563eb',
    textAlign: 'right',
  },
  discountText: {
    fontSize: 12,
    color: '#10b981',
    textAlign: 'right',
    marginBottom: 2,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 8,
  },
  cancelButtonText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyBookings: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#ffffff',
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 12,
  },
  menuSection: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  menuItemDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  logoutButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
});
