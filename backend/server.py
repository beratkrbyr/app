from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, date, time, timedelta
from bson import ObjectId
import bcrypt
import jwt
import secrets
import string

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Secret
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
security = HTTPBearer()

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Helper function to convert ObjectId to string
def serialize_doc(doc):
    if doc and '_id' in doc:
        doc['_id'] = str(doc['_id'])
    return doc

# ============== MODELS ==============

class Service(BaseModel):
    name: str
    description: str
    price: float
    image: Optional[str] = None
    active: bool = True
    order: int = 0

class ServiceResponse(Service):
    id: str

# Customer Registration/Login
class CustomerRegister(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None

class CustomerLogin(BaseModel):
    phone: str

class CustomerResponse(BaseModel):
    id: str
    name: str
    phone: str
    email: Optional[str] = None
    loyalty_points: int = 0
    total_bookings: int = 0
    referral_code: str
    token: str

# Booking Models
class BookingCreate(BaseModel):
    service_id: str
    customer_name: str
    customer_phone: str
    customer_address: str
    booking_date: str
    booking_time: str
    payment_method: str
    package_id: Optional[str] = None  # For package bookings
    customer_photos: Optional[List[str]] = []  # Base64 encoded photos from customer

class BookingResponse(BaseModel):
    id: str
    service_id: str
    service_name: str
    customer_name: str
    customer_phone: str
    customer_address: str
    booking_date: str
    booking_time: str
    total_price: float
    discount_applied: float
    payment_method: str
    status: str
    created_at: str
    customer_photos: Optional[List[str]] = []

# Review Models
class ReviewCreate(BaseModel):
    booking_id: str
    rating: int  # 1-5
    comment: Optional[str] = None

class ReviewResponse(BaseModel):
    id: str
    booking_id: str
    customer_name: str
    rating: int
    comment: Optional[str]
    created_at: str

# Package Models
class PackageCreate(BaseModel):
    name: str
    description: str
    service_id: str
    frequency: str  # "weekly", "biweekly", "monthly"
    discount_percent: float
    total_sessions: int
    price: float

class PackageResponse(BaseModel):
    id: str
    name: str
    description: str
    service_id: str
    service_name: str
    frequency: str
    discount_percent: float
    total_sessions: int
    price: float
    active: bool

# Referral Models
class ReferralUse(BaseModel):
    referral_code: str
    customer_phone: str

# Admin Models
class AdminLogin(BaseModel):
    username: str
    password: str

class AdminLoginResponse(BaseModel):
    token: str
    username: str

class AvailabilityDate(BaseModel):
    date: str
    available: bool
    time_slots: List[str] = []

class AvailabilityResponse(BaseModel):
    dates: List[dict]

class SettingUpdate(BaseModel):
    key: str
    value: str

class BookingStatusUpdate(BaseModel):
    status: str

# Work Photo Models
class WorkPhotoUpload(BaseModel):
    booking_id: str
    photo_type: str  # "before" or "after"
    photo_base64: str

# Location Update Model
class LocationUpdate(BaseModel):
    booking_id: str
    latitude: float
    longitude: float
    status: str  # "on_the_way", "arrived", "in_progress", "completed"

# ============== HELPER FUNCTIONS ==============

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

def generate_referral_code():
    """Generate a unique referral code"""
    chars = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(chars) for _ in range(8))

def is_friday(date_str: str) -> bool:
    """Check if date is Friday"""
    date_obj = datetime.strptime(date_str, "%Y-%m-%d")
    return date_obj.weekday() == 4

async def get_friday_discount() -> float:
    """Get Friday discount percentage from settings"""
    setting = await db.settings.find_one({"key": "friday_discount"})
    if setting:
        return float(setting.get("value", 10))
    return 10.0

async def get_loyalty_discount(customer_phone: str) -> float:
    """Calculate loyalty discount based on points"""
    customer = await db.customers.find_one({"phone": customer_phone})
    if not customer:
        return 0.0
    
    points = customer.get("loyalty_points", 0)
    # Every 100 points = 5% discount, max 15%
    discount = min((points // 100) * 5, 15)
    return float(discount)

async def add_loyalty_points(customer_phone: str, amount: float):
    """Add loyalty points (1 point per 10 TL spent)"""
    points = int(amount / 10)
    await db.customers.update_one(
        {"phone": customer_phone},
        {"$inc": {"loyalty_points": points, "total_bookings": 1}}
    )

# ============== CUSTOMER AUTH APIs ==============

@api_router.post("/customers/register")
async def register_customer(customer: CustomerRegister):
    """Register a new customer"""
    # Check if phone already exists
    existing = await db.customers.find_one({"phone": customer.phone})
    if existing:
        raise HTTPException(status_code=400, detail="Bu telefon numarası zaten kayıtlı")
    
    # Generate referral code
    referral_code = generate_referral_code()
    while await db.customers.find_one({"referral_code": referral_code}):
        referral_code = generate_referral_code()
    
    # Create customer
    customer_doc = {
        "name": customer.name,
        "phone": customer.phone,
        "email": customer.email,
        "address": customer.address,
        "loyalty_points": 0,
        "total_bookings": 0,
        "referral_code": referral_code,
        "referred_by": None,
        "created_at": datetime.utcnow().isoformat()
    }
    
    result = await db.customers.insert_one(customer_doc)
    
    # Generate JWT token - 30 gün geçerli
    token = jwt.encode(
        {
            "customer_id": str(result.inserted_id), 
            "phone": customer.phone,
            "exp": datetime.utcnow() + timedelta(days=30)
        },
        JWT_SECRET,
        algorithm="HS256"
    )
    
    return {
        "id": str(result.inserted_id),
        "name": customer_doc["name"],
        "phone": customer_doc["phone"],
        "email": customer_doc["email"],
        "address": customer_doc["address"],
        "loyalty_points": 0,
        "total_bookings": 0,
        "referral_code": referral_code,
        "token": token
    }

@api_router.post("/customers/login")
async def login_customer(login: CustomerLogin):
    """Login customer by phone number"""
    customer = await db.customers.find_one({"phone": login.phone})
    
    if not customer:
        raise HTTPException(status_code=404, detail="Bu telefon numarası kayıtlı değil. Lütfen önce kayıt olun.")
    
    # Generate JWT token - 30 gün geçerli
    token = jwt.encode(
        {
            "customer_id": str(customer["_id"]), 
            "phone": customer["phone"],
            "exp": datetime.utcnow() + timedelta(days=30)
        },
        JWT_SECRET,
        algorithm="HS256"
    )
    
    return {
        "id": str(customer["_id"]),
        "name": customer["name"],
        "phone": customer["phone"],
        "email": customer.get("email"),
        "address": customer.get("address"),
        "loyalty_points": customer.get("loyalty_points", 0),
        "total_bookings": customer.get("total_bookings", 0),
        "referral_code": customer.get("referral_code", ""),
        "token": token
    }

@api_router.get("/customers/profile")
async def get_customer_profile(phone: str):
    """Get customer profile"""
    customer = await db.customers.find_one({"phone": phone})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    return {
        "id": str(customer["_id"]),
        "name": customer["name"],
        "phone": customer["phone"],
        "email": customer.get("email"),
        "address": customer.get("address"),
        "loyalty_points": customer.get("loyalty_points", 0),
        "total_bookings": customer.get("total_bookings", 0),
        "referral_code": customer.get("referral_code", "")
    }

class CustomerAddressUpdate(BaseModel):
    phone: str
    address: str

@api_router.put("/customers/address")
async def update_customer_address(data: CustomerAddressUpdate):
    """Update customer address"""
    result = await db.customers.update_one(
        {"phone": data.phone},
        {"$set": {"address": data.address}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Müşteri bulunamadı")
    
    return {"message": "Adres güncellendi"}

# ============== REFERRAL APIs ==============

@api_router.post("/referral/use")
async def use_referral_code(referral: ReferralUse):
    """Use a referral code"""
    # Find the referrer
    referrer = await db.customers.find_one({"referral_code": referral.referral_code})
    if not referrer:
        raise HTTPException(status_code=404, detail="Geçersiz referans kodu")
    
    # Check if customer already used a referral
    customer = await db.customers.find_one({"phone": referral.customer_phone})
    if not customer:
        raise HTTPException(status_code=404, detail="Müşteri bulunamadı")
    
    if customer.get("referred_by"):
        raise HTTPException(status_code=400, detail="Zaten bir referans kodu kullandınız")
    
    if referrer["phone"] == referral.customer_phone:
        raise HTTPException(status_code=400, detail="Kendi kodunuzu kullanamazsınız")
    
    # Apply referral bonus (50 TL worth of points = 50 points)
    await db.customers.update_one(
        {"phone": referral.customer_phone},
        {"$set": {"referred_by": referral.referral_code}, "$inc": {"loyalty_points": 50}}
    )
    
    # Give referrer bonus too
    await db.customers.update_one(
        {"referral_code": referral.referral_code},
        {"$inc": {"loyalty_points": 50}}
    )
    
    return {"message": "Referans kodu başarıyla kullanıldı! 50 puan kazandınız."}

# ============== REVIEW APIs ==============

@api_router.post("/reviews")
async def create_review(review: ReviewCreate):
    """Create a review for a completed booking"""
    # Check booking exists and is completed
    try:
        booking = await db.bookings.find_one({"_id": ObjectId(review.booking_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Geçersiz randevu ID")
    
    if not booking:
        raise HTTPException(status_code=404, detail="Randevu bulunamadı")
    
    if booking["status"] != "completed":
        raise HTTPException(status_code=400, detail="Sadece tamamlanmış randevular değerlendirilebilir")
    
    # Check if already reviewed
    existing = await db.reviews.find_one({"booking_id": review.booking_id})
    if existing:
        raise HTTPException(status_code=400, detail="Bu randevu zaten değerlendirilmiş")
    
    # Validate rating
    if review.rating < 1 or review.rating > 5:
        raise HTTPException(status_code=400, detail="Puan 1-5 arasında olmalıdır")
    
    # Create review
    review_doc = {
        "booking_id": review.booking_id,
        "service_id": booking["service_id"],
        "customer_name": booking["customer_name"],
        "customer_phone": booking["customer_phone"],
        "rating": review.rating,
        "comment": review.comment,
        "created_at": datetime.utcnow().isoformat()
    }
    
    result = await db.reviews.insert_one(review_doc)
    
    # Give loyalty points for review (10 points)
    await db.customers.update_one(
        {"phone": booking["customer_phone"]},
        {"$inc": {"loyalty_points": 10}}
    )
    
    return {
        "id": str(result.inserted_id),
        "booking_id": review_doc["booking_id"],
        "customer_name": review_doc["customer_name"],
        "rating": review_doc["rating"],
        "comment": review_doc["comment"],
        "created_at": review_doc["created_at"]
    }

@api_router.get("/reviews")
async def get_reviews(service_id: Optional[str] = None, limit: int = 10):
    """Get reviews (optionally filtered by service)"""
    query = {}
    if service_id:
        query["service_id"] = service_id
    
    reviews = await db.reviews.find(query).sort("created_at", -1).limit(limit).to_list(limit)
    return [{**serialize_doc(r), "id": str(r["_id"])} for r in reviews]

@api_router.get("/reviews/stats")
async def get_review_stats():
    """Get review statistics"""
    pipeline = [
        {"$group": {
            "_id": None,
            "average_rating": {"$avg": "$rating"},
            "total_reviews": {"$sum": 1},
            "five_star": {"$sum": {"$cond": [{"$eq": ["$rating", 5]}, 1, 0]}},
            "four_star": {"$sum": {"$cond": [{"$eq": ["$rating", 4]}, 1, 0]}},
            "three_star": {"$sum": {"$cond": [{"$eq": ["$rating", 3]}, 1, 0]}},
            "two_star": {"$sum": {"$cond": [{"$eq": ["$rating", 2]}, 1, 0]}},
            "one_star": {"$sum": {"$cond": [{"$eq": ["$rating", 1]}, 1, 0]}}
        }}
    ]
    
    result = await db.reviews.aggregate(pipeline).to_list(1)
    if result:
        stats = result[0]
        return {
            "average_rating": round(stats.get("average_rating", 0), 1),
            "total_reviews": stats.get("total_reviews", 0),
            "breakdown": {
                "5": stats.get("five_star", 0),
                "4": stats.get("four_star", 0),
                "3": stats.get("three_star", 0),
                "2": stats.get("two_star", 0),
                "1": stats.get("one_star", 0)
            }
        }
    return {"average_rating": 0, "total_reviews": 0, "breakdown": {"5": 0, "4": 0, "3": 0, "2": 0, "1": 0}}

# ============== PACKAGE APIs ==============

@api_router.get("/packages")
async def get_packages():
    """Get all active packages"""
    packages = await db.packages.find({"active": True}).to_list(100)
    result = []
    for pkg in packages:
        service = await db.services.find_one({"_id": ObjectId(pkg["service_id"])})
        result.append({
            "id": str(pkg["_id"]),
            "name": pkg["name"],
            "description": pkg["description"],
            "service_id": pkg["service_id"],
            "service_name": service["name"] if service else "Unknown",
            "frequency": pkg["frequency"],
            "discount_percent": pkg["discount_percent"],
            "total_sessions": pkg["total_sessions"],
            "price": pkg["price"],
            "active": pkg["active"]
        })
    return result

@api_router.post("/packages/subscribe")
async def subscribe_to_package(customer_phone: str, package_id: str):
    """Subscribe customer to a package"""
    try:
        package = await db.packages.find_one({"_id": ObjectId(package_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Geçersiz paket ID")
    
    if not package:
        raise HTTPException(status_code=404, detail="Paket bulunamadı")
    
    customer = await db.customers.find_one({"phone": customer_phone})
    if not customer:
        raise HTTPException(status_code=404, detail="Müşteri bulunamadı")
    
    # Create subscription
    subscription = {
        "customer_phone": customer_phone,
        "package_id": package_id,
        "package_name": package["name"],
        "sessions_remaining": package["total_sessions"],
        "total_sessions": package["total_sessions"],
        "price_paid": package["price"],
        "status": "active",
        "created_at": datetime.utcnow().isoformat()
    }
    
    result = await db.subscriptions.insert_one(subscription)
    
    return {
        "id": str(result.inserted_id),
        "message": "Paket aboneliği başarıyla oluşturuldu",
        "sessions_remaining": package["total_sessions"]
    }

@api_router.get("/packages/my-subscriptions")
async def get_my_subscriptions(phone: str):
    """Get customer's active subscriptions"""
    subscriptions = await db.subscriptions.find({
        "customer_phone": phone,
        "status": "active",
        "sessions_remaining": {"$gt": 0}
    }).to_list(100)
    
    return [{**serialize_doc(s), "id": str(s["_id"])} for s in subscriptions]

# ============== WORK PHOTO APIs ==============

@api_router.post("/work-photos")
async def upload_work_photo(photo: WorkPhotoUpload):
    """Upload before/after work photo"""
    try:
        booking = await db.bookings.find_one({"_id": ObjectId(photo.booking_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Geçersiz randevu ID")
    
    if not booking:
        raise HTTPException(status_code=404, detail="Randevu bulunamadı")
    
    if photo.photo_type not in ["before", "after"]:
        raise HTTPException(status_code=400, detail="Fotoğraf tipi 'before' veya 'after' olmalıdır")
    
    # Save photo
    photo_doc = {
        "booking_id": photo.booking_id,
        "photo_type": photo.photo_type,
        "photo_base64": photo.photo_base64,
        "created_at": datetime.utcnow().isoformat()
    }
    
    result = await db.work_photos.insert_one(photo_doc)
    
    return {"id": str(result.inserted_id), "message": "Fotoğraf yüklendi"}

@api_router.get("/work-photos/{booking_id}")
async def get_work_photos(booking_id: str):
    """Get work photos for a booking"""
    photos = await db.work_photos.find({"booking_id": booking_id}).to_list(10)
    return [{
        "id": str(p["_id"]),
        "photo_type": p["photo_type"],
        "photo_base64": p["photo_base64"],
        "created_at": p["created_at"]
    } for p in photos]

# ============== LOCATION TRACKING APIs ==============

@api_router.post("/location/update")
async def update_location(location: LocationUpdate):
    """Update team location for a booking"""
    try:
        booking = await db.bookings.find_one({"_id": ObjectId(location.booking_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Geçersiz randevu ID")
    
    if not booking:
        raise HTTPException(status_code=404, detail="Randevu bulunamadı")
    
    # Update location
    await db.booking_locations.update_one(
        {"booking_id": location.booking_id},
        {"$set": {
            "latitude": location.latitude,
            "longitude": location.longitude,
            "status": location.status,
            "updated_at": datetime.utcnow().isoformat()
        }},
        upsert=True
    )
    
    return {"message": "Konum güncellendi"}

@api_router.get("/location/{booking_id}")
async def get_location(booking_id: str):
    """Get team location for a booking"""
    location = await db.booking_locations.find_one({"booking_id": booking_id})
    if not location:
        return {"status": "not_started", "latitude": None, "longitude": None}
    
    return {
        "latitude": location["latitude"],
        "longitude": location["longitude"],
        "status": location["status"],
        "updated_at": location["updated_at"]
    }

# ============== ORIGINAL SERVICE APIs ==============

@api_router.get("/services")
async def get_services():
    """Get all active services"""
    services = await db.services.find({"active": True}).sort("order", 1).to_list(100)
    return [{**serialize_doc(s), "id": str(s["_id"])} for s in services]

@api_router.get("/availability")
async def get_availability(year: int, month: int):
    """Get availability for a specific month"""
    start_date = f"{year}-{month:02d}-01"
    end_date = f"{year}-{month:02d}-31"
    
    availability_docs = await db.availability.find({
        "date": {"$gte": start_date, "$lte": end_date}
    }).to_list(100)
    
    dates = []
    for doc in availability_docs:
        dates.append({
            "date": doc["date"],
            "available": doc.get("available", False),
            "has_slots": len(doc.get("time_slots", [])) > 0
        })
    
    return {"dates": dates}

@api_router.get("/availability/slots")
async def get_time_slots(date_str: str = Query(..., alias="date")):
    """Get available time slots for a specific date"""
    availability = await db.availability.find_one({"date": date_str})
    
    if not availability or not availability.get("available"):
        return {"slots": [], "all_slots": [], "booked_slots": [], "available": False}
    
    bookings = await db.bookings.find({
        "booking_date": date_str,
        "status": {"$in": ["pending", "confirmed"]}
    }).to_list(100)
    
    booked_times = [b["booking_time"] for b in bookings]
    all_slots = availability.get("time_slots", [])
    available_slots = [slot for slot in all_slots if slot not in booked_times]
    
    return {
        "slots": available_slots,
        "all_slots": all_slots,
        "booked_slots": booked_times,
        "available": len(available_slots) > 0
    }

@api_router.post("/bookings")
async def create_booking(booking: BookingCreate):
    """Create a new booking"""
    # Validate service exists
    service = await db.services.find_one({"_id": ObjectId(booking.service_id)})
    if not service:
        raise HTTPException(status_code=404, detail="Hizmet bulunamadı")
    
    # Check if customer is registered
    customer = await db.customers.find_one({"phone": booking.customer_phone})
    if not customer:
        raise HTTPException(status_code=400, detail="Randevu oluşturmak için önce kayıt olmanız gerekiyor")
    
    # Check if slot is available
    availability = await db.availability.find_one({"date": booking.booking_date})
    if not availability or not availability.get("available"):
        raise HTTPException(status_code=400, detail="Bu tarih müsait değil")
    
    if booking.booking_time not in availability.get("time_slots", []):
        raise HTTPException(status_code=400, detail="Bu saat müsait değil")
    
    # Check if already booked
    existing = await db.bookings.find_one({
        "booking_date": booking.booking_date,
        "booking_time": booking.booking_time,
        "status": {"$in": ["pending", "confirmed"]}
    })
    if existing:
        raise HTTPException(status_code=400, detail="Bu saat dolu")
    
    # Calculate price with discounts
    base_price = service["price"]
    total_discount = 0.0
    discount_details = []
    
    # Friday discount
    if is_friday(booking.booking_date):
        discount_percent = await get_friday_discount()
        friday_discount = base_price * (discount_percent / 100)
        total_discount += friday_discount
        discount_details.append(f"Cuma indirimi: ₺{friday_discount:.2f}")
    
    # Loyalty discount
    loyalty_discount_percent = await get_loyalty_discount(booking.customer_phone)
    if loyalty_discount_percent > 0:
        loyalty_discount = base_price * (loyalty_discount_percent / 100)
        total_discount += loyalty_discount
        discount_details.append(f"Sadakat indirimi: ₺{loyalty_discount:.2f}")
    
    total_price = base_price - total_discount
    
    # Create booking
    booking_doc = {
        "service_id": booking.service_id,
        "service_name": service["name"],
        "customer_name": booking.customer_name,
        "customer_phone": booking.customer_phone,
        "customer_address": booking.customer_address,
        "booking_date": booking.booking_date,
        "booking_time": booking.booking_time,
        "base_price": base_price,
        "total_price": total_price,
        "discount_applied": total_discount,
        "discount_details": discount_details,
        "payment_method": booking.payment_method,
        "customer_photos": booking.customer_photos or [],  # Store customer's photos
        "status": "pending",
        "created_at": datetime.utcnow().isoformat()
    }
    
    result = await db.bookings.insert_one(booking_doc)
    
    # Add loyalty points
    await add_loyalty_points(booking.customer_phone, total_price)
    
    return {
        "id": str(result.inserted_id),
        "service_id": booking_doc["service_id"],
        "service_name": booking_doc["service_name"],
        "customer_name": booking_doc["customer_name"],
        "customer_phone": booking_doc["customer_phone"],
        "customer_address": booking_doc["customer_address"],
        "booking_date": booking_doc["booking_date"],
        "booking_time": booking_doc["booking_time"],
        "total_price": booking_doc["total_price"],
        "discount_applied": booking_doc["discount_applied"],
        "payment_method": booking_doc["payment_method"],
        "status": booking_doc["status"],
        "created_at": booking_doc["created_at"]
    }

@api_router.get("/bookings/check")
async def check_bookings(phone: str):
    """Get bookings by phone number"""
    bookings = await db.bookings.find({"customer_phone": phone}).sort("created_at", -1).to_list(100)
    result = []
    for b in bookings:
        booking_data = {**serialize_doc(b), "id": str(b["_id"])}
        # Check if booking has review
        review = await db.reviews.find_one({"booking_id": str(b["_id"])})
        booking_data["has_review"] = review is not None
        result.append(booking_data)
    return result

@api_router.put("/bookings/{booking_id}/cancel")
async def cancel_booking(booking_id: str, phone: str):
    """Cancel a booking by customer"""
    try:
        booking = await db.bookings.find_one({"_id": ObjectId(booking_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Geçersiz randevu ID")
    
    if not booking:
        raise HTTPException(status_code=404, detail="Randevu bulunamadı")
    
    if booking["customer_phone"] != phone:
        raise HTTPException(status_code=403, detail="Yetkisiz işlem")
    
    if booking["status"] in ["cancelled", "completed"]:
        raise HTTPException(status_code=400, detail="Bu randevu iptal edilemez")
    
    await db.bookings.update_one(
        {"_id": ObjectId(booking_id)},
        {"$set": {"status": "cancelled"}}
    )
    
    return {"message": "Randevu iptal edildi", "id": booking_id}

# ============== ADMIN APIs ==============

@api_router.post("/admin/login")
async def admin_login(login: AdminLogin):
    """Admin login"""
    admin = await db.admins.find_one({"username": login.username})
    
    if not admin:
        raise HTTPException(status_code=401, detail="Geçersiz kullanıcı bilgileri")
    
    if not bcrypt.checkpw(login.password.encode('utf-8'), admin["password"].encode('utf-8')):
        raise HTTPException(status_code=401, detail="Geçersiz kullanıcı bilgileri")
    
    # 30 gün geçerli token
    token = jwt.encode(
        {
            "username": admin["username"], 
            "admin_id": str(admin["_id"]),
            "exp": datetime.utcnow() + timedelta(days=30)
        },
        JWT_SECRET,
        algorithm="HS256"
    )
    
    return {"token": token, "username": admin["username"]}

@api_router.post("/admin/init")
async def init_admin():
    """Initialize admin user"""
    existing = await db.admins.find_one({})
    if existing:
        return {"message": "Admin zaten mevcut"}
    
    hashed = bcrypt.hashpw("admin123".encode('utf-8'), bcrypt.gensalt())
    admin = {
        "username": "admin",
        "password": hashed.decode('utf-8'),
        "created_at": datetime.utcnow().isoformat()
    }
    
    await db.admins.insert_one(admin)
    await db.settings.insert_one({"key": "friday_discount", "value": "10"})
    await db.settings.insert_one({"key": "referral_bonus", "value": "50"})
    await db.settings.insert_one({"key": "loyalty_points_per_10tl", "value": "1"})
    
    # Create default packages
    service = await db.services.find_one({})
    if service:
        packages = [
            {
                "name": "Haftalık Temizlik Paketi",
                "description": "Haftada 1 temizlik, 4 hafta boyunca",
                "service_id": str(service["_id"]),
                "frequency": "weekly",
                "discount_percent": 20,
                "total_sessions": 4,
                "price": service["price"] * 4 * 0.8,
                "active": True
            },
            {
                "name": "Aylık Temizlik Paketi",
                "description": "Ayda 2 temizlik, 3 ay boyunca",
                "service_id": str(service["_id"]),
                "frequency": "biweekly",
                "discount_percent": 15,
                "total_sessions": 6,
                "price": service["price"] * 6 * 0.85,
                "active": True
            }
        ]
        for pkg in packages:
            await db.packages.update_one(
                {"name": pkg["name"]},
                {"$set": pkg},
                upsert=True
            )
    
    return {"message": "Admin oluşturuldu", "username": "admin", "password": "admin123"}

@api_router.get("/admin/bookings")
async def get_admin_bookings(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get all bookings"""
    verify_token(credentials)
    bookings = await db.bookings.find().sort("created_at", -1).to_list(1000)
    result = []
    for b in bookings:
        booking_data = {**serialize_doc(b), "id": str(b["_id"])}
        # Include customer_photos if present
        if "customer_photos" in b:
            booking_data["customer_photos"] = b["customer_photos"]
        result.append(booking_data)
    return result

@api_router.put("/admin/bookings/{booking_id}")
async def update_booking_status(
    booking_id: str,
    update: BookingStatusUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update booking status"""
    verify_token(credentials)
    
    result = await db.bookings.update_one(
        {"_id": ObjectId(booking_id)},
        {"$set": {"status": update.status}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Randevu bulunamadı")
    
    return {"message": "Randevu güncellendi"}

@api_router.get("/admin/services")
async def get_admin_services(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get all services"""
    verify_token(credentials)
    services = await db.services.find().sort("order", 1).to_list(100)
    return [{**serialize_doc(s), "id": str(s["_id"])} for s in services]

@api_router.post("/admin/services")
async def create_service(service: Service, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Create new service"""
    verify_token(credentials)
    
    service_doc = service.dict()
    result = await db.services.insert_one(service_doc)
    
    response_data = {
        "id": str(result.inserted_id),
        "name": service_doc["name"],
        "description": service_doc["description"],
        "price": service_doc["price"],
        "active": service_doc["active"],
        "order": service_doc["order"]
    }
    if "image" in service_doc:
        response_data["image"] = service_doc["image"]
    
    return response_data

@api_router.put("/admin/services/{service_id}")
async def update_service(service_id: str, service: Service, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Update service"""
    verify_token(credentials)
    
    result = await db.services.update_one(
        {"_id": ObjectId(service_id)},
        {"$set": service.dict()}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Hizmet bulunamadı")
    
    return {"message": "Hizmet güncellendi"}

@api_router.delete("/admin/services/{service_id}")
async def delete_service(service_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Delete service"""
    verify_token(credentials)
    
    result = await db.services.delete_one({"_id": ObjectId(service_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Hizmet bulunamadı")
    
    return {"message": "Hizmet silindi"}

@api_router.get("/admin/availability")
async def get_admin_availability(year: int, month: int, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get availability"""
    verify_token(credentials)
    
    start_date = f"{year}-{month:02d}-01"
    end_date = f"{year}-{month:02d}-31"
    
    availability_docs = await db.availability.find({
        "date": {"$gte": start_date, "$lte": end_date}
    }).to_list(100)
    
    return [{**serialize_doc(a), "id": str(a["_id"])} for a in availability_docs]

@api_router.get("/admin/availability/date")
async def get_availability_by_date(date: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get availability for a specific date"""
    verify_token(credentials)
    
    availability = await db.availability.find_one({"date": date})
    if availability:
        return {**serialize_doc(availability), "id": str(availability["_id"])}
    return {"date": date, "available": False, "time_slots": []}

@api_router.post("/admin/availability")
async def set_availability(availability: AvailabilityDate, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Set availability"""
    verify_token(credentials)
    
    await db.availability.update_one(
        {"date": availability.date},
        {"$set": availability.dict()},
        upsert=True
    )
    
    return {"message": "Müsaitlik güncellendi"}

@api_router.get("/admin/settings")
async def get_settings(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get all settings"""
    verify_token(credentials)
    settings = await db.settings.find().to_list(100)
    return [{**serialize_doc(s), "id": str(s["_id"])} for s in settings]

@api_router.put("/admin/settings")
async def update_setting(setting: SettingUpdate, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Update setting"""
    verify_token(credentials)
    
    await db.settings.update_one(
        {"key": setting.key},
        {"$set": {"value": setting.value}},
        upsert=True
    )
    
    return {"message": "Ayar güncellendi"}

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

@api_router.put("/admin/change-password")
async def change_admin_password(request: ChangePasswordRequest, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Change admin password"""
    verify_token(credentials)
    
    # Get current admin
    admin = await db.admins.find_one({"username": "admin"})
    if not admin:
        raise HTTPException(status_code=404, detail="Admin bulunamadı")
    
    # Verify current password
    if not bcrypt.checkpw(request.current_password.encode('utf-8'), admin["password"].encode('utf-8')):
        raise HTTPException(status_code=400, detail="Mevcut şifre yanlış")
    
    # Hash new password
    new_hashed = bcrypt.hashpw(request.new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    # Update password
    await db.admins.update_one(
        {"username": "admin"},
        {"$set": {"password": new_hashed}}
    )
    
    return {"message": "Şifre başarıyla değiştirildi"}

@api_router.get("/admin/stats")
async def get_stats(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get dashboard statistics"""
    verify_token(credentials)
    
    total_bookings = await db.bookings.count_documents({})
    pending_bookings = await db.bookings.count_documents({"status": "pending"})
    confirmed_bookings = await db.bookings.count_documents({"status": "confirmed"})
    completed_bookings = await db.bookings.count_documents({"status": "completed"})
    total_customers = await db.customers.count_documents({})
    total_reviews = await db.reviews.count_documents({})
    
    # Calculate revenue
    revenue_pipeline = [
        {"$match": {"status": {"$in": ["confirmed", "completed"]}}},
        {"$group": {"_id": None, "total": {"$sum": "$total_price"}}}
    ]
    revenue_result = await db.bookings.aggregate(revenue_pipeline).to_list(1)
    total_revenue = revenue_result[0]["total"] if revenue_result else 0
    
    return {
        "total_bookings": total_bookings,
        "pending_bookings": pending_bookings,
        "confirmed_bookings": confirmed_bookings,
        "completed_bookings": completed_bookings,
        "total_customers": total_customers,
        "total_reviews": total_reviews,
        "total_revenue": total_revenue
    }

@api_router.get("/admin/customers")
async def get_customers(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get all customers"""
    verify_token(credentials)
    customers = await db.customers.find().sort("created_at", -1).to_list(1000)
    return [{**serialize_doc(c), "id": str(c["_id"])} for c in customers]

@api_router.get("/admin/reviews")
async def get_admin_reviews(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get all reviews"""
    verify_token(credentials)
    reviews = await db.reviews.find().sort("created_at", -1).to_list(1000)
    return [{**serialize_doc(r), "id": str(r["_id"])} for r in reviews]

@api_router.delete("/admin/reviews/{review_id}")
async def delete_review(review_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Delete a review"""
    verify_token(credentials)
    result = await db.reviews.delete_one({"_id": ObjectId(review_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Değerlendirme bulunamadı")
    return {"message": "Değerlendirme silindi"}

@api_router.post("/admin/packages")
async def create_package(package: PackageCreate, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Create a new package"""
    verify_token(credentials)
    
    package_doc = {
        **package.dict(),
        "active": True,
        "created_at": datetime.utcnow().isoformat()
    }
    
    result = await db.packages.insert_one(package_doc)
    
    return {"id": str(result.inserted_id), "message": "Paket oluşturuldu"}

@api_router.get("/admin/packages")
async def get_admin_packages(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get all packages"""
    verify_token(credentials)
    packages = await db.packages.find().to_list(100)
    return [{**serialize_doc(p), "id": str(p["_id"])} for p in packages]

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
