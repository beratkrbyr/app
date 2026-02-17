import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// Türkçe takvim ayarları
LocaleConfig.locales['tr'] = {
  monthNames: [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ],
  monthNamesShort: [
    'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz',
    'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'
  ],
  dayNames: [
    'Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'
  ],
  dayNamesShort: ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'],
  today: 'Bugün'
};
LocaleConfig.defaultLocale = 'tr';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface TimeSlotInfo {
  time: string;
  available: boolean;
  booked: boolean;
}

export default function CustomerCalendarScreen() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState('');
  const [markedDates, setMarkedDates] = useState<any>({});
  const [timeSlots, setTimeSlots] = useState<TimeSlotInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    fetchAvailability();
  }, [currentMonth]);

  useEffect(() => {
    if (selectedDate) {
      fetchTimeSlots();
    }
  }, [selectedDate]);

  const fetchAvailability = async () => {
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/availability?year=${currentMonth.getFullYear()}&month=${
          currentMonth.getMonth() + 1
        }`
      );
      const data = await response.json();
      
      const marked: any = {};
      const today = new Date().toISOString().split('T')[0];
      
      data.dates.forEach((item: any) => {
        if (item.available && item.date >= today) {
          marked[item.date] = {
            marked: true,
            dotColor: '#10b981',
            selected: false,
          };
        }
      });
      
      setMarkedDates(marked);
    } catch (error) {
      console.error('Error fetching availability:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchTimeSlots = async () => {
    setLoadingSlots(true);
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/availability/slots?date=${selectedDate}`
      );
      const data = await response.json();
      
      // Get all time slots from availability
      const availabilityResponse = await fetch(
        `${BACKEND_URL}/api/availability?year=${new Date(selectedDate).getFullYear()}&month=${
          new Date(selectedDate).getMonth() + 1
        }`
      );
      const availabilityData = await availabilityResponse.json();
      const dateInfo = availabilityData.dates.find((d: any) => d.date === selectedDate);
      
      if (dateInfo && dateInfo.available) {
        // Create time slot info with availability status
        const allSlots: TimeSlotInfo[] = [
          '09:00', '10:00', '11:00', '12:00', '13:00', 
          '14:00', '15:00', '16:00', '17:00', '18:00'
        ].map(time => ({
          time,
          available: data.slots.includes(time),
          booked: !data.slots.includes(time),
        }));
        
        setTimeSlots(allSlots);
      } else {
        setTimeSlots([]);
      }
    } catch (error) {
      console.error('Error fetching time slots:', error);
    } finally {
      setLoadingSlots(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAvailability();
  };

  const handleDayPress = (day: any) => {
    if (markedDates[day.dateString]) {
      setSelectedDate(day.dateString);
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
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Randevu Takvimi</Text>
          <Text style={styles.headerSubtitle}>
            Müsait günleri görmek için takvime göz atın
          </Text>
        </View>

        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
            <Text style={styles.legendText}>Müsait Günler</Text>
          </View>
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
            monthTextColor: '#111827',
            textDayFontSize: 16,
            textMonthFontSize: 18,
            textDayHeaderFontSize: 14,
          }}
          minDate={new Date().toISOString().split('T')[0]}
        />

        {selectedDate && (
          <View style={styles.slotsSection}>
            <Text style={styles.slotsTitle}>
              {new Date(selectedDate).toLocaleDateString('tr-TR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                weekday: 'long',
              })}
            </Text>

            {loadingSlots ? (
              <ActivityIndicator color="#2563eb" style={{ marginTop: 20 }} />
            ) : timeSlots.length > 0 ? (
              <>
                <View style={styles.slotLegend}>
                  <View style={styles.slotLegendItem}>
                    <View style={[styles.slotLegendBox, { backgroundColor: '#10b981' }]} />
                    <Text style={styles.slotLegendText}>Müsait</Text>
                  </View>
                  <View style={styles.slotLegendItem}>
                    <View style={[styles.slotLegendBox, { backgroundColor: '#ef4444' }]} />
                    <Text style={styles.slotLegendText}>Dolu</Text>
                  </View>
                </View>

                <View style={styles.timeGrid}>
                  {timeSlots.map((slot) => (
                    <TouchableOpacity
                      key={slot.time}
                      style={[
                        styles.timeSlot,
                        {
                          backgroundColor: slot.available
                            ? '#d1fae5'
                            : '#fee2e2',
                          borderColor: slot.available ? '#10b981' : '#ef4444',
                        },
                      ]}
                      disabled={!slot.available}
                      onPress={() => {
                        // Navigate to services to start booking
                        router.push('/(tabs)');
                      }}
                    >
                      <Text
                        style={[
                          styles.timeSlotText,
                          {
                            color: slot.available ? '#065f46' : '#991b1b',
                          },
                        ]}
                      >
                        {slot.time}
                      </Text>
                      {slot.booked && (
                        <Ionicons name="lock-closed" size={16} color="#991b1b" />
                      )}
                      {slot.available && (
                        <Ionicons name="checkmark-circle" size={16} color="#065f46" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>

                {timeSlots.some((s) => s.available) && (
                  <TouchableOpacity
                    style={styles.bookButton}
                    onPress={() => router.push('/(tabs)')}
                  >
                    <Ionicons name="calendar" size={20} color="#ffffff" />
                    <Text style={styles.bookButtonText}>
                      Randevu Almak İçin Hizmetlere Git
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <View style={styles.noSlotsContainer}>
                <Ionicons name="close-circle-outline" size={48} color="#9ca3af" />
                <Text style={styles.noSlotsText}>
                  Bu tarih için müsait saat bulunmamaktadır
                </Text>
              </View>
            )}
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
    paddingBottom: 32,
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
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#dbeafe',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 14,
    color: '#6b7280',
  },
  slotsSection: {
    padding: 16,
    backgroundColor: '#ffffff',
    margin: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  slotsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  slotLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 16,
  },
  slotLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  slotLegendBox: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  slotLegendText: {
    fontSize: 14,
    color: '#6b7280',
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  timeSlot: {
    width: '30%',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  timeSlotText: {
    fontSize: 16,
    fontWeight: '600',
  },
  bookButton: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
    gap: 8,
  },
  bookButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  noSlotsContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noSlotsText: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 12,
    textAlign: 'center',
  },
});
