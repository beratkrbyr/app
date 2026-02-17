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

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Stats {
  total_bookings: number;
  pending_bookings: number;
  confirmed_bookings: number;
  completed_bookings: number;
}

export default function DashboardScreen() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = await AsyncStorage.getItem('admin_token');
      if (!token) {
        router.replace('/admin-login');
        return;
      }

      const response = await fetch(`${BACKEND_URL}/api/admin/stats`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Hoş Geldiniz!</Text>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="#ef4444" />
          </TouchableOpacity>
        </View>

        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: '#eff6ff' }]}>
            <Ionicons name="calendar" size={32} color="#2563eb" />
            <Text style={styles.statNumber}>{stats?.total_bookings || 0}</Text>
            <Text style={styles.statLabel}>Toplam Randevu</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#fef3c7' }]}>
            <Ionicons name="time" size={32} color="#f59e0b" />
            <Text style={styles.statNumber}>{stats?.pending_bookings || 0}</Text>
            <Text style={styles.statLabel}>Bekleyen</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#d1fae5' }]}>
            <Ionicons name="checkmark-circle" size={32} color="#10b981" />
            <Text style={styles.statNumber}>{stats?.confirmed_bookings || 0}</Text>
            <Text style={styles.statLabel}>Onaylandı</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#e5e7eb' }]}>
            <Ionicons name="checkmark-done" size={32} color="#6b7280" />
            <Text style={styles.statNumber}>{stats?.completed_bookings || 0}</Text>
            <Text style={styles.statLabel}>Tamamlandı</Text>
          </View>
        </View>

        <View style={styles.menuGrid}>
          <TouchableOpacity
            style={styles.menuCard}
            onPress={() => router.push('/(admin)/bookings')}
          >
            <Ionicons name="list" size={40} color="#2563eb" />
            <Text style={styles.menuCardTitle}>Randevular</Text>
            <Text style={styles.menuCardDescription}>
              Randevuları görüntüle ve yönet
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuCard}
            onPress={() => router.push('/(admin)/services')}
          >
            <Ionicons name="briefcase" size={40} color="#10b981" />
            <Text style={styles.menuCardTitle}>Hizmetler</Text>
            <Text style={styles.menuCardDescription}>
              Hizmetleri düzenle ve fiyatlandır
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuCard}
            onPress={() => router.push('/(admin)/calendar')}
          >
            <Ionicons name="calendar" size={40} color="#f59e0b" />
            <Text style={styles.menuCardTitle}>Takvim</Text>
            <Text style={styles.menuCardDescription}>
              Müsait günleri ayarla
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuCard}
            onPress={() => router.push('/(admin)/settings')}
          >
            <Ionicons name="settings" size={40} color="#6b7280" />
            <Text style={styles.menuCardTitle}>Ayarlar</Text>
            <Text style={styles.menuCardDescription}>
              İndirim ve diğer ayarlar
            </Text>
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
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
  },
  logoutButton: {
    padding: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: '48%',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
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
    fontSize: 18,
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
