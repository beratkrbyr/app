import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  image?: string;
}

export default function ServiceDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchServiceDetail();
  }, [id]);

  const fetchServiceDetail = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/services`);
      const data = await response.json();
      const foundService = data.find((s: Service) => s.id === id);
      setService(foundService);
    } catch (error) {
      console.error('Error fetching service:', error);
    } finally {
      setLoading(false);
    }
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

  if (!service) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={60} color="#ef4444" />
          <Text style={styles.errorText}>Hizmet bulunamadı</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {service.image ? (
          <Image
            source={{ uri: service.image }}
            style={styles.serviceImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name="sparkles" size={80} color="#2563eb" />
          </View>
        )}

        <View style={styles.content}>
          <Text style={styles.serviceName}>{service.name}</Text>
          
          <View style={styles.priceCard}>
            <Text style={styles.priceLabel}>Başlangıç Fiyatı</Text>
            <Text style={styles.price}>₺{service.price.toFixed(2)}</Text>
            <View style={styles.discountBadge}>
              <Ionicons name="pricetag" size={16} color="#10b981" />
              <Text style={styles.discountText}>Cuma günleri %10 indirim!</Text>
            </View>
          </View>

          <View style={styles.descriptionCard}>
            <Text style={styles.descriptionTitle}>Hizmet Detayları</Text>
            <Text style={styles.description}>{service.description}</Text>
          </View>

          <View style={styles.featuresCard}>
            <View style={styles.feature}>
              <Ionicons name="checkmark-circle" size={24} color="#10b981" />
              <Text style={styles.featureText}>Profesyonel Ekip</Text>
            </View>
            <View style={styles.feature}>
              <Ionicons name="checkmark-circle" size={24} color="#10b981" />
              <Text style={styles.featureText}>Kaliteli Malzemeler</Text>
            </View>
            <View style={styles.feature}>
              <Ionicons name="checkmark-circle" size={24} color="#10b981" />
              <Text style={styles.featureText}>Hızlı Servis</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.bookButton}
          onPress={() =>
            router.push({
              pathname: '/booking',
              params: { serviceId: service.id, serviceName: service.name, servicePrice: service.price },
            })
          }
        >
          <Text style={styles.bookButtonText}>Randevu Al</Text>
          <Ionicons name="arrow-forward" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 18,
    color: '#6b7280',
    marginTop: 16,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  serviceImage: {
    width: '100%',
    height: 300,
  },
  placeholderImage: {
    width: '100%',
    height: 300,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 24,
  },
  serviceName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 24,
  },
  priceCard: {
    backgroundColor: '#eff6ff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
  },
  priceLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  price: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 12,
  },
  discountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  discountText: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '600',
  },
  descriptionCard: {
    backgroundColor: '#f9fafb',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#6b7280',
    lineHeight: 24,
  },
  featuresCard: {
    gap: 16,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#374151',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  bookButton: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  bookButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
});
