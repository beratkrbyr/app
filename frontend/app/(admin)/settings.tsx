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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function SettingsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fridayDiscount, setFridayDiscount] = useState('10');
  
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
        </View>

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Ionicons name="save" size={24} color="#ffffff" />
              <Text style={styles.saveButtonText}>İndirim Ayarlarını Kaydet</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Password Change Section */}
        <View style={[styles.section, { marginTop: 32 }]}>
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
        </View>

        <TouchableOpacity
          style={[styles.passwordButton, changingPassword && styles.saveButtonDisabled]}
          onPress={handleChangePassword}
          disabled={changingPassword}
        >
          {changingPassword ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Ionicons name="key" size={24} color="#ffffff" />
              <Text style={styles.saveButtonText}>Şifreyi Değiştir</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color="#2563eb" />
          <Text style={styles.infoText}>
            Şifrenizi değiştirdikten sonra yeni şifrenizle giriş yapmanız gerekecektir.
          </Text>
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
    paddingBottom: 40,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
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
    marginTop: 24,
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
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  passwordButton: {
    backgroundColor: '#ef4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
});
