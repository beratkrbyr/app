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
import { useTheme } from '../../contexts/ThemeContext';

export default function AdminScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.primary }]}>
        <Text style={styles.headerTitle}>Admin Paneli</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.description, { color: theme.textSecondary }]}>
          Admin paneline erişmek için giriş yapmanız gerekmektedir.
        </Text>

        <TouchableOpacity
          style={[styles.loginButton, { backgroundColor: theme.primary }]}
          onPress={() => router.push('/admin-login')}
        >
          <Ionicons name="log-in-outline" size={24} color="#ffffff" />
          <Text style={styles.loginButtonText}>Admin Girişi</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.settingsButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={() => router.push('/user-settings')}
        >
          <Ionicons name={isDark ? "moon" : "sunny"} size={24} color={theme.primary} />
          <Text style={[styles.settingsButtonText, { color: theme.text }]}>Tema Ayarları</Text>
        </TouchableOpacity>

        <View style={[styles.infoCard, { backgroundColor: theme.info + '15' }]}>
          <Ionicons name="information-circle" size={24} color={theme.info} />
          <Text style={[styles.infoText, { color: theme.info }]}>
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
  },
  header: {
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
    marginBottom: 32,
    textAlign: 'center',
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginBottom: 16,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginBottom: 24,
    borderWidth: 1,
  },
  settingsButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  infoCard: {
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});
