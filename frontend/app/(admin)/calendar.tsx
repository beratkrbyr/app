import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const showAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};

const TIME_SLOTS = [
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
];

export default function CalendarScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState('');
  const [markedDates, setMarkedDates] = useState({});
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    fetchAvailability();
  }, [currentMonth]);

  const fetchAvailability = async () => {
    try {
      const token = await AsyncStorage.getItem('admin_token');
      if (!token) {
        router.replace('/admin-login');
        return;
      }

      const response = await fetch(
        `${BACKEND_URL}/api/admin/availability?year=${currentMonth.getFullYear()}&month=${
          currentMonth.getMonth() + 1
        }`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const marked: any = {};
        data.forEach((item: any) => {
          marked[item.date] = {
            marked: true,
            dotColor: item.available ? '#10b981' : '#ef4444',
            selected: false,
          };
        });
        setMarkedDates(marked);
      } else if (response.status === 401) {
        await AsyncStorage.removeItem('admin_token');
        router.replace('/admin-login');
      }
    } catch (error) {
      console.error('Error fetching availability:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDayPress = (day: any) => {
    setSelectedDate(day.dateString);
    // Find existing availability for this date
    const existing = Object.entries(markedDates).find(
      ([date]) => date === day.dateString
    );
    if (existing) {
      // Load existing slots (you'd need to fetch this from backend)
      setAvailableSlots(TIME_SLOTS);
    } else {
      setAvailableSlots([]);
    }
  };

  const toggleTimeSlot = (time: string) => {
    if (availableSlots.includes(time)) {
      setAvailableSlots(availableSlots.filter((t) => t !== time));
    } else {
      setAvailableSlots([...availableSlots, time]);
    }
  };

  const handleSave = async () => {
    if (!selectedDate) {
      Alert.alert('Hata', 'Lütfen bir tarih seçin.');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('admin_token');
      const response = await fetch(`${BACKEND_URL}/api/admin/availability`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: selectedDate,
          available: availableSlots.length > 0,
          time_slots: availableSlots,
        }),
      });

      if (response.ok) {
        Alert.alert('Başarılı', 'Müsaitlik güncellendi.');
        fetchAvailability();
      }
    } catch (error) {
      console.error('Error saving availability:', error);
      Alert.alert('Hata', 'Müsaitlik kaydedilemedi.');
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
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color="#2563eb" />
          <Text style={styles.infoText}>
            Bir tarih seçin ve müsait olduğunuz saatleri işaretleyin.
          </Text>
        </View>

        <Calendar
          onDayPress={handleDayPress}
          markedDates={{
            ...markedDates,
            [selectedDate]: {
              ...markedDates[selectedDate],
              selected: true,
              selectedColor: '#2563eb',
            },
          }}
          onMonthChange={(month: any) => {
            setCurrentMonth(new Date(month.year, month.month - 1));
          }}
          theme={{
            selectedDayBackgroundColor: '#2563eb',
            todayTextColor: '#2563eb',
            dotColor: '#10b981',
            arrowColor: '#2563eb',
          }}
          minDate={new Date().toISOString().split('T')[0]}
        />

        {selectedDate && (
          <View style={styles.timeSection}>
            <Text style={styles.sectionTitle}>
              {new Date(selectedDate).toLocaleDateString('tr-TR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                weekday: 'long',
              })}
            </Text>
            <Text style={styles.sectionSubtitle}>
              Müsait saatleri seçin:
            </Text>

            <View style={styles.timeGrid}>
              {TIME_SLOTS.map((time) => (
                <TouchableOpacity
                  key={time}
                  style={[
                    styles.timeSlot,
                    availableSlots.includes(time) && styles.timeSlotSelected,
                  ]}
                  onPress={() => toggleTimeSlot(time)}
                >
                  <Text
                    style={[
                      styles.timeSlotText,
                      availableSlots.includes(time) && styles.timeSlotTextSelected,
                    ]}
                  >
                    {time}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Ionicons name="checkmark-circle" size={24} color="#ffffff" />
              <Text style={styles.saveButtonText}>Kaydet</Text>
            </TouchableOpacity>
          </View>
        )}
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
  },
  infoCard: {
    backgroundColor: '#eff6ff',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 20,
  },
  timeSection: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  timeSlot: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  timeSlotSelected: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  timeSlotText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  timeSlotTextSelected: {
    color: '#ffffff',
  },
  saveButton: {
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
    gap: 12,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
});
