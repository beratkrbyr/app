import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  Platform,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Package {
  id: string;
  name: string;
  description: string;
  service_id: string;
  service_name: string;
  frequency: string;
  discount_percent: number;
  total_sessions: number;
  price: number;
  active: boolean;
}

interface Service {
  id: string;
  name: string;
  price: number;
}

export default function PackagesScreen() {
  const router = useRouter();
  const [packages, setPackages] = useState<Package[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    service_id: '',
    frequency: 'weekly',
    discount_percent: '20',
    total_sessions: '4',
    price: '',
  });

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

      const [packagesRes, servicesRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/admin/packages`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${BACKEND_URL}/api/admin/services`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (packagesRes.ok) {
        const packagesData = await packagesRes.json();
        setPackages(packagesData);
      }

      if (servicesRes.ok) {
        const servicesData = await servicesRes.json();
        setServices(servicesData);
      }

      if (packagesRes.status === 401 || servicesRes.status === 401) {
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

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const calculatePrice = () => {
    const service = services.find((s) => s.id === formData.service_id);
    if (!service) return 0;
    
    const sessions = parseInt(formData.total_sessions) || 0;
    const discount = parseFloat(formData.discount_percent) || 0;
    
    return service.price * sessions * (1 - discount / 100);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.service_id || !formData.total_sessions) {
      showAlert('Hata', 'Lütfen tüm zorunlu alanları doldurun');
      return;
    }

    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('admin_token');
      
      const packageData = {
        name: formData.name,
        description: formData.description,
        service_id: formData.service_id,
        frequency: formData.frequency,
        discount_percent: parseFloat(formData.discount_percent) || 0,
        total_sessions: parseInt(formData.total_sessions) || 0,
        price: calculatePrice(),
      };

      const response = await fetch(`${BACKEND_URL}/api/admin/packages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(packageData),
      });

      if (response.ok) {
        showAlert('Başarılı', 'Paket oluşturuldu');
        setShowModal(false);
        resetForm();
        fetchData();
      } else {
        const error = await response.json();
        showAlert('Hata', error.detail || 'Paket oluşturulamadı');
      }
    } catch (error) {
      console.error('Error creating package:', error);
      showAlert('Hata', 'Bir hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      service_id: '',
      frequency: 'weekly',
      discount_percent: '20',
      total_sessions: '4',
      price: '',
    });
  };

  const getFrequencyText = (freq: string) => {
    switch (freq) {
      case 'weekly': return 'Haftalık';
      case 'biweekly': return '2 Haftada Bir';
      case 'monthly': return 'Aylık';
      default: return freq;
    }
  };

  const renderPackage = ({ item }: { item: Package }) => (
    <View style={styles.packageCard}>
      <View style={styles.packageHeader}>
        <View>
          <Text style={styles.packageName}>{item.name}</Text>
          <Text style={styles.serviceName}>{item.service_name}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: item.active ? '#d1fae5' : '#fee2e2' }]}>
          <Text style={[styles.badgeText, { color: item.active ? '#065f46' : '#991b1b' }]}>
            {item.active ? 'Aktif' : 'Pasif'}
          </Text>
        </View>
      </View>

      <Text style={styles.description}>{item.description}</Text>

      <View style={styles.detailsRow}>
        <View style={styles.detailItem}>
          <Ionicons name="repeat" size={18} color="#6b7280" />
          <Text style={styles.detailText}>{getFrequencyText(item.frequency)}</Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="layers" size={18} color="#6b7280" />
          <Text style={styles.detailText}>{item.total_sessions} Seans</Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="pricetag" size={18} color="#10b981" />
          <Text style={styles.detailText}>%{item.discount_percent} İndirim</Text>
        </View>
      </View>

      <View style={styles.priceRow}>
        <Text style={styles.priceLabel}>Paket Fiyatı:</Text>
        <Text style={styles.priceValue}>₺{item.price.toFixed(2)}</Text>
      </View>
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
        <Text style={styles.headerTitle}>Paketler ({packages.length})</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowModal(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={packages}
        renderItem={renderPackage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="gift-outline" size={60} color="#9ca3af" />
            <Text style={styles.emptyText}>Henüz paket yok</Text>
            <Text style={styles.emptySubtext}>Yeni paket eklemek için + butonuna tıklayın</Text>
          </View>
        }
      />

      {/* Add Package Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Yeni Paket</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={28} color="#111827" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Paket Adı *</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="Örn: Haftalık Temizlik Paketi"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Açıklama</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                placeholder="Paket açıklaması..."
                placeholderTextColor="#9ca3af"
                multiline
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Hizmet *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.service_id}
                  onValueChange={(value) => setFormData({ ...formData, service_id: value })}
                  style={styles.picker}
                >
                  <Picker.Item label="Hizmet Seçin" value="" />
                  {services.map((service) => (
                    <Picker.Item
                      key={service.id}
                      label={`${service.name} (₺${service.price})`}
                      value={service.id}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>Sıklık</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={formData.frequency}
                    onValueChange={(value) => setFormData({ ...formData, frequency: value })}
                    style={styles.picker}
                  >
                    <Picker.Item label="Haftalık" value="weekly" />
                    <Picker.Item label="2 Haftada Bir" value="biweekly" />
                    <Picker.Item label="Aylık" value="monthly" />
                  </Picker>
                </View>
              </View>

              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>Seans Sayısı *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.total_sessions}
                  onChangeText={(text) => setFormData({ ...formData, total_sessions: text })}
                  keyboardType="number-pad"
                  placeholderTextColor="#9ca3af"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>İndirim Oranı (%)</Text>
              <TextInput
                style={styles.input}
                value={formData.discount_percent}
                onChangeText={(text) => setFormData({ ...formData, discount_percent: text })}
                keyboardType="decimal-pad"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.pricePreview}>
              <Text style={styles.pricePreviewLabel}>Hesaplanan Fiyat:</Text>
              <Text style={styles.pricePreviewValue}>₺{calculatePrice().toFixed(2)}</Text>
            </View>

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.buttonDisabled]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.7}
            >
              {saving ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.saveButtonText}>Paketi Oluştur</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  addButton: {
    backgroundColor: '#2563eb',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  packageCard: {
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
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  packageName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  serviceName: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 14,
    color: '#374151',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  priceLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  priceValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 48,
  },
  row: {
    flexDirection: 'row',
  },
  pricePreview: {
    backgroundColor: '#eff6ff',
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  pricePreviewLabel: {
    fontSize: 14,
    color: '#1e40af',
  },
  pricePreviewValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  saveButton: {
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
