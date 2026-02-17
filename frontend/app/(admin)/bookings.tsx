import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

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
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showModal, setShowModal] = useState(false);

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

  const updateStatus = async (newStatus: string) => {
    if (!selectedBooking) return;
    
    try {
      const token = await AsyncStorage.getItem('admin_token');
      const response = await fetch(
        `${BACKEND_URL}/api/admin/bookings/${selectedBooking.id}`,
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
        setShowModal(false);
        setSelectedBooking(null);
        fetchBookings();
      }
    } catch (error) {
      console.error('Error updating booking:', error);
    }
  };

  const openStatusModal = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowModal(true);
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

  const renderBooking = ({ item }: { item: Booking }) => (
    <TouchableOpacity
      style={styles.bookingCard}
      onPress={() => openStatusModal(item)}
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
        <Text style={styles.tapHintText}>Durumu değiştirmek için tıklayın</Text>
      </View>
    </TouchableOpacity>
  );

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

      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Randevu Durumu</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={28} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {selectedBooking && (
              <View style={styles.modalBody}>
                <Text style={styles.modalCustomer}>{selectedBooking.customer_name}</Text>
                <Text style={styles.modalService}>{selectedBooking.service_name}</Text>
                <Text style={styles.modalDate}>
                  {new Date(selectedBooking.booking_date).toLocaleDateString('tr-TR')} - {selectedBooking.booking_time}
                </Text>

                <View style={styles.statusButtons}>
                  <TouchableOpacity
                    style={[styles.statusButton, styles.confirmButton]}
                    onPress={() => updateStatus('confirmed')}
                  >
                    <Ionicons name="checkmark-circle" size={24} color="#ffffff" />
                    <Text style={styles.statusButtonText}>Onayla</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.statusButton, styles.completeButton]}
                    onPress={() => updateStatus('completed')}
                  >
                    <Ionicons name="checkmark-done-circle" size={24} color="#ffffff" />
                    <Text style={styles.statusButtonText}>Tamamlandı</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.statusButton, styles.cancelButton]}
                    onPress={() => updateStatus('cancelled')}
                  >
                    <Ionicons name="close-circle" size={24} color="#ffffff" />
                    <Text style={styles.statusButtonText}>İptal</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
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
    marginTop: 8,
    padding: 8,
    backgroundColor: '#eff6ff',
    borderRadius: 6,
    alignItems: 'center',
  },
  tapHintText: {
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  modalBody: {
    padding: 20,
  },
  modalCustomer: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  modalService: {
    fontSize: 18,
    color: '#6b7280',
    marginBottom: 4,
  },
  modalDate: {
    fontSize: 16,
    color: '#9ca3af',
    marginBottom: 24,
  },
  statusButtons: {
    gap: 12,
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
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
    fontSize: 18,
    fontWeight: '600',
  },
});
