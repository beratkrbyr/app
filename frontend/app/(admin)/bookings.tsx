import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_URL } from '../../config';

interface Booking {
  id: string;
  service_name: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  booking_date: string;
  booking_time: string;
  total_price: number;
  status: string;
}

export default function BookingsScreen() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const token = await AsyncStorage.getItem('admin_token');
      if (!token) {
        router.replace('/admin-login');
        return;
      }

      const response = await fetch(`${BACKEND_URL}/api/admin/bookings`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setBookings(data);
      } else if (response.status === 401) {
        await AsyncStorage.removeItem('admin_token');
        router.replace('/admin-login');
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const updateStatus = async (bookingId: string, newStatus: string) => {
    try {
      const token = await AsyncStorage.getItem('admin_token');
      const response = await fetch(
        `${BACKEND_URL}/api/admin/bookings/${bookingId}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (response.ok) {
        setExpandedId(null);
        fetchBookings();
      }
    } catch (error) {
      console.error('Error updating booking:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings();
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
        return 'İptal';
      default:
        return status;
    }
  };

  const renderBooking = ({ item }: { item: Booking }) => {
    const isExpanded = expandedId === item.id;

    return (
      <View style={styles.bookingCard}>
        <TouchableOpacity
          onPress={() => setExpandedId(isExpanded ? null : item.id)}
        >
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

          <View style={styles.customerInfo}>
            <Ionicons name="person" size={16} color="#6b7280" />
            <Text style={styles.customerText}>{item.customer_name}</Text>
          </View>

          <View style={styles.customerInfo}>
            <Ionicons name="call" size={16} color="#6b7280" />
            <Text style={styles.customerText}>{item.customer_phone}</Text>
          </View>

          <View style={styles.customerInfo}>
            <Ionicons name="location" size={16} color="#6b7280" />
            <Text style={styles.customerText} numberOfLines={1}>
              {item.customer_address}
            </Text>
          </View>

          <View style={styles.bookingFooter}>
            <View style={styles.dateTimeContainer}>
              <Ionicons name="calendar" size={16} color="#2563eb" />
              <Text style={styles.dateTimeText}>
                {new Date(item.booking_date).toLocaleDateString('tr-TR')}
              </Text>
              <Ionicons name="time" size={16} color="#2563eb" />
              <Text style={styles.dateTimeText}>{item.booking_time}</Text>
            </View>
            <Text style={styles.price}>₺{item.total_price.toFixed(2)}</Text>
          </View>

          <View style={styles.tapHint}>
            <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color="#2563eb" />
            <Text style={styles.tapHintText}>
              {isExpanded ? 'Kapat' : 'Durumu Değiştir'}
            </Text>
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.statusButtons}>
            <TouchableOpacity
              style={[styles.statusButton, styles.detailButton]}
              onPress={() => router.push(`/(admin)/booking-detail?bookingId=${item.id}`)}
            >
              <Ionicons name="eye" size={20} color="#ffffff" />
              <Text style={styles.statusButtonText}>Detay & Fotoğraf</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.statusButton, styles.confirmButton]}
              onPress={() => updateStatus(item.id, 'confirmed')}
            >
              <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
              <Text style={styles.statusButtonText}>Onayla</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.statusButton, styles.completeButton]}
              onPress={() => updateStatus(item.id, 'completed')}
            >
              <Ionicons name="checkmark-done-circle" size={20} color="#ffffff" />
              <Text style={styles.statusButtonText}>Tamamlandı</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.statusButton, styles.cancelButton]}
              onPress={() => updateStatus(item.id, 'cancelled')}
            >
              <Ionicons name="close-circle" size={20} color="#ffffff" />
              <Text style={styles.statusButtonText}>İptal</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={bookings}
        renderItem={renderBooking}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={60} color="#9ca3af" />
            <Text style={styles.emptyText}>Henüz randevu bulunmamaktadır</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
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
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  customerText: {
    fontSize: 14,
    color: '#6b7280',
    flex: 1,
  },
  bookingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  dateTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateTimeText: {
    fontSize: 13,
    color: '#2563eb',
    fontWeight: '500',
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10b981',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 16,
  },
  tapHint: {
    marginTop: 12,
    padding: 10,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  tapHintText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '600',
  },
  statusButtons: {
    marginTop: 12,
    gap: 8,
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 10,
    gap: 8,
  },
  detailButton: {
    backgroundColor: '#2563eb',
  },
  confirmButton: {
    backgroundColor: '#10b981',
  },
  completeButton: {
    backgroundColor: '#6b7280',
  },
  cancelButton: {
    backgroundColor: '#ef4444',
  },
  statusButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
