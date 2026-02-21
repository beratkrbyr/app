import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  Platform,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

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
  customer_photos?: string[];
}

interface WorkPhoto {
  id: string;
  photo_type: string;
  photo_base64: string;
  created_at: string;
}

interface LocationData {
  latitude: number | null;
  longitude: number | null;
  status: string;
  updated_at?: string;
}

export default function BookingDetailScreen() {
  const router = useRouter();
  const { bookingId } = useLocalSearchParams();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [photos, setPhotos] = useState<WorkPhoto[]>([]);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [updatingLocation, setUpdatingLocation] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (bookingId) {
      fetchBookingDetails();
      fetchPhotos();
      fetchLocation();
    }
  }, [bookingId]);

  const fetchBookingDetails = async () => {
    try {
      const token = await AsyncStorage.getItem('admin_token');
      const response = await fetch(`${BACKEND_URL}/api/admin/bookings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const bookings = await response.json();
        const found = bookings.find((b: Booking) => b.id === bookingId);
        setBooking(found || null);
      }
    } catch (error) {
      console.error('Error fetching booking:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPhotos = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/work-photos/${bookingId}`);
      if (response.ok) {
        const data = await response.json();
        setPhotos(data);
      }
    } catch (error) {
      console.error('Error fetching photos:', error);
    }
  };

  const fetchLocation = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/location/${bookingId}`);
      if (response.ok) {
        const data = await response.json();
        setLocation(data);
      }
    } catch (error) {
      console.error('Error fetching location:', error);
    }
  };

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const pickImage = async (photoType: 'before' | 'after') => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showAlert('İzin Gerekli', 'Fotoğraf seçmek için galeri iznine ihtiyacımız var.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        await uploadPhoto(photoType, result.assets[0].base64);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      showAlert('Hata', 'Fotoğraf seçilemedi.');
    }
  };

  const uploadPhoto = async (photoType: string, base64: string) => {
    setUploading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/work-photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: bookingId,
          photo_type: photoType,
          photo_base64: base64,
        }),
      });

      if (response.ok) {
        showAlert('Başarılı', 'Fotoğraf yüklendi!');
        fetchPhotos();
      } else {
        showAlert('Hata', 'Fotoğraf yüklenemedi.');
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      showAlert('Hata', 'Bir hata oluştu.');
    } finally {
      setUploading(false);
    }
  };

  const updateLocationStatus = async (status: string) => {
    setUpdatingLocation(true);
    try {
      // Simüle edilmiş konum (gerçek uygulamada GPS'den alınır)
      const response = await fetch(`${BACKEND_URL}/api/location/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: bookingId,
          latitude: 41.0082 + Math.random() * 0.01,
          longitude: 28.9784 + Math.random() * 0.01,
          status: status,
        }),
      });

      if (response.ok) {
        showAlert('Başarılı', `Durum güncellendi: ${getLocationStatusText(status)}`);
        fetchLocation();
      }
    } catch (error) {
      console.error('Error updating location:', error);
      showAlert('Hata', 'Konum güncellenemedi.');
    } finally {
      setUpdatingLocation(false);
    }
  };

  const getLocationStatusText = (status: string) => {
    switch (status) {
      case 'on_the_way': return 'Yolda';
      case 'arrived': return 'Vardı';
      case 'in_progress': return 'Çalışıyor';
      case 'completed': return 'Tamamlandı';
      default: return 'Başlamadı';
    }
  };

  const getLocationStatusColor = (status: string) => {
    switch (status) {
      case 'on_the_way': return '#f59e0b';
      case 'arrived': return '#3b82f6';
      case 'in_progress': return '#8b5cf6';
      case 'completed': return '#10b981';
      default: return '#9ca3af';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return '#10b981';
      case 'completed': return '#6b7280';
      case 'cancelled': return '#ef4444';
      default: return '#f59e0b';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Bekliyor';
      case 'confirmed': return 'Onaylandı';
      case 'completed': return 'Tamamlandı';
      case 'cancelled': return 'İptal';
      default: return status;
    }
  };

  const beforePhotos = photos.filter(p => p.photo_type === 'before');
  const afterPhotos = photos.filter(p => p.photo_type === 'after');

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </SafeAreaView>
    );
  }

  if (!booking) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={60} color="#ef4444" />
          <Text style={styles.errorText}>Randevu bulunamadı</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Booking Info */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.serviceName}>{booking.service_name}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) }]}>
              <Text style={styles.statusText}>{getStatusText(booking.status)}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="person" size={18} color="#6b7280" />
            <Text style={styles.infoText}>{booking.customer_name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="call" size={18} color="#6b7280" />
            <Text style={styles.infoText}>{booking.customer_phone}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="location" size={18} color="#6b7280" />
            <Text style={styles.infoText}>{booking.customer_address}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="calendar" size={18} color="#6b7280" />
            <Text style={styles.infoText}>
              {new Date(booking.booking_date).toLocaleDateString('tr-TR')} - {booking.booking_time}
            </Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Toplam:</Text>
            <Text style={styles.priceValue}>₺{booking.total_price.toFixed(2)}</Text>
          </View>
        </View>

        {/* Location Tracking */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Konum Takibi</Text>
          
          {location && (
            <View style={styles.locationStatus}>
              <View style={[styles.locationBadge, { backgroundColor: getLocationStatusColor(location.status) }]}>
                <Ionicons name="navigate" size={18} color="#ffffff" />
                <Text style={styles.locationBadgeText}>{getLocationStatusText(location.status)}</Text>
              </View>
              {location.updated_at && (
                <Text style={styles.locationTime}>
                  Son güncelleme: {new Date(location.updated_at).toLocaleTimeString('tr-TR')}
                </Text>
              )}
            </View>
          )}

          <View style={styles.locationButtons}>
            <TouchableOpacity
              style={[styles.locationButton, { backgroundColor: '#f59e0b' }]}
              onPress={() => updateLocationStatus('on_the_way')}
              disabled={updatingLocation}
            >
              <Ionicons name="car" size={20} color="#ffffff" />
              <Text style={styles.locationButtonText}>Yola Çık</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.locationButton, { backgroundColor: '#3b82f6' }]}
              onPress={() => updateLocationStatus('arrived')}
              disabled={updatingLocation}
            >
              <Ionicons name="flag" size={20} color="#ffffff" />
              <Text style={styles.locationButtonText}>Vardım</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.locationButton, { backgroundColor: '#8b5cf6' }]}
              onPress={() => updateLocationStatus('in_progress')}
              disabled={updatingLocation}
            >
              <Ionicons name="construct" size={20} color="#ffffff" />
              <Text style={styles.locationButtonText}>Başladım</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.locationButton, { backgroundColor: '#10b981' }]}
              onPress={() => updateLocationStatus('completed')}
              disabled={updatingLocation}
            >
              <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
              <Text style={styles.locationButtonText}>Bitti</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Before Photos */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Öncesi Fotoğrafları</Text>
          <View style={styles.photosGrid}>
            {beforePhotos.map((photo) => (
              <Image
                key={photo.id}
                source={{ uri: `data:image/jpeg;base64,${photo.photo_base64}` }}
                style={styles.photo}
              />
            ))}
            <TouchableOpacity
              style={styles.addPhotoButton}
              onPress={() => pickImage('before')}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator color="#2563eb" />
              ) : (
                <>
                  <Ionicons name="camera" size={32} color="#2563eb" />
                  <Text style={styles.addPhotoText}>Öncesi Ekle</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* After Photos */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Sonrası Fotoğrafları</Text>
          <View style={styles.photosGrid}>
            {afterPhotos.map((photo) => (
              <Image
                key={photo.id}
                source={{ uri: `data:image/jpeg;base64,${photo.photo_base64}` }}
                style={styles.photo}
              />
            ))}
            <TouchableOpacity
              style={styles.addPhotoButton}
              onPress={() => pickImage('after')}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator color="#10b981" />
              ) : (
                <>
                  <Ionicons name="camera" size={32} color="#10b981" />
                  <Text style={[styles.addPhotoText, { color: '#10b981' }]}>Sonrası Ekle</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 18, color: '#ef4444', marginTop: 16 },
  scrollContent: { padding: 16 },
  card: {
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  serviceName: { fontSize: 20, fontWeight: 'bold', color: '#111827', flex: 1 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  statusText: { color: '#ffffff', fontSize: 12, fontWeight: '600' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  infoText: { fontSize: 15, color: '#374151', flex: 1 },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  priceLabel: { fontSize: 16, color: '#6b7280' },
  priceValue: { fontSize: 20, fontWeight: 'bold', color: '#10b981' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 16 },
  locationStatus: { marginBottom: 16 },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
  },
  locationBadgeText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  locationTime: { fontSize: 13, color: '#6b7280', marginTop: 8 },
  locationButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  locationButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  addPhotoButton: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  addPhotoText: { fontSize: 12, color: '#2563eb', marginTop: 4, fontWeight: '600' },
});
