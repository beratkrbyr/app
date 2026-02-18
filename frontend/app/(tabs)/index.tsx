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

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

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
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Temizlik Hizmetlerimiz</Text>
          <Text style={styles.headerSubtitle}>Cuma günleri %10 indirimli!</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <Image 
            source={require('../../assets/titan360_logo.png')} 
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <Text style={styles.headerSubtitle}>Cuma günleri %10 indirimli!</Text>
        </View>

        {/* Rating Summary */}
        {reviewStats && reviewStats.total_reviews > 0 && (
          <View style={styles.ratingSummary}>
            <View style={styles.ratingBig}>
              <Ionicons name="star" size={32} color="#f59e0b" />
              <Text style={styles.ratingValue}>{reviewStats.average_rating}</Text>
            </View>
            <Text style={styles.ratingCount}>{reviewStats.total_reviews} değerlendirme</Text>
          </View>
        )}

        {/* Services */}
        <View style={styles.sectionHeader}>
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
    paddingBottom: 32,
    alignItems: 'center',
  },
  headerLogo: {
    width: 180,
    height: 80,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#dbeafe',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: -20,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    gap: 12,
  },
  ratingBig: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
  },
  ratingCount: {
    fontSize: 14,
    color: '#6b7280',
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  serviceCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  serviceImageContainer: {
    height: 160,
    backgroundColor: '#e5e7eb',
  },
  serviceImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
  },
  serviceContent: {
    padding: 16,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  serviceDescription: {
    fontSize: 14,
    color: '#6b7280',
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
});
