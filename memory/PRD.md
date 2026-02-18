# Temizlik Şirketi Randevu Uygulaması - PRD

## Proje Özeti
Temizlik şirketi müşterileri için profesyonel randevu rezervasyon sistemi. React Native (Expo) frontend ve FastAPI/MongoDB backend.

## Tamamlanan Özellikler

### Müşteri Tarafı
- [x] Müşteri kaydı (telefon + isim + email)
- [x] Müşteri girişi (kayıtlı telefon ile)
- [x] **Kayıt olmadan giriş engellemesi**
- [x] Çıkış yapma
- [x] Hizmet listesi görüntüleme
- [x] Randevu oluşturma (tarih ve saat seçimi)
- [x] Türkçe takvim desteği
- [x] 30 günlük müsait tarih görüntüleme
- [x] Dolu saatlerin görüntülenmesi
- [x] Randevu iptal etme
- [x] Cuma günü %10 indirim
- [x] ⭐ Müşteri yorumları & puanlama
- [x] 🎁 Sadakat programı (puan sistemi)
- [x] 👥 Referans sistemi (arkadaşını getir)
- [x] Profil sayfasında puan ve referans kodu
- [x] **Adres kaydetme** - "Bu adresi kaydet" toggle (TESTLENDİ ✅)
- [x] **Adres auto-fill** - Kaydedilen adres sonraki randevuda otomatik gelir (TESTLENDİ ✅)
- [x] **Sadece nakit ödeme** - Online ödeme kaldırıldı (TESTLENDİ ✅)

### Admin Paneli
- [x] Admin girişi (admin/admin123)
- [x] **Dashboard** - Gelişmiş istatistikler
  - Toplam gelir
  - Randevu sayıları (bekleyen, onaylı, tamamlanan)
  - Müşteri sayısı
  - Değerlendirme sayısı
- [x] **Randevu Yönetimi** - Onaylama/reddetme
- [x] **Hizmet Yönetimi** - Ekleme/düzenleme/silme (Kaydet butonu TESTLENDİ ✅)
- [x] **Müşteri Yönetimi** - Müşteri listesi, puan bakiyesi, referans kodları
- [x] **Değerlendirme Yönetimi** - Yorumlar ve puanlama istatistikleri
- [x] **Paket Yönetimi** - Haftalık/aylık paket oluşturma
- [x] **Takvim Yönetimi** - Müsaitlik ayarlama
- [x] **Ayarlar** - İndirim oranları ve sistem ayarları

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
- POST /api/bookings
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

## Teknik Mimari

### Frontend
- React Native (Expo)
- Expo Router
- AsyncStorage
- react-native-calendars
- @react-native-picker/picker

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

## Yapılacaklar

### P1 - Yüksek Öncelik
- [ ] WhatsApp bildirimi
- [ ] Online ödeme (Stripe/iyzico)

### P2 - Orta Öncelik
- [ ] Frontend paket seçim sayfası
- [ ] Fotoğraflı iş takibi frontend
- [ ] Canlı konum takibi frontend

### P3 - Düşük Öncelik
- [ ] Push bildirimleri
- [ ] SMS bildirimleri
