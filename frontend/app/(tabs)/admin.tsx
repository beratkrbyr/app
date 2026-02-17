import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function AdminScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Paneli</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.description}>
          Admin paneline erişmek için giriş yapmanız gerekmektedir.
        </Text>

        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => router.push('/admin-login')}
        >
          <Ionicons name="log-in-outline" size={24} color="#ffffff" />
          <Text style={styles.loginButtonText}>Admin Girişi</Text>
        </TouchableOpacity>

        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color="#2563eb" />
          <Text style={styles.infoText}>
            Admin olarak giriş yaptıktan sonra randevuları yönetebilir,
            hizmetleri düzenleyebilir ve müsait günleri ayarlayabilirsiniz.
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
  header: {
    backgroundColor: '#2563eb',
    padding: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  content: {
    padding: 24,
  },
  description: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 32,
    textAlign: 'center',
  },
  loginButton: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginBottom: 24,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#eff6ff',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 20,
  },
});
