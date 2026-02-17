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

export default function HomeScreen() {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchServices = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/services`);
      const data = await response.json();
      setServices(data);
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchServices();
  };

  const renderService = ({ item }: { item: Service }) => (
    <TouchableOpacity
      style={styles.serviceCard}
      onPress={() => router.push({ pathname: '/service-detail', params: { id: item.id } })}
    >
      <View style={styles.serviceImageContainer}>
        {item.image ? (
          <Image
            source={{ uri: item.image }}
            style={styles.serviceImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name="sparkles" size={40} color="#2563eb" />
          </View>
        )}
      </View>
      <View style={styles.serviceContent}>
        <Text style={styles.serviceName}>{item.name}</Text>
        <Text style={styles.serviceDescription} numberOfLines={2}>
          {item.description}
        </Text>
        <View style={styles.priceContainer}>
          <Text style={styles.price}>₺{item.price.toFixed(2)}</Text>
          <Ionicons name="chevron-forward" size={20} color="#6b7280" />
        </View>
      </View>
    </TouchableOpacity>
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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Temizlik Hizmetlerimiz</Text>
        <Text style={styles.headerSubtitle}>Cuma günleri %10 indirimli!</Text>
      </View>
      <FlatList
        data={services}
        renderItem={renderService}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="sad-outline" size={60} color="#9ca3af" />
            <Text style={styles.emptyText}>Henüz hizmet bulunmamaktadır</Text>
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
  header: {
    backgroundColor: '#2563eb',
    padding: 24,
    paddingBottom: 32,
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
  },
  serviceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  serviceImageContainer: {
    width: '100%',
    height: 180,
  },
  serviceImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceContent: {
    padding: 16,
  },
  serviceName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 16,
  },
});
