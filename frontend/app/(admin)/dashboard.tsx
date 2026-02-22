import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_URL } from '../../config';

interface Stats {
  total_bookings: number;
  pending_bookings: number;
  confirmed_bookings: number;
  completed_bookings: number;
  total_customers: number;
  total_reviews: number;
  total_revenue: number;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

export default function DashboardScreen() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const token = await AsyncStorage.getItem('admin_token');
      if (!token) return;

      const response = await fetch(`${BACKEND_URL}/api/admin/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
        setUnreadCount(data.filter((n: Notification) => !n.read).length);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const token = await AsyncStorage.getItem('admin_token');
      if (!token) {
        router.replace('/admin-login');
        return;
      }

      const response = await fetch(`${BACKEND_URL}/api/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else if (response.status === 401) {
        await AsyncStorage.removeItem('admin_token');
        router.replace('/admin-login');
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
    fetchNotifications();
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('admin_token');
    await AsyncStorage.removeItem('admin_username');
    router.replace('/(tabs)');
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
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Admin Paneli</Text>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="#ef4444" />
          </TouchableOpacity>
        </View>

        {/* Revenue Card */}
        <View style={styles.revenueCard}>
          <Text style={styles.revenueLabel}>Toplam Gelir</Text>
          <Text style={styles.revenueValue}>₺{(stats?.total_revenue || 0).toFixed(2)}</Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: '#eff6ff' }]}>
            <Ionicons name="calendar" size={28} color="#2563eb" />
            <Text style={styles.statNumber}>{stats?.total_bookings || 0}</Text>
            <Text style={styles.statLabel}>Toplam Randevu</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#fef3c7' }]}>
            <Ionicons name="time" size={28} color="#f59e0b" />
            <Text style={styles.statNumber}>{stats?.pending_bookings || 0}</Text>
            <Text style={styles.statLabel}>Bekleyen</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#d1fae5' }]}>
            <Ionicons name="checkmark-circle" size={28} color="#10b981" />
            <Text style={styles.statNumber}>{stats?.confirmed_bookings || 0}</Text>
            <Text style={styles.statLabel}>Onaylandı</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#e5e7eb' }]}>
            <Ionicons name="checkmark-done" size={28} color="#6b7280" />
            <Text style={styles.statNumber}>{stats?.completed_bookings || 0}</Text>
            <Text style={styles.statLabel}>Tamamlandı</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#fce7f3' }]}>
            <Ionicons name="people" size={28} color="#ec4899" />
            <Text style={styles.statNumber}>{stats?.total_customers || 0}</Text>
            <Text style={styles.statLabel}>Müşteri</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#fef9c3' }]}>
            <Ionicons name="star" size={28} color="#eab308" />
            <Text style={styles.statNumber}>{stats?.total_reviews || 0}</Text>
            <Text style={styles.statLabel}>Değerlendirme</Text>
          </View>
        </View>

        {/* Menu Grid */}
        <Text style={styles.sectionTitle}>Yönetim</Text>
        <View style={styles.menuGrid}>
          <TouchableOpacity
            style={styles.menuCard}
            onPress={() => router.push('/(admin)/bookings')}
            activeOpacity={0.7}
          >
            <Ionicons name="list" size={36} color="#2563eb" />
            <Text style={styles.menuCardTitle}>Randevular</Text>
            <Text style={styles.menuCardDescription}>Randevuları yönet</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuCard}
            onPress={() => router.push('/(admin)/services')}
            activeOpacity={0.7}
          >
            <Ionicons name="briefcase" size={36} color="#10b981" />
            <Text style={styles.menuCardTitle}>Hizmetler</Text>
            <Text style={styles.menuCardDescription}>Hizmet ekle/düzenle</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuCard}
            onPress={() => router.push('/(admin)/customers')}
            activeOpacity={0.7}
          >
            <Ionicons name="people" size={36} color="#ec4899" />
            <Text style={styles.menuCardTitle}>Müşteriler</Text>
            <Text style={styles.menuCardDescription}>Müşteri listesi</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuCard}
            onPress={() => router.push('/(admin)/reviews')}
            activeOpacity={0.7}
          >
            <Ionicons name="star" size={36} color="#eab308" />
            <Text style={styles.menuCardTitle}>Değerlendirmeler</Text>
            <Text style={styles.menuCardDescription}>Yorumları görüntüle</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuCard}
            onPress={() => router.push('/(admin)/packages')}
            activeOpacity={0.7}
          >
            <Ionicons name="gift" size={36} color="#8b5cf6" />
            <Text style={styles.menuCardTitle}>Paketler</Text>
            <Text style={styles.menuCardDescription}>Paket yönetimi</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuCard}
            onPress={() => router.push('/(admin)/calendar')}
            activeOpacity={0.7}
          >
            <Ionicons name="calendar" size={36} color="#f59e0b" />
            <Text style={styles.menuCardTitle}>Takvim</Text>
            <Text style={styles.menuCardDescription}>Müsaitlik ayarla</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuCard, { width: '100%' }]}
            onPress={() => router.push('/(admin)/settings')}
            activeOpacity={0.7}
          >
            <Ionicons name="settings" size={36} color="#6b7280" />
            <Text style={styles.menuCardTitle}>Ayarlar</Text>
            <Text style={styles.menuCardDescription}>İndirim ve sistem ayarları</Text>
          </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
  },
  logoutButton: {
    padding: 8,
  },
  revenueCard: {
    backgroundColor: '#2563eb',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  revenueLabel: {
    fontSize: 14,
    color: '#dbeafe',
    marginBottom: 4,
  },
  revenueValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: '31%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  menuCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  menuCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginTop: 12,
    marginBottom: 4,
  },
  menuCardDescription: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
});
