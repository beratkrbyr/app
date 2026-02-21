import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface CustomDiscount {
  id?: string;
  name: string;
  percentage: string;
  active: boolean;
}

export default function SettingsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fridayDiscount, setFridayDiscount] = useState('10');
  
  // Custom discounts state
  const [customDiscounts, setCustomDiscounts] = useState<CustomDiscount[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDiscountName, setNewDiscountName] = useState('');
  const [newDiscountPercentage, setNewDiscountPercentage] = useState('');
  const [savingDiscount, setSavingDiscount] = useState(false);
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const fetchSettings = async () => {
    try {
      const token = await AsyncStorage.getItem('admin_token');
      if (!token) {
        router.replace('/admin-login');
        return;
      }

      const response = await fetch(`${BACKEND_URL}/api/admin/settings`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const fridaySetting = data.find(
          (s: any) => s.key === 'friday_discount'
        );
        if (fridaySetting) {
          setFridayDiscount(fridaySetting.value);
        }
        
        // Load custom discounts
        const discountsSetting = data.find(
          (s: any) => s.key === 'custom_discounts'
        );
        if (discountsSetting && discountsSetting.value) {
          try {
            const discounts = JSON.parse(discountsSetting.value);
            setCustomDiscounts(discounts);
          } catch (e) {
            console.error('Error parsing custom discounts:', e);
          }
        }
      } else if (response.status === 401) {
        await AsyncStorage.removeItem('admin_token');
        router.replace('/admin-login');
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!fridayDiscount.trim()) {
      showAlert('Hata', 'Lütfen bir değer girin.');
      return;
    }

    const discount = parseFloat(fridayDiscount);
    if (isNaN(discount) || discount < 0 || discount > 100) {
      showAlert('Hata', 'Lütfen 0-100 arasında bir değer girin.');
      return;
    }

    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('admin_token');
      const response = await fetch(`${BACKEND_URL}/api/admin/settings`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: 'friday_discount',
          value: fridayDiscount,
        }),
      });

      if (response.ok) {
        showAlert('Başarılı', 'Ayarlar kaydedildi.');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      showAlert('Hata', 'Ayarlar kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddDiscount = async () => {
    if (!newDiscountName.trim()) {
      showAlert('Hata', 'İndirim adı girin.');
      return;
    }
    
    if (!newDiscountPercentage.trim()) {
      showAlert('Hata', 'İndirim oranı girin.');
      return;
    }

    const percentage = parseFloat(newDiscountPercentage);
    if (isNaN(percentage) || percentage < 0 || percentage > 100) {
      showAlert('Hata', 'Lütfen 0-100 arasında bir değer girin.');
      return;
    }

    setSavingDiscount(true);
    try {
      const newDiscount: CustomDiscount = {
        id: Date.now().toString(),
        name: newDiscountName,
        percentage: newDiscountPercentage,
        active: true,
      };
      
      const updatedDiscounts = [...customDiscounts, newDiscount];
      
      const token = await AsyncStorage.getItem('admin_token');
      const response = await fetch(`${BACKEND_URL}/api/admin/settings`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: 'custom_discounts',
          value: JSON.stringify(updatedDiscounts),
        }),
      });

      if (response.ok) {
        setCustomDiscounts(updatedDiscounts);
        setShowAddModal(false);
        setNewDiscountName('');
        setNewDiscountPercentage('');
        showAlert('Başarılı', 'İndirim eklendi.');
      }
    } catch (error) {
      console.error('Error adding discount:', error);
      showAlert('Hata', 'İndirim eklenemedi.');
    } finally {
      setSavingDiscount(false);
    }
  };

  const toggleDiscountActive = async (id: string) => {
    const updatedDiscounts = customDiscounts.map(d => 
      d.id === id ? { ...d, active: !d.active } : d
    );
    
    try {
      const token = await AsyncStorage.getItem('admin_token');
      await fetch(`${BACKEND_URL}/api/admin/settings`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: 'custom_discounts',
          value: JSON.stringify(updatedDiscounts),
        }),
      });
      
      setCustomDiscounts(updatedDiscounts);
    } catch (error) {
      console.error('Error toggling discount:', error);
    }
  };

  const deleteDiscount = async (id: string) => {
    const updatedDiscounts = customDiscounts.filter(d => d.id !== id);
    
    try {
      const token = await AsyncStorage.getItem('admin_token');
      await fetch(`${BACKEND_URL}/api/admin/settings`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: 'custom_discounts',
          value: JSON.stringify(updatedDiscounts),
        }),
      });
      
      setCustomDiscounts(updatedDiscounts);
      showAlert('Başarılı', 'İndirim silindi.');
    } catch (error) {
      console.error('Error deleting discount:', error);
      showAlert('Hata', 'İndirim silinemedi.');
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword.trim()) {
      showAlert('Hata', 'Mevcut şifrenizi girin.');
      return;
    }

    if (!newPassword.trim()) {
      showAlert('Hata', 'Yeni şifrenizi girin.');
      return;
    }

    if (newPassword.length < 6) {
      showAlert('Hata', 'Yeni şifre en az 6 karakter olmalıdır.');
      return;
    }

    if (newPassword !== confirmPassword) {
      showAlert('Hata', 'Yeni şifreler eşleşmiyor.');
      return;
    }

    setChangingPassword(true);
    try {
      const token = await AsyncStorage.getItem('admin_token');
      const response = await fetch(`${BACKEND_URL}/api/admin/change-password`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      if (response.ok) {
        showAlert('Başarılı', 'Şifreniz başarıyla değiştirildi.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        const error = await response.json();
        showAlert('Hata', error.detail || 'Şifre değiştirilemedi.');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      showAlert('Hata', 'Şifre değiştirilemedi.');
    } finally {
      setChangingPassword(false);
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Discount Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>İndirim Ayarları</Text>

          <View style={styles.settingCard}>
            <View style={styles.settingHeader}>
              <Ionicons name="pricetag" size={24} color="#10b981" />
              <Text style={styles.settingLabel}>Cuma Günü İndirimi (%)</Text>
            </View>
            <TextInput
              style={styles.input}
              value={fridayDiscount}
              onChangeText={setFridayDiscount}
              keyboardType="decimal-pad"
              placeholder="10"
              placeholderTextColor="#9ca3af"
            />
            <Text style={styles.settingDescription}>
              Cuma günleri tüm hizmetlerde uygulanacak indirim oranı
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled, { marginTop: 12 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Ionicons name="save" size={20} color="#ffffff" />
                <Text style={styles.saveButtonText}>Kaydet</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Custom Discounts Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitleNoMargin}>Özel İndirimler</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddModal(true)}
            >
              <Ionicons name="add-circle" size={24} color="#2563eb" />
              <Text style={styles.addButtonText}>Yeni Ekle</Text>
            </TouchableOpacity>
          </View>

          {customDiscounts.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="pricetags-outline" size={48} color="#9ca3af" />
              <Text style={styles.emptyText}>Henüz özel indirim eklenmemiş</Text>
              <Text style={styles.emptySubtext}>
                Yeni Ekle butonuna tıklayarak indirim ekleyebilirsiniz
              </Text>
            </View>
          ) : (
            customDiscounts.map((discount) => (
              <View key={discount.id} style={styles.discountCard}>
                <View style={styles.discountInfo}>
                  <View style={styles.discountHeader}>
                    <Text style={styles.discountName}>{discount.name}</Text>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: discount.active ? '#dcfce7' : '#fee2e2' }
                    ]}>
                      <Text style={[
                        styles.statusText,
                        { color: discount.active ? '#16a34a' : '#dc2626' }
                      ]}>
                        {discount.active ? 'Aktif' : 'Pasif'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.discountPercentage}>%{discount.percentage} indirim</Text>
                </View>
                <View style={styles.discountActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: discount.active ? '#fef3c7' : '#dcfce7' }]}
                    onPress={() => toggleDiscountActive(discount.id!)}
                  >
                    <Ionicons
                      name={discount.active ? 'pause' : 'play'}
                      size={18}
                      color={discount.active ? '#d97706' : '#16a34a'}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#fee2e2' }]}
                    onPress={() => deleteDiscount(discount.id!)}
                  >
                    <Ionicons name="trash" size={18} color="#dc2626" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Password Change Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Şifre Değiştir</Text>

          <View style={styles.settingCard}>
            <View style={styles.settingHeader}>
              <Ionicons name="lock-closed" size={24} color="#ef4444" />
              <Text style={styles.settingLabel}>Admin Şifresi</Text>
            </View>

            <View style={styles.passwordInputContainer}>
              <TextInput
                style={styles.passwordInput}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry={!showCurrentPassword}
                placeholder="Mevcut Şifre"
                placeholderTextColor="#9ca3af"
              />
              <TouchableOpacity
                onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                style={styles.eyeButton}
              >
                <Ionicons
                  name={showCurrentPassword ? 'eye-off' : 'eye'}
                  size={20}
                  color="#6b7280"
                />
              </TouchableOpacity>
            </View>

            <View style={styles.passwordInputContainer}>
              <TextInput
                style={styles.passwordInput}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showNewPassword}
                placeholder="Yeni Şifre (en az 6 karakter)"
                placeholderTextColor="#9ca3af"
              />
              <TouchableOpacity
                onPress={() => setShowNewPassword(!showNewPassword)}
                style={styles.eyeButton}
              >
                <Ionicons
                  name={showNewPassword ? 'eye-off' : 'eye'}
                  size={20}
                  color="#6b7280"
                />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.input, { marginTop: 8 }]}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholder="Yeni Şifre (Tekrar)"
              placeholderTextColor="#9ca3af"
            />

            <Text style={styles.settingDescription}>
              Yönetici hesabının şifresini değiştirin
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.passwordButton, changingPassword && styles.saveButtonDisabled, { marginTop: 12 }]}
            onPress={handleChangePassword}
            disabled={changingPassword}
          >
            {changingPassword ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Ionicons name="key" size={20} color="#ffffff" />
                <Text style={styles.saveButtonText}>Şifreyi Değiştir</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color="#2563eb" />
          <Text style={styles.infoText}>
            Şifrenizi değiştirdikten sonra yeni şifrenizle giriş yapmanız gerekecektir.
          </Text>
        </View>
      </ScrollView>

      {/* Add Discount Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Yeni İndirim Ekle</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>İndirim Adı</Text>
              <TextInput
                style={styles.modalInput}
                value={newDiscountName}
                onChangeText={setNewDiscountName}
                placeholder="Örn: Yeni Müşteri İndirimi"
                placeholderTextColor="#9ca3af"
              />

              <Text style={[styles.inputLabel, { marginTop: 16 }]}>İndirim Oranı (%)</Text>
              <TextInput
                style={styles.modalInput}
                value={newDiscountPercentage}
                onChangeText={setNewDiscountPercentage}
                keyboardType="decimal-pad"
                placeholder="Örn: 15"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.cancelButtonText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, savingDiscount && styles.saveButtonDisabled]}
                onPress={handleAddDiscount}
                disabled={savingDiscount}
              >
                {savingDiscount ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.confirmButtonText}>Ekle</Text>
                )}
              </TouchableOpacity>
            </View>
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
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addButtonText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '600',
  },
  settingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    marginBottom: 8,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    marginBottom: 8,
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: '#111827',
  },
  eyeButton: {
    padding: 12,
  },
  settingDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginTop: 8,
  },
  infoCard: {
    backgroundColor: '#eff6ff',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 20,
  },
  saveButton: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  passwordButton: {
    backgroundColor: '#ef4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 12,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
    textAlign: 'center',
  },
  discountCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  discountInfo: {
    flex: 1,
  },
  discountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  discountName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  discountPercentage: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '500',
  },
  discountActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
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
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  confirmButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#2563eb',
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
  },
});
