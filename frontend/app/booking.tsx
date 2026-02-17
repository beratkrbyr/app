import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { scheduleBookingNotification, sendImmediateNotification } from '../../utils/notificationService';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function BookingScreen() {
  const router = useRouter();
  const { serviceId, serviceName, servicePrice } = useLocalSearchParams();
  
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'cash'>('cash');
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  const [loadingDates, setLoadingDates] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAvailability();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      fetchTimeSlots();
    }
  }, [selectedDate]);

  const fetchAvailability = async () => {
    try {
      const now = new Date();
      const response = await fetch(
        `${BACKEND_URL}/api/availability?year=${now.getFullYear()}&month=${now.getMonth() + 1}`
      );
      const data = await response.json();
      const available = data.dates
        .filter((d: any) => d.available)
        .map((d: any) => d.date);
      setAvailableDates(available);
    } catch (error) {
      console.error('Error fetching availability:', error);
    } finally {
      setLoadingDates(false);
    }
  };

  const fetchTimeSlots = async () => {
    setLoadingSlots(true);
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const response = await fetch(
        `${BACKEND_URL}/api/availability/slots?date=${dateStr}`
      );
      const data = await response.json();
      setAvailableTimeSlots(data.slots || []);
      setSelectedTime('');
    } catch (error) {
      console.error('Error fetching time slots:', error);
    } finally {
      setLoadingSlots(false);
    }
  };

  const isDateAvailable = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return availableDates.includes(dateStr);
  };

  const calculateDiscount = () => {
    const price = parseFloat(servicePrice as string);
    const dayOfWeek = selectedDate.getDay();
    if (dayOfWeek === 5) { // Friday
      return price * 0.1;
    }
    return 0;
  };

  const calculateTotal = () => {
    const price = parseFloat(servicePrice as string);
    return price - calculateDiscount();
  };

  const handleSubmit = async () => {
    if (!customerName.trim() || !customerPhone.trim() || !customerAddress.trim()) {
      Alert.alert('Eksik Bilgi', 'Lütfen tüm alanları doldurun.');
      return;
    }

    if (!selectedTime) {
      Alert.alert('Saat Seçin', 'Lütfen bir saat dilimi seçin.');
      return;
    }

    setSubmitting(true);
    try {
      const booking = {
        service_id: serviceId as string,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_address: customerAddress,
        booking_date: selectedDate.toISOString().split('T')[0],
        booking_time: selectedTime,
        payment_method: paymentMethod,
      };

      const response = await fetch(`${BACKEND_URL}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(booking),
      });

      if (response.ok) {
        const result = await response.json();
        
        // Schedule reminder notification (1 hour before)
        await scheduleBookingNotification(
          result.id,
          serviceName as string,
          booking.booking_date,
          booking.booking_time
        );
        
        // Send immediate confirmation
        await sendImmediateNotification(
          'Randevu Oluşturuldu! ✅',
          `${serviceName} randevunuz ${booking.booking_date} tarihinde ${booking.booking_time} saatine kaydedildi.`,
          { bookingId: result.id, type: 'confirmation' }
        );
        
        router.replace('/booking-success');
      } else {
        const error = await response.json();
        Alert.alert('Hata', error.detail || 'Randevu oluşturulamadı.');
      }
    } catch (error) {
      console.error('Error creating booking:', error);
      Alert.alert('Hata', 'Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setSubmitting(false);
    }
  };

  const onDateChange = (event: any, date?: Date) => {
    setShowDatePicker(false);
    if (date && isDateAvailable(date)) {
      setSelectedDate(date);
    } else if (date) {
      Alert.alert('Uygun Değil', 'Bu tarih için randevu alınamaz.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.serviceInfo}>
            <Text style={styles.serviceName}>{serviceName}</Text>
            <Text style={styles.servicePrice}>₺{parseFloat(servicePrice as string).toFixed(2)}</Text>
          </View>

          {/* Date Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tarih Seçin</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={20} color="#2563eb" />
              <Text style={styles.dateButtonText}>
                {selectedDate.toLocaleDateString('tr-TR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  weekday: 'long',
                })}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="default"
                onChange={onDateChange}
                minimumDate={new Date()}
              />
            )}
          </View>

          {/* Time Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Saat Seçin</Text>
            {loadingSlots ? (
              <ActivityIndicator color="#2563eb" />
            ) : availableTimeSlots.length > 0 ? (
              <View style={styles.timeGrid}>
                {availableTimeSlots.map((time) => (
                  <TouchableOpacity
                    key={time}
                    style={[
                      styles.timeSlot,
                      selectedTime === time && styles.timeSlotSelected,
                    ]}
                    onPress={() => setSelectedTime(time)}
                  >
                    <Text
                      style={[
                        styles.timeSlotText,
                        selectedTime === time && styles.timeSlotTextSelected,
                      ]}
                    >
                      {time}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <Text style={styles.noSlotsText}>
                Bu tarih için müsait saat bulunmamaktadır.
              </Text>
            )}
          </View>

          {/* Customer Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>İletişim Bilgileri</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color="#6b7280" />
              <TextInput
                style={styles.input}
                placeholder="Adınız Soyadınız"
                value={customerName}
                onChangeText={setCustomerName}
                placeholderTextColor="#9ca3af"
              />
            </View>
            <View style={styles.inputContainer}>
              <Ionicons name="call-outline" size={20} color="#6b7280" />
              <TextInput
                style={styles.input}
                placeholder="Telefon Numaranız"
                value={customerPhone}
                onChangeText={setCustomerPhone}
                keyboardType="phone-pad"
                placeholderTextColor="#9ca3af"
              />
            </View>
            <View style={styles.inputContainer}>
              <Ionicons name="location-outline" size={20} color="#6b7280" />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Adresiniz"
                value={customerAddress}
                onChangeText={setCustomerAddress}
                multiline
                numberOfLines={3}
                placeholderTextColor="#9ca3af"
              />
            </View>
          </View>

          {/* Payment Method */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ödeme Yöntemi</Text>
            <View style={styles.paymentOptions}>
              <TouchableOpacity
                style={[
                  styles.paymentOption,
                  paymentMethod === 'cash' && styles.paymentOptionSelected,
                ]}
                onPress={() => setPaymentMethod('cash')}
              >
                <Ionicons
                  name="cash-outline"
                  size={24}
                  color={paymentMethod === 'cash' ? '#2563eb' : '#6b7280'}
                />
                <Text
                  style={[
                    styles.paymentOptionText,
                    paymentMethod === 'cash' && styles.paymentOptionTextSelected,
                  ]}
                >
                  Nakit
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.paymentOption,
                  paymentMethod === 'online' && styles.paymentOptionSelected,
                ]}
                onPress={() => setPaymentMethod('online')}
              >
                <Ionicons
                  name="card-outline"
                  size={24}
                  color={paymentMethod === 'online' ? '#2563eb' : '#6b7280'}
                />
                <Text
                  style={[
                    styles.paymentOptionText,
                    paymentMethod === 'online' && styles.paymentOptionTextSelected,
                  ]}
                >
                  Online
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Price Summary */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Hizmet Ücreti:</Text>
              <Text style={styles.summaryValue}>₺{parseFloat(servicePrice as string).toFixed(2)}</Text>
            </View>
            {calculateDiscount() > 0 && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, styles.discountLabel]}>
                  Cuma İndirimi (%10):
                </Text>
                <Text style={[styles.summaryValue, styles.discountValue]}>
                  -₺{calculateDiscount().toFixed(2)}
                </Text>
              </View>
            )}
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryTotal}>Toplam:</Text>
              <Text style={styles.summaryTotalValue}>₺{calculateTotal().toFixed(2)}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Text style={styles.submitButtonText}>Randevuyu Onayla</Text>
                <Ionicons name="checkmark-circle" size={24} color="#ffffff" />
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  serviceInfo: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  serviceName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  servicePrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#111827',
    flex: 1,
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
  noSlotsText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    padding: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#111827',
  },
  textArea: {
    height: 80,
    paddingTop: 12,
    paddingBottom: 12,
    textAlignVertical: 'top',
  },
  paymentOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  paymentOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  paymentOptionSelected: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  paymentOptionText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  paymentOptionTextSelected: {
    color: '#2563eb',
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  summaryValue: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  discountLabel: {
    color: '#10b981',
  },
  discountValue: {
    color: '#10b981',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 12,
  },
  summaryTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  summaryTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  submitButton: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
});
