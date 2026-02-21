# Temizlik Şirketi Randevu Uygulaması - PRD

## Proje Özeti
TİTAN 360 - Temizlik şirketi müşterileri için profesyonel randevu rezervasyon sistemi. React Native (Expo) frontend ve FastAPI/MongoDB backend.

## Tamamlanan Özellikler

### Müşteri Tarafı
- [x] Müşteri kaydı (telefon + isim + email)
- [x] Müşteri girişi (kayıtlı telefon ile)
- [x] **Kayıt olmadan giriş engellemesi** - Tabs layout auth kontrolü
- [x] Çıkış yapma
- [x] Hizmet listesi görüntüleme
- [x] Randevu oluşturma (tarih ve saat seçimi)
- [x] **Randevu sırasında fotoğraf yükleme** - Temizlenecek alanın fotoğrafını ekleyebilir (max 3 adet)
- [x] Türkçe takvim desteği
- [x] 30 günlük müsait tarih görüntüleme
- [x] Dolu saatlerin görüntülenmesi
- [x] Randevu iptal etme
- [x] Cuma günü %10 indirim
- [x] Müşteri yorumları & puanlama
- [x] Sadakat programı (puan sistemi)
- [x] Referans sistemi (arkadaşını getir)
- [x] Profil sayfasında puan ve referans kodu
- [x] **Adres kaydetme** - "Bu adresi kaydet" toggle
- [x] **Adres auto-fill** - Kaydedilen adres sonraki randevuda otomatik gelir
- [x] **Sadece nakit ödeme** - Online ödeme kaldırıldı

### Admin Paneli
- [x] Admin girişi (admin/admin123)
- [x] **Şifre Değiştirme** - Ayarlar sayfasında admin şifresi değiştirebilir
- [x] **Özel İndirimler** - Yeni indirim ekleme, aktif/pasif yapma, silme
- [x] **Dashboard** - Gelişmiş istatistikler
  - Toplam gelir
  - Randevu sayıları (bekleyen, onaylı, tamamlanan)
  - Müşteri sayısı
  - Değerlendirme sayısı
- [x] **Randevu Yönetimi** - Onaylama/reddetme
- [x] **Randevu Detay** - Müşteri fotoğraflarını görüntüleme
- [x] **Hizmet Yönetimi** - Ekleme/düzenleme/silme
- [x] **Müşteri Yönetimi** - Müşteri listesi, puan bakiyesi, referans kodları
- [x] **Değerlendirme Yönetimi** - Yorumlar ve puanlama istatistikleri
- [x] **Paket Yönetimi** - Haftalık/aylık paket oluşturma
- [x] **Takvim Yönetimi** - Müsaitlik ayarlama (tarih seçimi + saat seçimi düzeltildi)
- [x] **Ayarlar** - İndirim oranları, özel indirimler ve şifre değiştirme

## API Endpoints

### Müşteri
- POST /api/customers/register
- POST /api/customers/login
- GET /api/customers/profile

### Referans
- POST /api/referral/use

### Değerlendirme
- POST /api/reviews
- GET /api/reviews
- GET /api/reviews/stats

### Paketler
- GET /api/packages
- POST /api/packages/subscribe
- GET /api/packages/my-subscriptions

### Randevu
- GET /api/services
- GET /api/availability
- GET /api/availability/slots
- POST /api/bookings (artık customer_photos destekliyor)
- PUT /api/bookings/{id}/cancel
- GET /api/bookings/check

### Admin
- POST /api/admin/login
- GET /api/admin/stats
- GET /api/admin/customers
- GET /api/admin/reviews
- GET/POST /api/admin/packages
- CRUD /api/admin/services
- CRUD /api/admin/bookings
- GET/POST /api/admin/availability
- **GET /api/admin/availability/date** - Yeni: Tek tarih için müsaitlik
- GET/PUT /api/admin/settings
- **PUT /api/admin/change-password** - Yeni: Admin şifre değiştirme

## Teknik Mimari

### Frontend
- React Native (Expo)
- Expo Router
- AsyncStorage
- react-native-calendars
- @react-native-picker/picker
- expo-image-picker (müşteri fotoğraf yükleme için)
- expo-notifications

### Backend
- FastAPI
- MongoDB (motor async)
- JWT auth
- bcrypt

## Güncellemeler

### 21 Şubat 2026
- ✅ Takvim müsaitlik seçimi düzeltildi - her tarih seçildiğinde saat seçenekleri görünüyor
- ✅ Özel indirimler özelliği eklendi - admin yeni indirimler ekleyebilir, aktif/pasif yapabilir
- ✅ Platform.OS web kontrolleri eklendi (Alert.alert yerine window.alert)
- ✅ Tabs layout auth kontrolü eklendi - giriş yapılmadan önce sadece login sayfası görünür
- ✅ Müşteri fotoğraf yükleme özelliği eklendi - randevu sırasında 3 fotoğraf yüklenebilir
- ✅ Admin şifre değiştirme özelliği eklendi
- ✅ Admin müşteri fotoğrafları görüntüleme özelliği eklendi

## Son Test Raporu
- Takvim: Tarih seçimi ve saat seçimi çalışıyor ✅
- Ayarlar: İndirim ayarları, özel indirimler ve şifre değiştirme çalışıyor ✅
- Test dosyası: /app/test_reports/iteration_5.json

## Yapılacaklar

### P1 - Yüksek Öncelik
- [x] **Push Bildirimleri** - Expo Notifications entegrasyonu
- [x] **Fotoğraflı İş Takibi** - Admin panelden öncesi/sonrası fotoğraf
- [x] **Canlı Konum Takibi** - Manuel durum güncelleme
- [ ] WhatsApp bildirimi (Twilio API key gerekli)
- [ ] **iOS Build** - Android APK sonrası iOS için de build

### P2 - Orta Öncelik
- [x] **Yorumlar sistemi** - Tamamlanmış randevular için yorum/puan
- [x] **Sadakat puanları** - Randevu, yorum, referans ile puan
- [x] **Referans sistemi** - Arkadaşını getir, 50 puan
- [ ] Google Play Store'a yükleme

### P3 - Düşük Öncelik
- [ ] Dış cephe temizlik hizmeti ekleme
- [ ] SMS bildirimleri
- [ ] server.py modüler refactoring

## Admin Giriş Bilgileri
- URL: /admin-login
- Kullanıcı: admin
- Şifre: admin123
