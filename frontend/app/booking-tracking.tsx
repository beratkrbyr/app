import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface LocationData {
  status: string;
  latitude: number | null;
  longitude: number | null;
  updated_at?: string;
}

interface BookingInfo {
  id: string;
  service_name: string;
  booking_date: string;
  booking_time: string;
  customer_address: string;
}

export default function BookingTrackingScreen() {
  const router = useRouter();
  const { bookingId, serviceName, bookingDate, bookingTime } = useLocalSearchParams();
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (bookingId) {
      fetchLocation();
      // Auto-refresh every 30 seconds
      const interval = setInterval(fetchLocation, 30000);
      return () => clearInterval(interval);
    }
  }, [bookingId]);

  const fetchLocation = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/location/${bookingId}`);
      if (response.ok) {
        const data = await response.json();
        setLocation(data);
      }
    } catch (error) {
      console.error('Error fetching location:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchLocation();
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'on_the_way': return 'Ekibimiz Yolda';
      case 'arrived': return 'Ekibimiz Adresinize Ulaştı';
      case 'in_progress': return 'Temizlik Devam Ediyor';
      case 'completed': return 'Temizlik Tamamlandı';
      default: return 'Henüz Başlamadı';
    }
  };

  const getStatusDescription = (status: string) => {
    switch (status) {
      case 'on_the_way': return 'Temizlik ekibimiz adresinize doğru yola çıktı.';
      case 'arrived': return 'Ekibimiz adresinize ulaştı ve hazırlıklara başlıyor.';
      case 'in_progress': return 'Temizlik işlemi devam ediyor. Lütfen bekleyin.';
      case 'completed': return 'Temizlik başarıyla tamamlandı. Teşekkür ederiz!';
      default: return 'Ekibimiz henüz yola çıkmadı. Randevu saatinize yakın tekrar kontrol edin.';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on_the_way': return '#f59e0b';
      case 'arrived': return '#3b82f6';
      case 'in_progress': return '#8b5cf6';
      case 'completed': return '#10b981';
      default: return '#9ca3af';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'on_the_way': return 'car';
      case 'arrived': return 'flag';
      case 'in_progress': return 'construct';
      case 'completed': return 'checkmark-circle';
      default: return 'time';
    }
  };

  const statusSteps = [
    { key: 'on_the_way', label: 'Yolda', icon: 'car' },
    { key: 'arrived', label: 'Vardı', icon: 'flag' },
    { key: 'in_progress', label: 'Çalışıyor', icon: 'construct' },
    { key: 'completed', label: 'Bitti', icon: 'checkmark-circle' },
  ];

  const getCurrentStepIndex = (status: string) => {
    const index = statusSteps.findIndex(s => s.key === status);
    return index >= 0 ? index : -1;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Konum bilgisi yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentStatus = location?.status || 'not_started';
  const currentStepIndex = getCurrentStepIndex(currentStatus);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Konum Takibi</Text>
        <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
          {refreshing ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Ionicons name="refresh" size={24} color="#ffffff" />
          )}
        </TouchableOpacity>
      </View>

      {/* Service Info */}
      <View style={styles.serviceCard}>
        <Text style={styles.serviceName}>{serviceName}</Text>
        <View style={styles.serviceDetail}>
          <Ionicons name="calendar" size={16} color="#6b7280" />
          <Text style={styles.serviceDetailText}>
            {bookingDate ? new Date(bookingDate as string).toLocaleDateString('tr-TR', {
              day: 'numeric', month: 'long', year: 'numeric'
            }) : ''} - {bookingTime}
          </Text>
        </View>
      </View>

      {/* Status Card */}
      <View style={[styles.statusCard, { borderLeftColor: getStatusColor(currentStatus) }]}>
        <View style={[styles.statusIconContainer, { backgroundColor: getStatusColor(currentStatus) }]}>
          <Ionicons name={getStatusIcon(currentStatus) as any} size={32} color="#ffffff" />
        </View>
        <Text style={[styles.statusTitle, { color: getStatusColor(currentStatus) }]}>
          {getStatusText(currentStatus)}
        </Text>
        <Text style={styles.statusDescription}>
          {getStatusDescription(currentStatus)}
        </Text>
        {location?.updated_at && (
          <Text style={styles.lastUpdate}>
            Son güncelleme: {new Date(location.updated_at).toLocaleTimeString('tr-TR')}
          </Text>
        )}
      </View>

      {/* Progress Steps */}
      <View style={styles.progressContainer}>
        <Text style={styles.progressTitle}>İlerleme Durumu</Text>
        <View style={styles.stepsContainer}>
          {statusSteps.map((step, index) => {
            const isActive = index <= currentStepIndex;
            const isCurrent = index === currentStepIndex;
            
            return (
              <View key={step.key} style={styles.stepWrapper}>
                <View style={styles.stepRow}>
                  <View style={[
                    styles.stepCircle,
                    isActive && styles.stepCircleActive,
                    isCurrent && styles.stepCircleCurrent,
                  ]}>
                    <Ionicons 
                      name={step.icon as any} 
                      size={20} 
                      color={isActive ? '#ffffff' : '#9ca3af'} 
                    />
                  </View>
                  <View style={styles.stepTextContainer}>
                    <Text style={[
                      styles.stepLabel,
                      isActive && styles.stepLabelActive,
                    ]}>
                      {step.label}
                    </Text>
                  </View>
                </View>
                {index < statusSteps.length - 1 && (
                  <View style={[
                    styles.stepLine,
                    index < currentStepIndex && styles.stepLineActive,
                  ]} />
                )}
              </View>
            );
          })}
        </View>
      </View>

      {/* Auto Refresh Note */}
      <View style={styles.noteContainer}>
        <Ionicons name="information-circle" size={20} color="#6b7280" />
        <Text style={styles.noteText}>
          Sayfa her 30 saniyede otomatik güncellenir. Manuel yenilemek için sağ üstteki butona tıklayın.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#6b7280' },
  header: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#ffffff' },
  refreshButton: { padding: 8 },
  serviceCard: {
    backgroundColor: '#ffffff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  serviceName: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
  serviceDetail: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  serviceDetailText: { fontSize: 14, color: '#6b7280' },
  statusCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    padding: 24,
    borderRadius: 12,
    borderLeftWidth: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  statusDescription: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20 },
  lastUpdate: { fontSize: 12, color: '#9ca3af', marginTop: 12 },
  progressContainer: {
    backgroundColor: '#ffffff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  progressTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827', marginBottom: 20 },
  stepsContainer: { paddingLeft: 8 },
  stepWrapper: { marginBottom: 8 },
  stepRow: { flexDirection: 'row', alignItems: 'center' },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleActive: { backgroundColor: '#10b981' },
  stepCircleCurrent: { backgroundColor: '#2563eb' },
  stepTextContainer: { marginLeft: 12 },
  stepLabel: { fontSize: 15, color: '#9ca3af', fontWeight: '500' },
  stepLabelActive: { color: '#111827', fontWeight: '600' },
  stepLine: {
    width: 2,
    height: 20,
    backgroundColor: '#e5e7eb',
    marginLeft: 19,
    marginVertical: 4,
  },
  stepLineActive: { backgroundColor: '#10b981' },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    padding: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    gap: 8,
  },
  noteText: { flex: 1, fontSize: 12, color: '#6b7280', lineHeight: 18 },
});
