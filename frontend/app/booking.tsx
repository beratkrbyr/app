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
  Modal,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { useCustomer } from '../contexts/CustomerContext';
import { useNotification } from '../contexts/NotificationContext';

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
}

export default function BookingScreen() {
  const router = useRouter();
  const { serviceId, serviceName, servicePrice } = useLocalSearchParams();
  const { customer, isAuthenticated, updateAddress } = useCustomer();
  
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [saveAddress, setSaveAddress] = useState(true);
  
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [markedDates, setMarkedDates] = useState<any>({});
  const [timeSlots, setTimeSlots] = useState<TimeSlotInfo[]>([]);
  const [loadingDates, setLoadingDates] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Validation errors
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  // 30 günlük tarih aralığı için max date
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 30);
  const maxDateStr = maxDate.toISOString().split('T')[0];

  // Kullanıcı bilgilerini otomatik doldur
  useEffect(() => {
    if (isAuthenticated && customer) {
      setCustomerName(customer.name || '');
      setCustomerPhone(customer.phone || '');
      if (customer.address) {
        setCustomerAddress(customer.address);
      }
    }
  }, [isAuthenticated, customer]);

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
        `${BACKEND_URL}/api/availability?year=${currentMonth.getFullYear()}&month=${currentMonth.getMonth() + 1}`
      );
      const data = await response.json();
      
      const nextMonth = new Date(currentMonth);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const response2 = await fetch(
        `${BACKEND_URL}/api/availability?year=${nextMonth.getFullYear()}&month=${nextMonth.getMonth() + 1}`
      );
      const data2 = await response2.json();
      
      const allDates = [...(data.dates || []), ...(data2.dates || [])];
      const available = allDates
        .filter((d: any) => d.available)
        .map((d: any) => d.date);
      setAvailableDates(available);
      
      const marked: any = {};
      const today = new Date().toISOString().split('T')[0];
      available.forEach((dateStr: string) => {
        if (dateStr >= today && dateStr <= maxDateStr) {
          marked[dateStr] = {
            marked: true,
            dotColor: '#10b981',
          };
        }
      });
      setMarkedDates(marked);
    } catch (error) {
      console.error('Error fetching availability:', error);
    } finally {
      setLoadingDates(false);
    }
  };

  const fetchTimeSlots = async () => {
    setLoadingSlots(true);
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/availability/slots?date=${selectedDate}`
      );
      const data = await response.json();
      
      const allSlots = data.all_slots || [];
      const bookedSlots = data.booked_slots || [];
      
      const slots: TimeSlotInfo[] = allSlots.map((time: string) => ({
        time,
        available: !bookedSlots.includes(time),
      }));
      
      setTimeSlots(slots);
      setSelectedTime('');
    } catch (error) {
      console.error('Error fetching time slots:', error);
    } finally {
      setLoadingSlots(false);
    }
  };

  const calculateDiscount = () => {
    if (!selectedDate) return 0;
    const price = parseFloat(servicePrice as string);
    const dateObj = new Date(selectedDate);
    const dayOfWeek = dateObj.getDay();
    if (dayOfWeek === 5) {
      return price * 0.1;
    }
    return 0;
  };

  const calculateTotal = () => {
    const price = parseFloat(servicePrice as string);
    return price - calculateDiscount();
  };

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
    
    if (!customerName.trim()) {
      newErrors.customerName = 'Ad Soyad zorunludur';
    }
    
    if (!customerPhone.trim()) {
      newErrors.customerPhone = 'Telefon numarası zorunludur';
    } else if (customerPhone.length < 10) {
      newErrors.customerPhone = 'Geçerli bir telefon numarası girin';
    }
    
    if (!customerAddress.trim()) {
      newErrors.customerAddress = 'Adres zorunludur';
    }
    
    if (!selectedDate) {
      newErrors.selectedDate = 'Tarih seçmeniz zorunludur';
    }
    
    if (!selectedTime) {
      newErrors.selectedTime = 'Saat seçmeniz zorunludur';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      showAlert('Eksik Bilgi', 'Lütfen tüm zorunlu alanları doldurun.');
      return;
    }

    setSubmitting(true);
    try {
      // Adresi kaydet seçiliyse ve adres değiştiyse güncelle
      if (saveAddress && customer && customerAddress !== customer.address) {
        await updateAddress(customerAddress);
      }

      const booking = {
        service_id: serviceId as string,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_address: customerAddress,
        booking_date: selectedDate,
        booking_time: selectedTime,
        payment_method: 'cash', // Sadece nakit ödeme
      };

      const response = await fetch(`${BACKEND_URL}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(booking),
      });

      if (response.ok) {
        router.replace('/booking-success');
      } else {
        const error = await response.json();
        showAlert('Hata', error.detail || 'Randevu oluşturulamadı.');
      }
    } catch (error) {
      console.error('Error creating booking:', error);
      showAlert('Hata', 'Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setSubmitting(false);
    }
  };

  const onDayPress = (day: any) => {
    const today = new Date().toISOString().split('T')[0];
    if (availableDates.includes(day.dateString) && day.dateString >= today && day.dateString <= maxDateStr) {
      setSelectedDate(day.dateString);
      setShowCalendarModal(false);
      setErrors({...errors, selectedDate: ''});
    }
  };

  const formatSelectedDate = () => {
    if (!selectedDate) return 'Tarih Seçin';
    return new Date(selectedDate).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      weekday: 'long',
    });
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
            <Text style={styles.sectionTitle}>Tarih Seçin * (30 gün içinde)</Text>
            <TouchableOpacity
              style={[styles.dateButton, errors.selectedDate ? styles.inputError : null]}
              onPress={() => setShowCalendarModal(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="calendar-outline" size={20} color="#2563eb" />
              <Text style={[styles.dateButtonText, !selectedDate && styles.placeholderText]}>
                {formatSelectedDate()}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#6b7280" />
            </TouchableOpacity>
            {errors.selectedDate ? (
              <Text style={styles.errorText}>{errors.selectedDate}</Text>
            ) : null}
          </View>

          {/* Calendar Modal */}
          <Modal
            visible={showCalendarModal}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setShowCalendarModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Tarih Seçin (30 gün)</Text>
                  <TouchableOpacity 
                    onPress={() => setShowCalendarModal(false)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close" size={28} color="#111827" />
                  </TouchableOpacity>
                </View>
                
                <Calendar
                  onDayPress={onDayPress}
                  onMonthChange={(month: any) => {
                    setCurrentMonth(new Date(month.year, month.month - 1));
                  }}
                  markedDates={{
                    ...markedDates,
                    [selectedDate]: {
                      ...markedDates[selectedDate],
                      selected: true,
                      selectedColor: '#2563eb',
                    },
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
                  maxDate={maxDateStr}
                />
                
                <View style={styles.calendarLegend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
                    <Text style={styles.legendText}>Müsait</Text>
                  </View>
                </View>
              </View>
            </View>
          </Modal>

          {/* Time Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Saat Seçin *</Text>
            {loadingSlots ? (
              <ActivityIndicator color="#2563eb" />
            ) : selectedDate ? (
              timeSlots.length > 0 ? (
                <>
                  <View style={styles.timeLegend}>
                    <View style={styles.timeLegendItem}>
                      <View style={[styles.timeLegendBox, { backgroundColor: '#d1fae5', borderColor: '#10b981' }]} />
                      <Text style={styles.timeLegendText}>Müsait</Text>
                    </View>
                    <View style={styles.timeLegendItem}>
                      <View style={[styles.timeLegendBox, { backgroundColor: '#fee2e2', borderColor: '#ef4444' }]} />
                      <Text style={styles.timeLegendText}>Dolu</Text>
                    </View>
                  </View>
                  <View style={styles.timeGrid}>
                    {timeSlots.map((slot) => (
                      <TouchableOpacity
                        key={slot.time}
                        style={[
                          styles.timeSlot,
                          slot.available 
                            ? (selectedTime === slot.time ? styles.timeSlotSelected : styles.timeSlotAvailable)
                            : styles.timeSlotBooked,
                        ]}
                        onPress={() => {
                          if (slot.available) {
                            setSelectedTime(slot.time);
                            setErrors({...errors, selectedTime: ''});
                          }
                        }}
                        disabled={!slot.available}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.timeSlotText,
                            slot.available
                              ? (selectedTime === slot.time ? styles.timeSlotTextSelected : styles.timeSlotTextAvailable)
                              : styles.timeSlotTextBooked,
                          ]}
                        >
                          {slot.time}
                        </Text>
                        {!slot.available && (
                          <Ionicons name="lock-closed" size={14} color="#991b1b" />
                        )}
                        {slot.available && selectedTime === slot.time && (
                          <Ionicons name="checkmark-circle" size={14} color="#ffffff" />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              ) : (
                <Text style={styles.noSlotsText}>
                  Bu tarih için müsait saat bulunmamaktadır.
                </Text>
              )
            ) : (
              <Text style={styles.noSlotsText}>
                Önce bir tarih seçin.
              </Text>
            )}
            {errors.selectedTime ? (
              <Text style={styles.errorText}>{errors.selectedTime}</Text>
            ) : null}
          </View>

          {/* Customer Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>İletişim Bilgileri</Text>
            
            {isAuthenticated && (
              <View style={styles.autoFillInfo}>
                <Ionicons name="checkmark-circle" size={18} color="#10b981" />
                <Text style={styles.autoFillText}>Bilgileriniz hesabınızdan alındı</Text>
              </View>
            )}
            
            <View style={[styles.inputContainer, errors.customerName ? styles.inputError : null]}>
              <Ionicons name="person-outline" size={20} color="#6b7280" />
              <TextInput
                style={styles.input}
                placeholder="Adınız Soyadınız *"
                value={customerName}
                onChangeText={(text) => {
                  setCustomerName(text);
                  if (text.trim()) setErrors({...errors, customerName: ''});
                }}
                placeholderTextColor="#9ca3af"
                editable={!isAuthenticated}
              />
            </View>
            {errors.customerName ? (
              <Text style={styles.errorText}>{errors.customerName}</Text>
            ) : null}
            
            <View style={[styles.inputContainer, errors.customerPhone ? styles.inputError : null]}>
              <Ionicons name="call-outline" size={20} color="#6b7280" />
              <TextInput
                style={styles.input}
                placeholder="Telefon Numaranız *"
                value={customerPhone}
                onChangeText={(text) => {
                  setCustomerPhone(text);
                  if (text.trim()) setErrors({...errors, customerPhone: ''});
                }}
                keyboardType="phone-pad"
                placeholderTextColor="#9ca3af"
                editable={!isAuthenticated}
              />
            </View>
            {errors.customerPhone ? (
              <Text style={styles.errorText}>{errors.customerPhone}</Text>
            ) : null}
            
            <View style={[styles.inputContainer, styles.addressInput, errors.customerAddress ? styles.inputError : null]}>
              <Ionicons name="location-outline" size={20} color="#6b7280" style={{ alignSelf: 'flex-start', marginTop: 14 }} />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Adresiniz *"
                value={customerAddress}
                onChangeText={(text) => {
                  setCustomerAddress(text);
                  if (text.trim()) setErrors({...errors, customerAddress: ''});
                }}
                multiline
                numberOfLines={3}
                placeholderTextColor="#9ca3af"
              />
            </View>
            {errors.customerAddress ? (
              <Text style={styles.errorText}>{errors.customerAddress}</Text>
            ) : null}

            {/* Adresi Kaydet Toggle */}
            {isAuthenticated && (
              <View style={styles.saveAddressRow}>
                <Text style={styles.saveAddressText}>Bu adresi kaydet</Text>
                <Switch
                  value={saveAddress}
                  onValueChange={setSaveAddress}
                  trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
                  thumbColor={saveAddress ? '#2563eb' : '#f4f4f5'}
                />
              </View>
            )}
          </View>

          {/* Payment Info */}
          <View style={styles.paymentInfo}>
            <Ionicons name="cash-outline" size={24} color="#10b981" />
            <View style={styles.paymentInfoContent}>
              <Text style={styles.paymentInfoTitle}>Nakit Ödeme</Text>
              <Text style={styles.paymentInfoText}>Ödeme hizmet sonrasında nakit olarak alınacaktır</Text>
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
            activeOpacity={0.7}
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
  autoFillInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  autoFillText: {
    fontSize: 14,
    color: '#065f46',
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
  placeholderText: {
    color: '#9ca3af',
  },
  timeLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  timeLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeLegendBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
  },
  timeLegendText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  timeSlot: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeSlotAvailable: {
    backgroundColor: '#d1fae5',
    borderColor: '#10b981',
  },
  timeSlotBooked: {
    backgroundColor: '#fee2e2',
    borderColor: '#ef4444',
    opacity: 0.7,
  },
  timeSlotSelected: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  timeSlotText: {
    fontSize: 16,
    fontWeight: '600',
  },
  timeSlotTextAvailable: {
    color: '#065f46',
  },
  timeSlotTextBooked: {
    color: '#991b1b',
  },
  timeSlotTextSelected: {
    color: '#ffffff',
  },
  noSlotsText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
    borderRadius: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 4,
    gap: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  addressInput: {
    alignItems: 'flex-start',
  },
  inputError: {
    borderColor: '#ef4444',
    borderWidth: 2,
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
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 8,
    marginLeft: 4,
  },
  saveAddressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  saveAddressText: {
    fontSize: 16,
    color: '#374151',
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
  },
  paymentInfoContent: {
    flex: 1,
  },
  paymentInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#065f46',
    marginBottom: 4,
  },
  paymentInfoText: {
    fontSize: 14,
    color: '#047857',
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
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  calendarLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 14,
    color: '#6b7280',
  },
});
