import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_URL } from '../../config';

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  loyalty_points: number;
  total_bookings: number;
  referral_code: string;
  created_at: string;
}

export default function CustomersScreen() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredCustomers(customers);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = customers.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.phone.includes(query) ||
          (c.email && c.email.toLowerCase().includes(query))
      );
      setFilteredCustomers(filtered);
    }
  }, [searchQuery, customers]);

  const fetchCustomers = async () => {
    try {
      const token = await AsyncStorage.getItem('admin_token');
      if (!token) {
        router.replace('/admin-login');
        return;
      }

      const response = await fetch(`${BACKEND_URL}/api/admin/customers`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setCustomers(data);
        setFilteredCustomers(data);
      } else if (response.status === 401) {
        await AsyncStorage.removeItem('admin_token');
        router.replace('/admin-login');
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchCustomers();
  };

  const renderCustomer = ({ item }: { item: Customer }) => (
    <View style={styles.customerCard}>
      <View style={styles.customerHeader}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={24} color="#ffffff" />
        </View>
        <View style={styles.customerInfo}>
          <Text style={styles.customerName}>{item.name}</Text>
          <Text style={styles.customerPhone}>{item.phone}</Text>
          {item.email && <Text style={styles.customerEmail}>{item.email}</Text>}
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Ionicons name="gift" size={18} color="#2563eb" />
          <Text style={styles.statValue}>{item.loyalty_points}</Text>
          <Text style={styles.statLabel}>Puan</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="calendar" size={18} color="#10b981" />
          <Text style={styles.statValue}>{item.total_bookings}</Text>
          <Text style={styles.statLabel}>Randevu</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="code" size={18} color="#f59e0b" />
          <Text style={styles.statValue}>{item.referral_code}</Text>
          <Text style={styles.statLabel}>Ref. Kodu</Text>
        </View>
      </View>

      <Text style={styles.createdAt}>
        Kayıt: {new Date(item.created_at).toLocaleDateString('tr-TR')}
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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Müşteriler ({customers.length})</Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#6b7280" />
        <TextInput
          style={styles.searchInput}
          placeholder="İsim, telefon veya email ile ara..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9ca3af"
        />
        {searchQuery !== '' && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#6b7280" />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filteredCustomers}
        renderItem={renderCustomer}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={60} color="#9ca3af" />
            <Text style={styles.emptyText}>Müşteri bulunamadı</Text>
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
  header: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    margin: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchInput: {
    flex: 1,
    height: 48,
    marginLeft: 12,
    fontSize: 16,
    color: '#111827',
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  customerCard: {
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
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  customerPhone: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  customerEmail: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  createdAt: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'right',
    marginTop: 8,
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
