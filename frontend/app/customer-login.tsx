import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCustomer } from '../contexts/CustomerContext';

export default function CustomerLoginScreen() {
  const router = useRouter();
  const { login, register } = useCustomer();
  const [isLogin, setIsLogin] = useState(false); // Default to register
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleSubmit = async () => {
    setError('');
    
    if (!phone.trim()) {
      setError('Telefon numarası gereklidir.');
      return;
    }

    if (!password.trim()) {
      setError('Şifre gereklidir.');
      return;
    }

    if (!isLogin && !name.trim()) {
      setError('Adınızı giriniz.');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await login(phone, password);
      } else {
        await register(name, phone, password, email || undefined, undefined, referralCode || undefined);
      }
      // Small delay to ensure state is updated before navigation
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 100);
    } catch (err: any) {
      console.error('Login/Register error:', err);
      setError(err.message || 'Bir hata oluştu. Lütfen tekrar deneyin.');
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Ionicons name="person-circle" size={80} color="#3b82f6" />
            <Text style={styles.title}>
              {isLogin ? 'Giriş Yap' : 'Kayıt Ol'}
            </Text>
            <Text style={styles.subtitle}>
              {isLogin
                ? 'Kayıtlı telefon numaranızla giriş yapın'
                : 'Randevu almak için kayıt olun'}
            </Text>
          </View>

          <View style={styles.form}>
            {error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color="#ef4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
            
            {!isLogin && (
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color="#6b7280" />
                <TextInput
                  style={styles.input}
                  placeholder="Adınız Soyadınız *"
                  value={name}
                  onChangeText={setName}
                  placeholderTextColor="#9ca3af"
                />
              </View>
            )}

            <View style={styles.inputContainer}>
              <Ionicons name="call-outline" size={20} color="#6b7280" />
              <TextInput
                style={styles.input}
                placeholder="Telefon Numaranız *"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholderTextColor="#9ca3af"
              />
            </View>

            {!isLogin && (
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color="#6b7280" />
                <TextInput
                  style={styles.input}
                  placeholder="E-posta (Opsiyonel)"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor="#9ca3af"
                />
              </View>
            )}

            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              activeOpacity={0.7}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {isLogin ? 'Giriş Yap' : 'Kayıt Ol'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.switchButton}
              onPress={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.switchButtonText}>
                {isLogin
                  ? 'Hesabınız yok mu? Kayıt olun'
                  : 'Zaten hesabınız var mı? Giriş yapın'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Benefits Section */}
          <View style={styles.benefitsSection}>
            <Text style={styles.benefitsTitle}>Üyelik Avantajları</Text>
            
            <View style={styles.benefitItem}>
              <View style={styles.benefitIcon}>
                <Ionicons name="gift-outline" size={24} color="#2563eb" />
              </View>
              <View style={styles.benefitContent}>
                <Text style={styles.benefitTitle}>Sadakat Puanları</Text>
                <Text style={styles.benefitText}>Her randevuda puan kazanın, indirim yapın</Text>
              </View>
            </View>
            
            <View style={styles.benefitItem}>
              <View style={styles.benefitIcon}>
                <Ionicons name="people-outline" size={24} color="#2563eb" />
              </View>
              <View style={styles.benefitContent}>
                <Text style={styles.benefitTitle}>Arkadaşını Getir</Text>
                <Text style={styles.benefitText}>Referans kodunuzla 50₺ kazanın</Text>
              </View>
            </View>
            
            <View style={styles.benefitItem}>
              <View style={styles.benefitIcon}>
                <Ionicons name="star-outline" size={24} color="#2563eb" />
              </View>
              <View style={styles.benefitContent}>
                <Text style={styles.benefitTitle}>Değerlendirme</Text>
                <Text style={styles.benefitText}>Yorum yaparak 10 puan kazanın</Text>
              </View>
            </View>
          </View>

          <View style={styles.infoCard}>
            <Ionicons name="shield-checkmark" size={24} color="#10b981" />
            <Text style={styles.infoText}>
              Bilgileriniz güvenle saklanır ve üçüncü şahıslarla paylaşılmaz.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#ffffff',
  },
  submitButton: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  switchButton: {
    padding: 12,
    alignItems: 'center',
  },
  switchButtonText: {
    color: '#60a5fa',
    fontSize: 14,
    fontWeight: '500',
  },
  benefitsSection: {
    marginTop: 32,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  benefitsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
    textAlign: 'center',
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  benefitIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  benefitText: {
    fontSize: 14,
    color: '#94a3b8',
  },
  infoCard: {
    backgroundColor: '#1e3a3a',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#6ee7b7',
    lineHeight: 20,
  },
  errorContainer: {
    backgroundColor: '#3f1f1f',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    flex: 1,
  },
});
