# TİTAN 360 - Profesyonel Temizlik Hizmetleri

## Proje Özeti
İstanbul merkezli bir temizlik şirketi için tam kapsamlı dijital platform: web sitesi, admin paneli ve mobil uygulama.

## Kullanıcı Personası
- **İşletme Sahibi**: Temizlik şirketi sahibi, admin panel üzerinden randevuları ve müşterileri yönetir
- **Müşteriler**: Temizlik hizmeti almak isteyen ev ve ofis sahipleri

## Temel Gereksinimler
1. **Admin Paneli**: Randevu, müşteri ve hizmet yönetimi
2. **Public Web Sitesi**: Şirket tanıtımı ve hizmet bilgileri
3. **Mobil Uygulama**: Müşteri girişi ve randevu takibi
4. **SSL/HTTPS**: Güvenli bağlantı (titan360.com.tr)

## Teknik Mimari
- **Sunucu**: Hostinger VPS (76.13.61.47)
- **Frontend**: Next.js 16 (App Router)
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Process Manager**: PM2
- **Reverse Proxy**: Nginx

## Tamamlanan İşler

### 15 Aralık 2024
- ✅ Admin paneli tam fonksiyonel (dashboard, randevular, müşteriler, hizmetler, ayarlar)
- ✅ Modern koyu tema tasarımı
- ✅ Mobil uyumlu responsive tasarım
- ✅ Örnek veriler ile veritabanı dolduruldu
- ✅ Müşteri sadakat puanları ve referans kodu sistemi
- ✅ Randevu fotoğraf görüntüleyici

### 16 Aralık 2024
- ✅ **Public Web Sitesi Yeniden Tasarlandı**
  - Ana sayfa (hero section, istatistikler, hizmet önizleme)
  - Hizmetler sayfası (6 hizmet kartı, fiyatlar)
  - Nasıl Çalışır sayfası (4 adım, SSS)
  - Hakkımızda sayfası (şirket hikayesi, değerler)
  - İletişim sayfası (form, iletişim bilgileri)
  - Sticky header, modern gradient tasarım
  - Tam sayfa layout düzeltmesi
  - **İçerik ortalama düzeltmesi** - Tüm sayfalar merkeze hizalandı (container mx-auto)

## Bekleyen Görevler

### P1 - SSL Sertifikası
- **Durum**: BLOCKED - DNS yayılımı bekleniyor
- **Sonraki Adım**: DNS yayıldığında `certbot --nginx -d titan360.com.tr` çalıştır
- **Kontrol Scripti**: `/root/get_ssl.sh`

### P2 - Mobil Uygulama Giriş
- **Durum**: BLOCKED - SSL gerekli
- **Sonraki Adım**: SSL sonrası `https://titan360.com.tr` URL'si ile test

## Önemli Dosyalar
- `/var/www/titan360/frontend/` - Next.js frontend
- `/var/www/titan360/backend/server.py` - FastAPI backend
- `/etc/nginx/sites-available/titan360` - Nginx config

## Kimlik Bilgileri
- **VPS SSH**: root@76.13.61.47
- **Admin Panel**: admin / admin123
- **Test Müşteri**: ahmet@ornek.com / password123

## API Endpoints
- `POST /api/admin/login` - Admin girişi
- `GET /api/admin/stats` - Dashboard istatistikleri
- `POST /api/customers/login` - Müşteri girişi (mobil app)
- `GET /api/bookings` - Randevu listesi
- `GET /api/customers` - Müşteri listesi
