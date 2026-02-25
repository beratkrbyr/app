# TİTAN 360 - Admin Panel PRD

## Proje Özeti
TİTAN 360, temizlik şirketleri için randevu ve iş yönetimi uygulamasıdır. Admin paneli web tabanlı olarak geliştirilmiş ve kullanıcının Hostinger VPS'ine deploy edilmiştir.

## Teknik Mimari
- **Frontend**: Next.js 16.1.6 (App Router, TypeScript, Tailwind CSS)
- **Backend**: FastAPI (Python)
- **Database**: MongoDB (localhost:27017)
- **Process Manager**: PM2
- **Reverse Proxy**: Nginx

## Deployment Bilgileri
- **Sunucu**: Hostinger VPS
- **IP**: 76.13.61.47
- **Admin Panel URL**: http://76.13.61.47/admin-login
- **API URL**: http://76.13.61.47/api/*

## Dizin Yapısı (Sunucu)
```
/var/www/titan360/
├── frontend/          # Next.js Admin Panel
│   ├── app/
│   │   ├── admin/     # Admin sayfaları
│   │   │   ├── dashboard/
│   │   │   ├── bookings/
│   │   │   ├── services/
│   │   │   ├── customers/
│   │   │   ├── calendar/
│   │   │   ├── reviews/
│   │   │   └── settings/
│   │   └── admin-login/
│   └── package.json
└── backend/           # FastAPI Backend
    ├── server.py
    └── venv/
```

## Önemli Bilgiler
- **Admin Giriş**: admin / admin123
- **PM2 Servisleri**: titan-admin (frontend), titan-api (backend)
- **Nginx Config**: /etc/nginx/sites-available/titan360

## Tamamlanan İşler (25 Şubat 2026)
1. ✅ Backend deploy edildi ve PM2 ile yönetiliyor
2. ✅ Frontend deploy edildi ve PM2 ile yönetiliyor
3. ✅ Nginx reverse proxy yapılandırıldı
4. ✅ Admin login ve dashboard çalışıyor
5. ✅ Tüm API endpoint'leri erişilebilir

## Gelecek Geliştirmeler (Backlog)
- [ ] SSL sertifikası (HTTPS) eklemesi
- [ ] Domain bağlantısı
- [ ] UI/UX iyileştirmeleri
- [ ] Mobil müşteri uygulaması
