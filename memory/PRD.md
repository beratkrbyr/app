# Temizlik Şirketi Randevu Uygulaması - PRD

## Proje Özeti
Temizlik şirketi müşterileri için randevu rezervasyon sistemi. React Native (Expo) frontend ve FastAPI/MongoDB backend.

## Temel Özellikler

### Müşteri Tarafı
- [x] Müşteri kaydı ve girişi (telefon numarası ile)
- [x] Hizmet listesi görüntüleme
- [x] Randevu oluşturma (tarih ve saat seçimi)
- [x] Türkçe takvim desteği
- [x] 30 günlük müsait tarih görüntüleme
- [x] Dolu saatlerin görüntülenmesi ve seçilememesi
- [x] Randevu iptal etme
- [x] Profil sayfası (randevular görüntüleme)
- [x] Cuma günü %10 indirim
- [x] Çıkış yapma

### Admin Tarafı
- [x] Admin girişi (admin/admin123)
- [x] Hizmet yönetimi (ekleme/düzenleme/silme)
- [x] Hizmet görseli yükleme
- [x] Randevu yönetimi (onaylama/reddetme)
- [x] Müsaitlik yönetimi
- [x] İstatistikler

## Teknik Mimari

### Frontend
- React Native (Expo)
- Expo Router (navigasyon)
- AsyncStorage (yerel depolama)
- react-native-calendars (takvim)

### Backend
- FastAPI
- MongoDB (motor async driver)
- JWT kimlik doğrulama

### API Endpoints
- GET /api/services - Hizmet listesi
- GET /api/availability - Müsaitlik
- GET /api/availability/slots - Saat dilimleri
- POST /api/bookings - Randevu oluştur
- PUT /api/bookings/{id}/cancel - Randevu iptal
- GET /api/bookings/check - Müşteri randevuları
- POST /api/admin/login - Admin girişi
- CRUD /api/admin/services - Hizmet yönetimi
- CRUD /api/admin/bookings - Randevu yönetimi

## Tamamlanan Düzeltmeler (17 Şubat 2026)

### Web Platformu Buton Sorunu Düzeltildi
- Pressable bileşenlerine onClick handler eklendi
- cursor: pointer stili eklendi
- Etkilenen dosyalar:
  - customer-login.tsx
  - profile.tsx
  - booking.tsx

### Test Sonuçları
- Giriş/Kayıt: ✅ PASS
- Misafir butonu: ✅ PASS
- Profil Giriş Yap: ✅ PASS
- Tarih seçim modalı: ✅ PASS
- Admin girişi: ✅ PASS
- Çıkış Yap: ✅ PASS
- Başarı oranı: %100

## Gelecek Görevler

### P1 - Yüksek Öncelik
- [ ] Push Bildirimleri (başlandı, duraklatıldı)
- [ ] Deprecation uyarılarını düzelt (shadow*, pointerEvents, tintColor)

### P2 - Orta Öncelik
- [ ] Dış Cephe Temizlik Servisi ekleme
- [ ] Randevu hatırlatma bildirimleri

### P3 - Düşük Öncelik
- [ ] Kullanıcı değerlendirmeleri
- [ ] SMS bildirimleri
