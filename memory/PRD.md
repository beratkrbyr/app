# TİTAN 360 - Product Requirements Document

## Original Problem Statement
A cleaning company owner requested a mobile application named "TİTAN 360". The project evolved to include:
1. A web-based admin panel deployed on Hostinger VPS
2. A professional public-facing website
3. A React Native mobile app for customer bookings

## Technical Architecture
- **Location**: Hostinger VPS (76.13.61.47)
- **Directory**: `/var/www/titan360/`
  - `frontend/`: Next.js 14+ (Admin Panel + Public Website)
  - `backend/`: FastAPI (`server.py`)
  - `mobile/`: React Native (Expo)
- **Process Manager**: PM2 (titan-admin, titan-api, expo-mobile)
- **Database**: MongoDB
- **Domain**: titan360.com.tr

## Completed Features

### Admin Panel
- Dashboard with booking statistics
- Bookings management with status updates
- Customer management with loyalty points
- Services CRUD operations
- Calendar view for booking statuses
- New booking creation with photo upload
- Settings page
- Admin login (admin/admin123)

### Public Website
- Modern landing page with hero section
- Services page
- About page (Hakkımızda)
- How it works page (Nasıl Çalışır)
- Contact page (İletişim)
- Responsive design with glassmorphism theme

### Mobile App (Expo)
- Login with phone number
- Home screen with quick actions
- Services listing
- Booking creation with photo upload
- Calendar view
- Review submission
- Dark theme matching website

## Recent Changes (Feb 26, 2025)
- Fixed homepage layout bug - sections were overlapping
- Separated Hero, Stats, Services, and CTA sections with proper spacing
- Hero section now takes min 80vh height
- Mobile responsive design improved
- **Added "Kayıt Ol" (Register) feature to mobile app login screen**
  - Toggle between Login and Register modes
  - Name, phone, email, password fields
  - Password confirmation
  - Referral code support for bonus points
  - Form validation

## Database Schema
- `customers`: {name, phone, loyalty_points, referral_code, password_hash}
- `bookings`: {service_id, customer_id, status, work_photos, date, time, notes}
- `services`: {name, price, description}

## API Endpoints
- POST /api/bookings - Create booking
- POST /api/admin/bookings - Admin create booking
- GET /api/services - List services
- POST /api/customers/login - Customer login

## Credentials
- VPS SSH: root@76.13.61.47 (Berat25.krbyr)
- Admin Panel: admin/admin123
- Test Customer: 0532 111 2233 / 123456

## Known Issues
- Mobile app Expo server may need periodic restarts (pm2 restart expo-mobile)

## Future Tasks (Backlog)
- P1: Full end-to-end testing of mobile app features
- P2: Push notifications for booking updates
- P2: Customer loyalty program enhancement
- P3: Analytics dashboard
- P3: Multi-language support
