from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, date, time
from bson import ObjectId
import bcrypt
import jwt

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
    image: Optional[str] = None  # base64
    active: bool = True
    order: int = 0

class ServiceResponse(Service):
    id: str

class BookingCreate(BaseModel):
    service_id: str
    customer_name: str
    customer_phone: str
    customer_address: str
    booking_date: str  # YYYY-MM-DD
    booking_time: str  # HH:MM
    payment_method: str  # "online" or "cash"

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

class AdminLogin(BaseModel):
    username: str
    password: str

class AdminLoginResponse(BaseModel):
    token: str
    username: str

class AvailabilityDate(BaseModel):
    date: str  # YYYY-MM-DD
    available: bool
    time_slots: List[str] = []  # ["09:00", "10:00", "14:00"]

class AvailabilityResponse(BaseModel):
    dates: List[dict]

class SettingUpdate(BaseModel):
    key: str
    value: str

class BookingStatusUpdate(BaseModel):
    status: str  # "pending", "confirmed", "completed", "cancelled"

# ============== HELPER FUNCTIONS ==============

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

def is_friday(date_str: str) -> bool:
    """Check if date is Friday"""
    date_obj = datetime.strptime(date_str, "%Y-%m-%d")
    return date_obj.weekday() == 4  # Friday is 4

async def get_friday_discount() -> float:
    """Get Friday discount percentage from settings"""
    setting = await db.settings.find_one({"key": "friday_discount"})
    if setting:
        return float(setting.get("value", 10))
    return 10.0  # Default 10%

# ============== CUSTOMER APIs ==============

@api_router.get("/services")
async def get_services():
    """Get all active services"""
    services = await db.services.find({"active": True}).sort("order", 1).to_list(100)
    return [{**serialize_doc(s), "id": str(s["_id"])} for s in services]

@api_router.get("/availability")
async def get_availability(year: int, month: int):
    """Get availability for a specific month"""
    # Get all availability records for the month
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
async def get_time_slots(date: str):
    """Get available time slots for a specific date"""
    availability = await db.availability.find_one({"date": date})
    
    if not availability or not availability.get("available"):
        return {"slots": [], "all_slots": [], "booked_slots": [], "available": False}
    
    # Get booked slots for this date
    bookings = await db.bookings.find({
        "booking_date": date,
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
        raise HTTPException(status_code=404, detail="Service not found")
    
    # Check if slot is available
    availability = await db.availability.find_one({"date": booking.booking_date})
    if not availability or not availability.get("available"):
        raise HTTPException(status_code=400, detail="Date not available")
    
    if booking.booking_time not in availability.get("time_slots", []):
        raise HTTPException(status_code=400, detail="Time slot not available")
    
    # Check if already booked
    existing = await db.bookings.find_one({
        "booking_date": booking.booking_date,
        "booking_time": booking.booking_time,
        "status": {"$in": ["pending", "confirmed"]}
    })
    if existing:
        raise HTTPException(status_code=400, detail="Time slot already booked")
    
    # Calculate price with discount
    base_price = service["price"]
    discount = 0.0
    
    if is_friday(booking.booking_date):
        discount_percent = await get_friday_discount()
        discount = base_price * (discount_percent / 100)
    
    total_price = base_price - discount
    
    # Create booking
    booking_doc = {
        "service_id": booking.service_id,
        "service_name": service["name"],
        "customer_name": booking.customer_name,
        "customer_phone": booking.customer_phone,
        "customer_address": booking.customer_address,
        "booking_date": booking.booking_date,
        "booking_time": booking.booking_time,
        "total_price": total_price,
        "discount_applied": discount,
        "payment_method": booking.payment_method,
        "status": "pending",
        "created_at": datetime.utcnow().isoformat()
    }
    
    result = await db.bookings.insert_one(booking_doc)
    
    # Return clean serializable response
    response = {
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
    
    return response

@api_router.get("/bookings/check")
async def check_bookings(phone: str):
    """Get bookings by phone number"""
    bookings = await db.bookings.find({"customer_phone": phone}).sort("created_at", -1).to_list(100)
    return [{**serialize_doc(b), "id": str(b["_id"])} for b in bookings]

@api_router.put("/bookings/{booking_id}/cancel")
async def cancel_booking(booking_id: str, phone: str):
    """Cancel a booking by customer"""
    try:
        booking = await db.bookings.find_one({"_id": ObjectId(booking_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid booking ID")
    
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Verify phone number matches
    if booking["customer_phone"] != phone:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    # Check if booking can be cancelled
    if booking["status"] in ["cancelled", "completed"]:
        raise HTTPException(status_code=400, detail="Booking cannot be cancelled")
    
    # Update status to cancelled
    await db.bookings.update_one(
        {"_id": ObjectId(booking_id)},
        {"$set": {"status": "cancelled"}}
    )
    
    return {"message": "Booking cancelled successfully", "id": booking_id}

# ============== ADMIN APIs ==============

@api_router.post("/admin/login")
async def admin_login(login: AdminLogin):
    """Admin login"""
    admin = await db.admins.find_one({"username": login.username})
    
    if not admin:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Verify password
    if not bcrypt.checkpw(login.password.encode('utf-8'), admin["password"].encode('utf-8')):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Generate JWT token
    token = jwt.encode(
        {"username": admin["username"], "admin_id": str(admin["_id"])},
        JWT_SECRET,
        algorithm="HS256"
    )
    
    return {"token": token, "username": admin["username"]}

@api_router.post("/admin/init")
async def init_admin():
    """Initialize admin user (only if no admin exists)"""
    existing = await db.admins.find_one({})
    if existing:
        return {"message": "Admin already exists"}
    
    # Create default admin
    hashed = bcrypt.hashpw("admin123".encode('utf-8'), bcrypt.gensalt())
    admin = {
        "username": "admin",
        "password": hashed.decode('utf-8'),
        "created_at": datetime.utcnow().isoformat()
    }
    
    await db.admins.insert_one(admin)
    
    # Initialize default settings
    await db.settings.insert_one({"key": "friday_discount", "value": "10"})
    
    return {"message": "Admin created", "username": "admin", "password": "admin123"}

@api_router.get("/admin/bookings")
async def get_admin_bookings(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get all bookings (admin only)"""
    verify_token(credentials)
    bookings = await db.bookings.find().sort("created_at", -1).to_list(1000)
    return [{**serialize_doc(b), "id": str(b["_id"])} for b in bookings]

@api_router.put("/admin/bookings/{booking_id}")
async def update_booking_status(
    booking_id: str,
    update: BookingStatusUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update booking status (admin only)"""
    verify_token(credentials)
    
    result = await db.bookings.update_one(
        {"_id": ObjectId(booking_id)},
        {"$set": {"status": update.status}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    return {"message": "Booking updated"}

@api_router.get("/admin/services")
async def get_admin_services(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get all services (admin only)"""
    verify_token(credentials)
    services = await db.services.find().sort("order", 1).to_list(100)
    return [{**serialize_doc(s), "id": str(s["_id"])} for s in services]

@api_router.post("/admin/services")
async def create_service(
    service: Service,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create new service (admin only)"""
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
async def update_service(
    service_id: str,
    service: Service,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update service (admin only)"""
    verify_token(credentials)
    
    result = await db.services.update_one(
        {"_id": ObjectId(service_id)},
        {"$set": service.dict()}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Service not found")
    
    return {"message": "Service updated"}

@api_router.delete("/admin/services/{service_id}")
async def delete_service(
    service_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Delete service (admin only)"""
    verify_token(credentials)
    
    result = await db.services.delete_one({"_id": ObjectId(service_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Service not found")
    
    return {"message": "Service deleted"}

@api_router.get("/admin/availability")
async def get_admin_availability(
    year: int,
    month: int,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get availability for admin (admin only)"""
    verify_token(credentials)
    
    start_date = f"{year}-{month:02d}-01"
    end_date = f"{year}-{month:02d}-31"
    
    availability_docs = await db.availability.find({
        "date": {"$gte": start_date, "$lte": end_date}
    }).to_list(100)
    
    return [{**serialize_doc(a), "id": str(a["_id"])} for a in availability_docs]

@api_router.post("/admin/availability")
async def set_availability(
    availability: AvailabilityDate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Set availability for a date (admin only)"""
    verify_token(credentials)
    
    # Update or insert
    await db.availability.update_one(
        {"date": availability.date},
        {"$set": availability.dict()},
        upsert=True
    )
    
    return {"message": "Availability updated"}

@api_router.get("/admin/settings")
async def get_settings(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get all settings (admin only)"""
    verify_token(credentials)
    settings = await db.settings.find().to_list(100)
    return [{**serialize_doc(s), "id": str(s["_id"])} for s in settings]

@api_router.put("/admin/settings")
async def update_setting(
    setting: SettingUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update setting (admin only)"""
    verify_token(credentials)
    
    await db.settings.update_one(
        {"key": setting.key},
        {"$set": {"value": setting.value}},
        upsert=True
    )
    
    return {"message": "Setting updated"}

@api_router.get("/admin/stats")
async def get_stats(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get dashboard statistics (admin only)"""
    verify_token(credentials)
    
    total_bookings = await db.bookings.count_documents({})
    pending_bookings = await db.bookings.count_documents({"status": "pending"})
    confirmed_bookings = await db.bookings.count_documents({"status": "confirmed"})
    completed_bookings = await db.bookings.count_documents({"status": "completed"})
    
    return {
        "total_bookings": total_bookings,
        "pending_bookings": pending_bookings,
        "confirmed_bookings": confirmed_bookings,
        "completed_bookings": completed_bookings
    }

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
