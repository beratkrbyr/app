import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import type { ThemeMode } from '../../contexts/ThemeContext';

export default function UserSettingsScreen() {
  const { theme, themeMode, setThemeMode, isDark } = useTheme();

  const themes: { mode: ThemeMode; label: string; icon: string }[] = [
    { mode: 'light', label: 'Açık Tema', icon: 'sunny' },
    { mode: 'dark', label: 'Koyu Tema', icon: 'moon' },
    { mode: 'auto', label: 'Sistem', icon: 'phone-portrait' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.title, { color: theme.text }]}>Görünüm Ayarları</Text>
        
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Tema Seçimi</Text>
          <Text style={[styles.cardDescription, { color: theme.textSecondary }]}>
            Uygulamanın görünümünü tercihlerinize göre ayarlayın
          </Text>

          {themes.map((item) => (
            <TouchableOpacity
              key={item.mode}
              style={[
                styles.themeOption,
                {
                  backgroundColor: themeMode === item.mode ? theme.primary + '15' : 'transparent',
                  borderColor: themeMode === item.mode ? theme.primary : theme.border,
                },
              ]}
              onPress={() => setThemeMode(item.mode)}
            >
              <View style={styles.themeOptionLeft}>
                <Ionicons
                  name={item.icon as any}
                  size={24}
                  color={themeMode === item.mode ? theme.primary : theme.textSecondary}
                />
                <Text
                  style={[
                    styles.themeOptionText,
                    {
                      color: themeMode === item.mode ? theme.primary : theme.text,
                      fontWeight: themeMode === item.mode ? '600' : '400',
                    },
                  ]}
                >
                  {item.label}
                </Text>
              </View>
              {themeMode === item.mode && (
                <Ionicons name="checkmark-circle" size={24} color={theme.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.infoCard, { backgroundColor: theme.info + '15', borderColor: theme.info + '30' }]}>
          <Ionicons name="information-circle" size={24} color={theme.info} />
          <Text style={[styles.infoText, { color: theme.info }]}>
            {themeMode === 'auto'
              ? 'Tema, cihazınızın sistem ayarlarına göre otomatik değişecek'
              : themeMode === 'dark'
              ? 'Koyu tema gözlerinizi yorar ve pil tasarrufu sağlar'
              : 'Açık tema daha iyi okunabilirlik sağlar'}
          </Text>
        </View>

        <View style={[styles.previewCard, { backgroundColor: theme.surface }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Önizleme</Text>
          <View style={[styles.previewContent, { backgroundColor: theme.background }]}>
            <View style={styles.previewItem}>
              <View style={[styles.previewIcon, { backgroundColor: theme.primary }]}>
                <Ionicons name="sparkles" size={24} color="#fff" />
              </View>
              <View>
                <Text style={[styles.previewTitle, { color: theme.text }]}>
                  Hizmet Adı
                </Text>
                <Text style={[styles.previewSubtitle, { color: theme.textSecondary }]}>
                  Hizmet açıklaması
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.previewButton, { backgroundColor: theme.primary }]}
            >
              <Text style={styles.previewButtonText}>Randevu Al</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  card: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 12,
  },
  themeOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  themeOptionText: {
    fontSize: 16,
  },
  infoCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  previewCard: {
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  previewContent: {
    borderRadius: 8,
    padding: 16,
    marginTop: 12,
  },
  previewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  previewIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  previewSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  previewButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  previewButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
