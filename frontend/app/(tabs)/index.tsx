import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BACKEND_URL } from '../../config';

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  image?: string;
  active: boolean;
}

interface Review {
  id: string;
  customer_name: string;
  rating: number;
  comment?: string;
  created_at: string;
}

interface ReviewStats {
  average_rating: number;
  total_reviews: number;
  breakdown: { [key: string]: number };
}

export default function HomeScreen() {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [servicesRes, reviewsRes, statsRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/services`),
        fetch(`${BACKEND_URL}/api/reviews?limit=5`),
        fetch(`${BACKEND_URL}/api/reviews/stats`),
      ]);
      
      const servicesData = await servicesRes.json();
      const reviewsData = await reviewsRes.json();
      const statsData = await statsRes.json();
      
      setServices(servicesData);
      setReviews(reviewsData);
      setReviewStats(statsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const renderService = ({ item }: { item: Service }) => (
    <TouchableOpacity
      style={styles.serviceCard}
      onPress={() => router.push({ pathname: '/service-detail', params: { id: item.id } })}
      activeOpacity={0.7}
    >
      <View style={styles.serviceImageContainer}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.serviceImage} resizeMode="cover" />
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name="sparkles" size={40} color="#2563eb" />
          </View>
        )}
      </View>
      <View style={styles.serviceContent}>
        <Text style={styles.serviceName}>{item.name}</Text>
        <Text style={styles.serviceDescription} numberOfLines={2}>{item.description}</Text>
        <View style={styles.priceContainer}>
          <Text style={styles.price}>₺{item.price.toFixed(2)}</Text>
          <Ionicons name="chevron-forward" size={20} color="#6b7280" />
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderReview = ({ item }: { item: Review }) => (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewerAvatar}>
          <Ionicons name="person" size={20} color="#ffffff" />
        </View>
        <View style={styles.reviewerInfo}>
          <Text style={styles.reviewerName}>{item.customer_name}</Text>
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Ionicons
                key={star}
                name={star <= item.rating ? 'star' : 'star-outline'}
                size={14}
                color="#f59e0b"
              />
            ))}
          </View>
        </View>
      </View>
      {item.comment && <Text style={styles.reviewComment}>{item.comment}</Text>}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1e40af" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Promo Banner */}
        <View style={styles.promoBanner}>
          <View style={styles.promoIcon}>
            <Ionicons name="pricetag" size={24} color="#ffffff" />
          </View>
          <View style={styles.promoContent}>
            <Text style={styles.promoTitle}>Cuma İndirimi</Text>
            <Text style={styles.promoText}>Her Cuma %10 indirim!</Text>
          </View>
          <Text style={styles.promoPercent}>%10</Text>
        </View>

        {/* Rating Summary */}
        {reviewStats && reviewStats.total_reviews > 0 && (
          <View style={styles.ratingSummary}>
            <View style={styles.ratingBig}>
              <Ionicons name="star" size={28} color="#f59e0b" />
              <Text style={styles.ratingValue}>{reviewStats.average_rating}</Text>
            </View>
            <View style={styles.ratingDivider} />
            <Text style={styles.ratingCount}>{reviewStats.total_reviews} değerlendirme</Text>
          </View>
        )}

        {/* Services with Logo */}
        <View style={styles.servicesHeader}>
          <Image 
            source={require('../../assets/titan360_logo.png')} 
            style={styles.servicesLogo}
            resizeMode="contain"
          />
          <Text style={styles.sectionTitle}>Hizmetlerimiz</Text>
        </View>
        
        {services.length > 0 ? (
          services.map((service) => (
            <TouchableOpacity
              key={service.id}
              style={styles.serviceCard}
              onPress={() => router.push({ pathname: '/service-detail', params: { id: service.id } })}
              activeOpacity={0.7}
            >
              <View style={styles.serviceImageContainer}>
                {service.image ? (
                  <Image source={{ uri: service.image }} style={styles.serviceImage} resizeMode="cover" />
                ) : (
                  <View style={styles.placeholderImage}>
                    <Ionicons name="sparkles" size={40} color="#2563eb" />
                  </View>
                )}
              </View>
              <View style={styles.serviceContent}>
                <Text style={styles.serviceName}>{service.name}</Text>
                <Text style={styles.serviceDescription} numberOfLines={2}>{service.description}</Text>
                <View style={styles.priceContainer}>
                  <Text style={styles.price}>₺{service.price.toFixed(2)}</Text>
                  <Ionicons name="chevron-forward" size={20} color="#6b7280" />
                </View>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="sad-outline" size={60} color="#9ca3af" />
            <Text style={styles.emptyText}>Henüz hizmet bulunmamaktadır</Text>
          </View>
        )}

        {/* Customer Reviews */}
        {reviews.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Mutlu Müşterilerimiz</Text>
            </View>
            <FlatList
              data={reviews}
              renderItem={renderReview}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.reviewsList}
              scrollEnabled={true}
            />
          </>
        )}

        {/* Features Section */}
        <View style={styles.featuresSection}>
          <Text style={styles.featuresTitle}>Neden Biz?</Text>
          
          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name="shield-checkmark" size={24} color="#2563eb" />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Güvenilir Hizmet</Text>
              <Text style={styles.featureText}>Deneyimli ve güvenilir ekibimizle</Text>
            </View>
          </View>
          
          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name="gift" size={24} color="#2563eb" />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Sadakat Programı</Text>
              <Text style={styles.featureText}>Her randevuda puan kazanın</Text>
            </View>
          </View>
          
          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name="people" size={24} color="#2563eb" />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Arkadaşını Getir</Text>
              <Text style={styles.featureText}>Referans ile 50₺ kazanın</Text>
            </View>
          </View>
        </View>

        {/* Admin Login Link */}
        <TouchableOpacity
          style={styles.adminLink}
          onPress={() => router.push('/admin-login')}
        >
          <Ionicons name="settings-outline" size={18} color="#6b7280" />
          <Text style={styles.adminLinkText}>Yönetici Girişi</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingLogo: {
    width: 200,
    height: 80,
  },
  promoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
  },
  promoIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  promoContent: {
    flex: 1,
    marginLeft: 12,
  },
  promoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    opacity: 0.9,
  },
  promoText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  promoPercent: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  ratingSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    gap: 16,
  },
  ratingBig: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  ratingDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#e5e7eb',
  },
  ratingCount: {
    fontSize: 14,
    color: '#6b7280',
  },
  servicesHeader: {
    backgroundColor: '#1e40af',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  servicesLogo: {
    width: 160,
    height: 60,
    marginBottom: 12,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  serviceCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  serviceImageContainer: {
    height: 140,
    backgroundColor: '#f1f5f9',
  },
  serviceImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
  },
  serviceContent: {
    padding: 16,
  },
  serviceName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
  },
  serviceDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 12,
    lineHeight: 20,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 12,
  },
  reviewsList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  reviewCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    width: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  reviewerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  reviewerInfo: {
    flex: 1,
  },
  reviewerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewComment: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  featuresSection: {
    backgroundColor: '#ffffff',
    margin: 16,
    borderRadius: 12,
    padding: 20,
    marginBottom: 32,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  featureText: {
    fontSize: 14,
    color: '#6b7280',
  },
  adminLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginBottom: 32,
    gap: 8,
  },
  adminLinkText: {
    fontSize: 14,
    color: '#6b7280',
  },
});
