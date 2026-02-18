import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Modal,
  TextInput,
  Share,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCustomer } from '../../contexts/CustomerContext';
import { useNotification } from '../../contexts/NotificationContext';

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
  has_review?: boolean;
  location_status?: string;
}

interface LocationData {
  status: string;
  latitude: number | null;
  longitude: number | null;
  updated_at?: string;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { customer, isAuthenticated, logout, refreshProfile } = useCustomer();
  const { hasPermission, requestPermission } = useNotification();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  
  // Review modal state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewBookingId, setReviewBookingId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  
  // Referral modal state
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [applyingReferral, setApplyingReferral] = useState(false);
  
  // Location tracking state
  const [bookingLocations, setBookingLocations] = useState<{[key: string]: LocationData}>({});

  // Track if initial load is done
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  
  useEffect(() => {
    if (isAuthenticated && customer?.phone && !initialLoadDone) {
      setInitialLoadDone(true);
      fetchBookings();
    }
  }, [isAuthenticated, customer?.phone]);

  useEffect(() => {
    setNotificationsEnabled(hasPermission);
  }, [hasPermission]);

  const handleNotificationToggle = async (value: boolean) => {
    if (value) {
      const granted = await requestPermission();
      setNotificationsEnabled(granted);
      if (granted) {
        showAlert('Bildirimler Açık', 'Randevu hatırlatmaları ve güncellemeleri alacaksınız.');
      }
    } else {
      setNotificationsEnabled(false);
      showAlert('Bildirimler Kapalı', 'Bildirimler kapatıldı. Cihaz ayarlarından yeniden açabilirsiniz.');
    }
  };

  const fetchBookings = async () => {
    if (!customer?.phone) {
      setLoadingBookings(false);
      return;
    }
    
    setLoadingBookings(true);
    try {
      const url = `${BACKEND_URL}/api/bookings/check?phone=${encodeURIComponent(customer.phone)}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error('Bookings API error:', response.status);
        setLoadingBookings(false);
        return;
      }
      
      const data = await response.json();
      
      // Ensure each booking has an id
      const processedData = data.map((booking: any) => ({
        ...booking,
        id: booking.id || booking._id,
      }));
      
      setBookings(processedData);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoadingBookings(false);
      setRefreshing(false);
    }
  };

  const fetchBookingLocation = async (bookingId: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/location/${bookingId}`);
      if (response.ok) {
        const data = await response.json();
        setBookingLocations(prev => ({ ...prev, [bookingId]: data }));
      }
    } catch (error) {
      console.error('Error fetching location:', error);
    }
  };

  const getLocationStatusText = (status: string) => {
    switch (status) {
      case 'on_the_way': return 'Ekibimiz yolda';
      case 'arrived': return 'Ekibimiz ulaştı';
      case 'in_progress': return 'Temizlik devam ediyor';
      case 'completed': return 'Tamamlandı';
      default: return '';
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

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings();
    refreshProfile();
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
      Alert.alert(title, message, [
        { text: 'Hayır', style: 'cancel' },
        { text: 'Evet', style: 'destructive', onPress: onConfirm },
      ]);
    }
  };

  const handleCancelBooking = (bookingId: string) => {
    showConfirm('Randevu İptali', 'Bu randevuyu iptal etmek istediğinizden emin misiniz?', () =>
      cancelBooking(bookingId)
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
    showConfirm('Çıkış Yap', 'Çıkış yapmak istediğinizden emin misiniz?', performLogout);
  };

  const performLogout = async () => {
    try {
      await logout();
      router.replace('/customer-login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const openReviewModal = (bookingId: string) => {
    setReviewBookingId(bookingId);
    setReviewRating(5);
    setReviewComment('');
    setShowReviewModal(true);
  };

  const submitReview = async () => {
    if (!reviewBookingId) return;
    
    setSubmittingReview(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: reviewBookingId,
          rating: reviewRating,
          comment: reviewComment || null,
        }),
      });
      
      if (response.ok) {
        showAlert('Teşekkürler!', 'Değerlendirmeniz için teşekkür ederiz. 10 puan kazandınız!');
        setShowReviewModal(false);
        fetchBookings();
        refreshProfile();
      } else {
        const error = await response.json();
        showAlert('Hata', error.detail || 'Değerlendirme gönderilemedi.');
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      showAlert('Hata', 'Bir hata oluştu.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const shareReferralCode = async () => {
    if (!customer?.referral_code) return;
    
    const message = `Temizlik hizmetlerinde kaliteyi keşfet! Benim referans kodumu kullanarak kayıt ol ve 50 puan kazan: ${customer.referral_code}`;
    
    try {
      await Share.share({ message });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const applyReferralCode = async () => {
    if (!referralCode.trim() || !customer?.phone) return;
    
    setApplyingReferral(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/referral/use`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referral_code: referralCode.toUpperCase(),
          customer_phone: customer.phone,
        }),
      });
      
      if (response.ok) {
        showAlert('Başarılı!', '50 puan kazandınız!');
        setShowReferralModal(false);
        setReferralCode('');
        refreshProfile();
      } else {
        const error = await response.json();
        showAlert('Hata', error.detail || 'Referans kodu kullanılamadı.');
      }
    } catch (error) {
      console.error('Error applying referral:', error);
      showAlert('Hata', 'Bir hata oluştu.');
    } finally {
      setApplyingReferral(false);
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
      case 'cancelled': return 'İptal Edildi';
      default: return status;
    }
  };

  const canCancel = (status: string) => status === 'pending' || status === 'confirmed';
  const canReview = (status: string, hasReview?: boolean) => status === 'completed' && !hasReview;

  const renderBooking = ({ item }: { item: Booking }) => {
    const showTrackingButton = item.status === 'confirmed';
    
    return (
      <View style={styles.bookingCard}>
        <View style={styles.bookingHeader}>
          <Text style={styles.serviceName}>{item.service_name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
          </View>
        </View>

        <View style={styles.bookingDetail}>
          <Ionicons name="calendar-outline" size={16} color="#6b7280" />
          <Text style={styles.detailText}>
            {new Date(item.booking_date).toLocaleDateString('tr-TR', {
              day: 'numeric', month: 'long', year: 'numeric',
            })}
          </Text>
        </View>

        <View style={styles.bookingDetail}>
          <Ionicons name="time-outline" size={16} color="#6b7280" />
          <Text style={styles.detailText}>{item.booking_time}</Text>
        </View>

        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Toplam:</Text>
          <Text style={styles.priceText}>₺{item.total_price.toFixed(2)}</Text>
        </View>

        <View style={styles.bookingActions}>
          {showTrackingButton && (
            <TouchableOpacity
              style={styles.trackingButton}
              onPress={() => router.push({
                pathname: '/booking-tracking',
                params: {
                  bookingId: item.id,
                  serviceName: item.service_name,
                  bookingDate: item.booking_date,
                  bookingTime: item.booking_time,
                }
              })}
              activeOpacity={0.7}
            >
              <Ionicons name="navigate" size={18} color="#2563eb" />
              <Text style={styles.trackingButtonText}>Konum Takip</Text>
            </TouchableOpacity>
          )}
          
          {canCancel(item.status) && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => handleCancelBooking(item.id)}
              disabled={cancellingId === item.id}
              activeOpacity={0.7}
            >
              {cancellingId === item.id ? (
                <ActivityIndicator size="small" color="#ef4444" />
              ) : (
                <>
                  <Ionicons name="close-circle-outline" size={18} color="#ef4444" />
                  <Text style={styles.cancelButtonText}>İptal Et</Text>
                </>
              )}
            </TouchableOpacity>
          )}
          
          {canReview(item.status, item.has_review) && (
            <TouchableOpacity
              style={styles.reviewButton}
              onPress={() => openReviewModal(item.id)}
              activeOpacity={0.7}
            >
              <Ionicons name="star-outline" size={18} color="#f59e0b" />
              <Text style={styles.reviewButtonText}>Değerlendir</Text>
            </TouchableOpacity>
          )}
          
          {item.has_review && (
            <View style={styles.reviewedBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#10b981" />
              <Text style={styles.reviewedText}>Değerlendirildi</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

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
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.push('/customer-login')}
            activeOpacity={0.7}
          >
            <Ionicons name="log-in-outline" size={24} color="#ffffff" />
            <Text style={styles.loginButtonText}>Giriş Yap / Kayıt Ol</Text>
          </TouchableOpacity>
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={48} color="#ffffff" />
          </View>
          <Text style={styles.profileName}>{customer?.name}</Text>
          <Text style={styles.profilePhone}>{customer?.phone}</Text>
          {customer?.email && <Text style={styles.profileEmail}>{customer.email}</Text>}
        </View>

        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="gift" size={28} color="#2563eb" />
            <Text style={styles.statValue}>{customer?.loyalty_points || 0}</Text>
            <Text style={styles.statLabel}>Puan</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="calendar" size={28} color="#10b981" />
            <Text style={styles.statValue}>{customer?.total_bookings || 0}</Text>
            <Text style={styles.statLabel}>Randevu</Text>
          </View>
        </View>

        {/* Notification Settings */}
        <View style={styles.settingsCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="notifications" size={24} color="#2563eb" />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Bildirimler</Text>
                <Text style={styles.settingDescription}>Randevu hatırlatmaları ve güncellemeler</Text>
              </View>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleNotificationToggle}
              trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
              thumbColor={notificationsEnabled ? '#2563eb' : '#f4f4f5'}
            />
          </View>
        </View>

        {/* Referral Section */}
        <View style={styles.referralCard}>
          <View style={styles.referralHeader}>
            <Ionicons name="people" size={24} color="#2563eb" />
            <Text style={styles.referralTitle}>Arkadaşını Getir</Text>
          </View>
          <Text style={styles.referralText}>
            Referans kodunuzu paylaşın, arkadaşınız ve siz 50'şer puan kazanın!
          </Text>
          <View style={styles.referralCodeBox}>
            <Text style={styles.referralCode}>{customer?.referral_code || 'XXXXXX'}</Text>
            <TouchableOpacity onPress={shareReferralCode} activeOpacity={0.7}>
              <Ionicons name="share-social" size={24} color="#2563eb" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.useReferralButton}
            onPress={() => setShowReferralModal(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.useReferralText}>Referans Kodu Kullan</Text>
          </TouchableOpacity>
        </View>

        {/* Bookings Section */}
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

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={24} color="#ef4444" />
          <Text style={styles.logoutButtonText}>Çıkış Yap</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Review Modal */}
      <Modal visible={showReviewModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Değerlendirin</Text>
              <TouchableOpacity onPress={() => setShowReviewModal(false)}>
                <Ionicons name="close" size={28} color="#111827" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.ratingLabel}>Puanınız</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setReviewRating(star)}>
                  <Ionicons
                    name={star <= reviewRating ? 'star' : 'star-outline'}
                    size={40}
                    color="#f59e0b"
                  />
                </TouchableOpacity>
              ))}
            </View>
            
            <TextInput
              style={styles.commentInput}
              placeholder="Yorumunuz (opsiyonel)"
              value={reviewComment}
              onChangeText={setReviewComment}
              multiline
              numberOfLines={4}
              placeholderTextColor="#9ca3af"
            />
            
            <TouchableOpacity
              style={[styles.submitReviewButton, submittingReview && styles.buttonDisabled]}
              onPress={submitReview}
              disabled={submittingReview}
              activeOpacity={0.7}
            >
              {submittingReview ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.submitReviewText}>Gönder (+10 Puan)</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Referral Modal */}
      <Modal visible={showReferralModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Referans Kodu Kullan</Text>
              <TouchableOpacity onPress={() => setShowReferralModal(false)}>
                <Ionicons name="close" size={28} color="#111827" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.referralModalText}>
              Bir arkadaşınızın referans kodunu girin ve 50 puan kazanın!
            </Text>
            
            <TextInput
              style={styles.referralInput}
              placeholder="Referans Kodu"
              value={referralCode}
              onChangeText={setReferralCode}
              autoCapitalize="characters"
              placeholderTextColor="#9ca3af"
            />
            
            <TouchableOpacity
              style={[styles.applyReferralButton, applyingReferral && styles.buttonDisabled]}
              onPress={applyReferralCode}
              disabled={applyingReferral}
              activeOpacity={0.7}
            >
              {applyingReferral ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.applyReferralText}>Kodu Kullan</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { backgroundColor: '#2563eb', padding: 24 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#ffffff' },
  notAuthContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  notAuthTitle: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginTop: 24, marginBottom: 12 },
  notAuthText: { fontSize: 16, color: '#6b7280', textAlign: 'center', marginBottom: 32, lineHeight: 24 },
  loginButton: { backgroundColor: '#2563eb', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 12, gap: 12, width: '100%' },
  loginButtonText: { color: '#ffffff', fontSize: 18, fontWeight: '600' },
  scrollContent: { padding: 16 },
  profileCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 24, alignItems: 'center', marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#2563eb', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  profileName: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
  profilePhone: { fontSize: 16, color: '#6b7280', marginBottom: 4 },
  profileEmail: { fontSize: 14, color: '#9ca3af' },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: '#ffffff', borderRadius: 12, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  statValue: { fontSize: 28, fontWeight: 'bold', color: '#111827', marginTop: 8 },
  statLabel: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  settingsCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  settingInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  settingTextContainer: { flex: 1 },
  settingTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 2 },
  settingDescription: { fontSize: 13, color: '#6b7280' },
  referralCard: { backgroundColor: '#eff6ff', borderRadius: 12, padding: 20, marginBottom: 24 },
  referralHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  referralTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e40af' },
  referralText: { fontSize: 14, color: '#3b82f6', marginBottom: 16, lineHeight: 20 },
  referralCodeBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#ffffff', padding: 16, borderRadius: 8, marginBottom: 12 },
  referralCode: { fontSize: 24, fontWeight: 'bold', color: '#2563eb', letterSpacing: 2 },
  useReferralButton: { alignItems: 'center', padding: 12 },
  useReferralText: { color: '#2563eb', fontSize: 14, fontWeight: '600' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginBottom: 16 },
  bookingCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  bookingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  serviceName: { fontSize: 18, fontWeight: 'bold', color: '#111827', flex: 1 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  statusText: { color: '#ffffff', fontSize: 12, fontWeight: '600' },
  bookingDetail: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  detailText: { fontSize: 14, color: '#6b7280', flex: 1 },
  locationTrackingCard: { backgroundColor: '#f0f9ff', borderRadius: 10, padding: 12, marginVertical: 8, borderLeftWidth: 4, borderLeftColor: '#3b82f6' },
  locationTrackingHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  locationTrackingTitle: { fontSize: 15, fontWeight: '600' },
  locationTrackingTime: { fontSize: 12, color: '#6b7280', marginTop: 4, marginLeft: 26 },
  refreshLocationButton: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, alignSelf: 'flex-start' },
  refreshLocationText: { fontSize: 13, color: '#2563eb', fontWeight: '500' },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  priceLabel: { fontSize: 14, color: '#6b7280' },
  priceText: { fontSize: 18, fontWeight: 'bold', color: '#2563eb' },
  bookingActions: { flexDirection: 'row', gap: 12, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  cancelButton: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, borderRadius: 8, backgroundColor: '#fef2f2' },
  cancelButtonText: { color: '#ef4444', fontSize: 14, fontWeight: '600' },
  reviewButton: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, borderRadius: 8, backgroundColor: '#fefce8' },
  reviewButtonText: { color: '#ca8a04', fontSize: 14, fontWeight: '600' },
  reviewedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reviewedText: { color: '#10b981', fontSize: 12 },
  emptyBookings: { alignItems: 'center', paddingVertical: 40, backgroundColor: '#ffffff', borderRadius: 12 },
  emptyText: { fontSize: 16, color: '#9ca3af', marginTop: 12 },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 12, gap: 12, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#ef4444', marginBottom: 32 },
  logoutButtonText: { color: '#ef4444', fontSize: 16, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#ffffff', borderRadius: 16, width: '100%', maxWidth: 400, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  ratingLabel: { fontSize: 16, color: '#374151', marginBottom: 12, textAlign: 'center' },
  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 20 },
  commentInput: { backgroundColor: '#f3f4f6', borderRadius: 12, padding: 16, fontSize: 16, height: 100, textAlignVertical: 'top', marginBottom: 20 },
  submitReviewButton: { backgroundColor: '#f59e0b', padding: 16, borderRadius: 12, alignItems: 'center' },
  submitReviewText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  referralModalText: { fontSize: 14, color: '#6b7280', marginBottom: 20, textAlign: 'center' },
  referralInput: { backgroundColor: '#f3f4f6', borderRadius: 12, padding: 16, fontSize: 18, textAlign: 'center', marginBottom: 20, letterSpacing: 2 },
  applyReferralButton: { backgroundColor: '#2563eb', padding: 16, borderRadius: 12, alignItems: 'center' },
  applyReferralText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  buttonDisabled: { opacity: 0.6 },
});
