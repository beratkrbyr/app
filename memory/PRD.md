# Temizlik Şirketi Randevu Uygulaması - PRD

## Proje Özeti
Temizlik şirketi müşterileri için profesyonel randevu rezervasyon sistemi. React Native (Expo) frontend ve FastAPI/MongoDB backend.

## Temel Özellikler

### 1. Müşteri Kimlik Doğrulama
- [x] Müşteri kaydı (telefon + isim + email)
- [x] Müşteri girişi (kayıtlı telefon ile)
- [x] **Kayıt olmadan giriş engellemesi**
- [x] Çıkış yapma

### 2. Hizmet Yönetimi
- [x] Hizmet listesi görüntüleme
- [x] Hizmet detay sayfası
- [x] Hizmet görselleri
- [x] Cuma günü %10 indirim

### 3. Randevu Sistemi
- [x] Randevu oluşturma (tarih ve saat seçimi)
- [x] Türkçe takvim desteği
- [x] 30 günlük müsait tarih görüntüleme
- [x] Dolu saatlerin görüntülenmesi ve seçilememesi
- [x] Randevu iptal etme
- [x] Randevu durumu takibi

### 4. ⭐ Müşteri Yorumları & Puanlama (YENİ)
- [x] 5 yıldızlı değerlendirme sistemi
- [x] Yorum yazma özelliği
- [x] Ana sayfada "Mutlu Müşterilerimiz" bölümü
- [x] Değerlendirme istatistikleri
- [x] Yorum yapınca 10 puan kazanma

### 5. 🎁 Sadakat Programı (YENİ)
- [x] Her 10₺ harcamada 1 puan
- [x] Her 100 puan = %5 indirim (max %15)
- [x] Puan bakiyesi görüntüleme
- [x] Randevu geçmişi

### 6. 👥 Referans Sistemi (YENİ)
- [x] Benzersiz referans kodu oluşturma
- [x] Referans kodu paylaşma
- [x] Referans kodu kullanma
- [x] Her iki tarafa 50 puan bonus

### 7. 📦 Paket Hizmetler (YENİ - Backend Hazır)
- [x] Haftalık temizlik paketi (%20 indirim)
- [x] Aylık temizlik paketi (%15 indirim)
- [x] Paket abonelik sistemi
- [ ] Frontend paket seçim arayüzü (yapılacak)

### 8. 📸 Fotoğraflı İş Takibi (YENİ - Backend Hazır)
- [x] Öncesi/sonrası fotoğraf yükleme API
- [x] Fotoğraf görüntüleme API
- [ ] Frontend fotoğraf arayüzü (yapılacak)

### 9. 📍 Canlı Konum Takibi (YENİ - Backend Hazır)
- [x] Ekip konum güncelleme API
- [x] Konum sorgulama API
- [ ] Frontend harita arayüzü (yapılacak)

### 10. Admin Paneli
- [x] Admin girişi (admin/admin123)
- [x] Hizmet yönetimi (ekleme/düzenleme/silme)
- [x] Hizmet görseli yükleme
- [x] Randevu yönetimi (onaylama/reddetme)
- [x] Müsaitlik yönetimi
- [x] İstatistikler (gelir, müşteri sayısı, yorum sayısı)

## API Endpoints

### Müşteri
- POST /api/customers/register - Kayıt
- POST /api/customers/login - Giriş
- GET /api/customers/profile - Profil

### Referans
- POST /api/referral/use - Referans kodu kullan

### Değerlendirme
- POST /api/reviews - Yorum ekle
- GET /api/reviews - Yorumları listele
- GET /api/reviews/stats - İstatistikler

### Paketler
- GET /api/packages - Paketleri listele
- POST /api/packages/subscribe - Abone ol
- GET /api/packages/my-subscriptions - Aboneliklerim

### Fotoğraf
- POST /api/work-photos - Fotoğraf yükle
- GET /api/work-photos/{booking_id} - Fotoğrafları getir

### Konum
- POST /api/location/update - Konum güncelle
- GET /api/location/{booking_id} - Konum sorgula

### Randevu
- GET /api/services
- GET /api/availability
- GET /api/availability/slots
- POST /api/bookings
- PUT /api/bookings/{id}/cancel
- GET /api/bookings/check

### Admin
- POST /api/admin/login
- GET/POST/PUT/DELETE /api/admin/services
- GET/PUT /api/admin/bookings
- GET/POST /api/admin/availability
- GET/PUT /api/admin/settings
- GET /api/admin/stats
- GET /api/admin/customers
- GET /api/admin/reviews
- GET/POST /api/admin/packages

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
- bcrypt şifreleme

### Veritabanı Koleksiyonları
- admins
- services
- customers
- bookings
- reviews
- packages
- subscriptions
- work_photos
- booking_locations
- availability
- settings

## Güncellemeler

### 18 Şubat 2026
- ✅ Kayıt olmadan giriş engellendi
- ✅ Müşteri yorumları sistemi eklendi
- ✅ Sadakat puanları sistemi eklendi
- ✅ Referans sistemi eklendi
- ✅ Backend'e paket, fotoğraf, konum API'leri eklendi
- ✅ Ana sayfaya yorumlar ve özellikler bölümü eklendi
- ✅ Profil sayfasına puan ve referans bölümü eklendi

## Yapılacaklar

### P1 - Yüksek Öncelik
- [ ] WhatsApp ile bildirim entegrasyonu
- [ ] Online ödeme (Stripe/iyzico)
- [ ] Frontend paket seçim sayfası

### P2 - Orta Öncelik
- [ ] Fotoğraflı iş takibi frontend
- [ ] Canlı konum takibi frontend (harita)
- [ ] Push bildirimleri

### P3 - Düşük Öncelik
- [ ] SMS bildirimleri
- [ ] Dış cephe temizlik servisi
