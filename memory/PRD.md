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
- [x] **Randevu sırasında fotoğraf yükleme** - Temizlenecek alanın fotoğrafını ekleyebilir (3 adet max)
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
- [x] **Takvim Yönetimi** - Müsaitlik ayarlama
- [x] **Ayarlar** - İndirim oranları ve şifre değiştirme

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
- CRUD /api/admin/availability
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

### 18 Şubat 2026
- ✅ Kayıt zorunluluğu eklendi
- ✅ Müşteri yorumları sistemi
- ✅ Sadakat puanları sistemi
- ✅ Referans sistemi
- ✅ Admin paneline müşteri yönetimi
- ✅ Admin paneline değerlendirme yönetimi
- ✅ Admin paneline paket yönetimi
- ✅ Dashboard gelişmiş istatistikler
- ✅ **Tabs layout auth kontrolü** - Giriş yapılmadan önce sadece login sayfası görünür
- ✅ **Müşteri fotoğraf yükleme** - Randevu sırasında temizlenecek alanın fotoğrafı eklenebilir
- ✅ **Admin şifre değiştirme** - Ayarlar sayfasında şifre değiştirebilir
- ✅ **Admin müşteri fotoğrafları** - Randevu detayında müşteri fotoğrafları görüntülenebilir

## Son Test Raporu (Şubat 2026 - iteration 5)
- Backend: 13/13 test BAŞARILI (%100)
- Frontend: Tüm UI bileşenleri doğrulandı
- Test dosyası: /app/test_reports/iteration_5.json
- Tüm yeni özellikler çalışıyor:
  - Auth kontrolü ✅
  - Müşteri fotoğraf yükleme ✅
  - Admin şifre değiştirme ✅
  - Müşteri fotoğrafları görüntüleme ✅

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
