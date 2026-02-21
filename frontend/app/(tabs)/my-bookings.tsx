import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BACKEND_URL } from '../../config';

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

export default function MyBookingsScreen() {
  const [phone, setPhone] = useState('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const searchBookings = async () => {
    if (!phone.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/bookings/check?phone=${encodeURIComponent(phone)}`
      );
      const data = await response.json();
      setBookings(data);
      setSearched(true);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
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
        return 'İptal';
      default:
        return status;
    }
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
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Randevularım</Text>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.inputContainer}>
            <Ionicons name="call-outline" size={20} color="#6b7280" />
            <TextInput
              style={styles.input}
              placeholder="Telefon numaranızı girin"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholderTextColor="#9ca3af"
            />
          </View>
          <TouchableOpacity
            style={styles.searchButton}
            onPress={searchBookings}
            disabled={loading || !phone.trim()}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Ionicons name="search" size={24} color="#ffffff" />
            )}
          </TouchableOpacity>
        </View>

        {searched && bookings.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={60} color="#9ca3af" />
            <Text style={styles.emptyText}>
              Bu telefon numarasına ait randevu bulunamadı
            </Text>
          </View>
        )}

        <FlatList
          data={bookings}
          renderItem={renderBooking}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  keyboardView: {
    flex: 1,
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
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#111827',
  },
  searchButton: {
    width: 48,
    height: 48,
    backgroundColor: '#2563eb',
    borderRadius: 12,
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
    marginBottom: 16,
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
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 16,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
