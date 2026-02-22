import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_URL } from '../../config';

const showAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};

const showConfirm = (title: string, message: string, onConfirm: () => void) => {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
  } else {
    Alert.alert(title, message, [
      { text: 'İptal', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: onConfirm },
    ]);
  }
};

interface Review {
  id: string;
  customer_name: string;
  customer_phone: string;
  rating: number;
  comment?: string;
  created_at: string;
}

interface ReviewStats {
  average_rating: number;
  total_reviews: number;
  breakdown: { [key: string]: number };
}

export default function ReviewsScreen() {
  const router = useRouter();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = await AsyncStorage.getItem('admin_token');
      if (!token) {
        router.replace('/admin-login');
        return;
      }

      const [reviewsRes, statsRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/admin/reviews`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${BACKEND_URL}/api/reviews/stats`),
      ]);

      if (reviewsRes.ok) {
        const reviewsData = await reviewsRes.json();
        setReviews(reviewsData);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (reviewsRes.status === 401) {
        await AsyncStorage.removeItem('admin_token');
        router.replace('/admin-login');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const deleteReview = async (reviewId: string) => {
    showConfirm('Değerlendirmeyi Sil', 'Bu değerlendirmeyi silmek istediğinize emin misiniz?', async () => {
      try {
        const token = await AsyncStorage.getItem('admin_token');
        const response = await fetch(`${BACKEND_URL}/api/admin/reviews/${reviewId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (response.ok) {
          showAlert('Başarılı', 'Değerlendirme silindi.');
          fetchData();
        } else {
          showAlert('Hata', 'Değerlendirme silinemedi.');
        }
      } catch (error) {
        console.error('Error deleting review:', error);
        showAlert('Hata', 'Bir hata oluştu.');
      }
    });
  };

  const renderStars = (rating: number) => {
    return (
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= rating ? 'star' : 'star-outline'}
            size={18}
            color="#f59e0b"
          />
        ))}
      </View>
    );
  };

  const renderReview = ({ item }: { item: Review }) => (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={20} color="#ffffff" />
        </View>
        <View style={styles.reviewInfo}>
          <Text style={styles.customerName}>{item.customer_name}</Text>
          <Text style={styles.customerPhone}>{item.customer_phone}</Text>
        </View>
        {renderStars(item.rating)}
      </View>

      {item.comment && <Text style={styles.comment}>{item.comment}</Text>}

      <Text style={styles.date}>
        {new Date(item.created_at).toLocaleDateString('tr-TR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}
      </Text>
    </View>
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
      {/* Stats Summary */}
      {stats && (
        <View style={styles.statsSummary}>
          <View style={styles.avgRating}>
            <Ionicons name="star" size={40} color="#f59e0b" />
            <Text style={styles.avgRatingValue}>{stats.average_rating}</Text>
            <Text style={styles.avgRatingLabel}>{stats.total_reviews} değerlendirme</Text>
          </View>

          <View style={styles.breakdownContainer}>
            {[5, 4, 3, 2, 1].map((rating) => (
              <View key={rating} style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>{rating}</Text>
                <Ionicons name="star" size={14} color="#f59e0b" />
                <View style={styles.breakdownBarContainer}>
                  <View
                    style={[
                      styles.breakdownBar,
                      {
                        width: `${
                          stats.total_reviews > 0
                            ? (stats.breakdown[rating.toString()] / stats.total_reviews) * 100
                            : 0
                        }%`,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.breakdownCount}>{stats.breakdown[rating.toString()]}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <FlatList
        data={reviews}
        renderItem={renderReview}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="star-outline" size={60} color="#9ca3af" />
            <Text style={styles.emptyText}>Henüz değerlendirme yok</Text>
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
  statsSummary: {
    backgroundColor: '#ffffff',
    margin: 16,
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avgRating: {
    alignItems: 'center',
    paddingRight: 20,
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
  },
  avgRatingValue: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 8,
  },
  avgRatingLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  breakdownContainer: {
    flex: 1,
    paddingLeft: 20,
    justifyContent: 'center',
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  breakdownLabel: {
    width: 16,
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'right',
    marginRight: 4,
  },
  breakdownBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  breakdownBar: {
    height: '100%',
    backgroundColor: '#f59e0b',
    borderRadius: 4,
  },
  breakdownCount: {
    width: 24,
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'right',
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  reviewCard: {
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
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  reviewInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  customerPhone: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  starsRow: {
    flexDirection: 'row',
  },
  comment: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  date: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'right',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 12,
  },
});
