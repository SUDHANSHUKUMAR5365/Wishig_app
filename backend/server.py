from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Response, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
import re
from datetime import datetime, timezone, timedelta

def safe_event_id(event_id: str) -> str:
    """Validate event_id is a UUID to prevent NoSQL injection."""
    if not re.fullmatch(r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', event_id, re.IGNORECASE):
        raise HTTPException(status_code=400, detail="Invalid event ID")
    return event_id
import cloudinary
import cloudinary.uploader
from jose import JWTError, jwt
from passlib.context import CryptContext
import requests as http_requests
import random
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')

# MongoDB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Cloudinary
cloudinary.config(
    cloud_name=os.environ.get('CLOUDINARY_CLOUD_NAME'),
    api_key=os.environ.get('CLOUDINARY_API_KEY'),
    api_secret=os.environ.get('CLOUDINARY_API_SECRET'),
    secure=True
)

# Auth config
JWT_SECRET = os.environ.get('JWT_SECRET', 'celebration_secret_key')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRE_DAYS = 30
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'kumarsudhanshurakesh@gmail.com')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'Sud@5365#')
GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID', '')

# Email config for OTP
SMTP_HOST = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
SMTP_PORT = int(os.environ.get('SMTP_PORT', '587'))
SMTP_USER = os.environ.get('SMTP_USER', ADMIN_EMAIL)
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')

# OTP storage (in-memory, expires in 10 min)
otp_store = {}

pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')
security = HTTPBearer(auto_error=False)

app = FastAPI()
api_router = APIRouter(prefix="/api")

# --- Auth Helpers ---
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_token(data: dict) -> str:
    payload = data.copy()
    payload['exp'] = datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRE_DAYS)
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_optional_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        return None
    try:
        return jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        return None

# --- Auth Models ---
class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class GoogleAuthRequest(BaseModel):
    token: str

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    email: str
    otp: str
    new_password: str

class AuthResponse(BaseModel):
    token: str
    user: dict

# --- Theme definitions ---
THEMES = {
    "neon_cyber": {"name": "Neon Cyber", "category": "boys", "primary": "#00D4FF", "secondary": "#8B5CF6", "bg": "#0A0A1A"},
    "royal_gold": {"name": "Royal Gold", "category": "boys", "primary": "#FFD700", "secondary": "#1A1A2E", "bg": "#0D0D0D"},
    "gaming_rgb": {"name": "Gaming RGB", "category": "boys", "primary": "#FF0080", "secondary": "#00FF88", "bg": "#0F0F23"},
    "minimal_dark": {"name": "Minimal Dark", "category": "boys", "primary": "#FFFFFF", "secondary": "#64748B", "bg": "#18181B"},
    "pink_pastel": {"name": "Pink Pastel", "category": "girls", "primary": "#FF69B4", "secondary": "#FFB6C1", "bg": "#FFF0F5"},
    "floral_elegant": {"name": "Floral Elegant", "category": "girls", "primary": "#E8B4BC", "secondary": "#98D8C8", "bg": "#FDF5E6"},
    "glitter_party": {"name": "Glitter Party", "category": "girls", "primary": "#FF1493", "secondary": "#FFD700", "bg": "#1A0A1A"},
    "cute_cartoon": {"name": "Cute Cartoon", "category": "girls", "primary": "#FF6B6B", "secondary": "#4ECDC4", "bg": "#FFF5EE"},
    "romantic_red": {"name": "Romantic Red", "category": "anniversary", "primary": "#DC143C", "secondary": "#8B0000", "bg": "#1A0A0A"},
    "golden_love": {"name": "Golden Love", "category": "anniversary", "primary": "#DAA520", "secondary": "#8B4513", "bg": "#0D0D0D"},
    "memory_lane": {"name": "Memory Lane", "category": "anniversary", "primary": "#D2691E", "secondary": "#8B7355", "bg": "#FAF0E6"},
    "sunset_love": {"name": "Sunset Love", "category": "anniversary", "primary": "#FF6347", "secondary": "#FF8C00", "bg": "#1A0F0A"}
}

# --- Event Models ---
class PhotoItem(BaseModel):
    url: str
    caption: Optional[str] = None

class TimelineItem(BaseModel):
    year: str
    title: str
    description: str
    image_url: Optional[str] = None

class EventCreate(BaseModel):
    person_name: str
    occasion_type: str
    custom_occasion: Optional[str] = None
    event_date: str
    theme: str
    photos: List[PhotoItem] = []
    video_url: Optional[str] = None
    special_note: Optional[str] = None
    song_url: Optional[str] = None
    song_start: int = 0
    song_duration: int = 60
    custom_background_url: Optional[str] = None
    custom_font: Optional[str] = None
    timeline: List[TimelineItem] = []
    easter_egg_message: Optional[str] = None
    lock_pin: Optional[str] = None
    lock_hint: Optional[str] = None
    flip_cards: List[str] = []

class Event(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    person_name: str
    occasion_type: str
    custom_occasion: Optional[str] = None
    event_date: str
    theme: str
    photos: List[PhotoItem] = []
    video_url: Optional[str] = None
    special_note: Optional[str] = None
    song_url: Optional[str] = None
    song_start: int = 0
    song_duration: int = 60
    custom_background_url: Optional[str] = None
    custom_font: Optional[str] = None
    timeline: List[TimelineItem] = []
    easter_egg_message: Optional[str] = None
    lock_pin: Optional[str] = None
    lock_hint: Optional[str] = None
    flip_cards: List[str] = []
    user_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    view_count: int = 0

class EventUpdate(BaseModel):
    person_name: Optional[str] = None
    occasion_type: Optional[str] = None
    custom_occasion: Optional[str] = None
    event_date: Optional[str] = None
    theme: Optional[str] = None
    photos: Optional[List[PhotoItem]] = None
    video_url: Optional[str] = None
    special_note: Optional[str] = None
    song_url: Optional[str] = None
    song_start: Optional[int] = None
    song_duration: Optional[int] = None
    custom_background_url: Optional[str] = None
    custom_font: Optional[str] = None
    timeline: Optional[List[TimelineItem]] = None
    easter_egg_message: Optional[str] = None
    lock_pin: Optional[str] = None
    lock_hint: Optional[str] = None
    flip_cards: Optional[List[str]] = None

class FileUploadResponse(BaseModel):
    url: str
    path: str
    size: int

# --- Auth Routes ---
@api_router.post("/auth/register")
async def register(body: RegisterRequest):
    if await db.users.find_one({"email": body.email.lower()}):
        raise HTTPException(status_code=400, detail="Email already registered")
    user = {
        "id": str(uuid.uuid4()),
        "name": body.name,
        "email": body.email.lower(),
        "password": hash_password(body.password),
        "role": "user",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user)
    token = create_token({"id": user["id"], "email": user["email"], "name": user["name"], "role": "user"})
    return {"token": token, "user": {"id": user["id"], "name": user["name"], "email": user["email"], "role": "user"}}

@api_router.post("/auth/login")
async def login(body: LoginRequest):
    # Check admin
    if body.email.lower() == ADMIN_EMAIL.lower() and body.password == ADMIN_PASSWORD:
        token = create_token({"id": "admin", "email": ADMIN_EMAIL, "name": "Admin", "role": "admin"})
        return {"token": token, "user": {"id": "admin", "name": "Admin", "email": ADMIN_EMAIL, "role": "admin"}}
    # Check regular user
    user = await db.users.find_one({"email": body.email.lower()}, {"_id": 0})
    if not user or not verify_password(body.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_token({"id": user["id"], "email": user["email"], "name": user["name"], "role": user.get("role", "user")})
    return {"token": token, "user": {"id": user["id"], "name": user["name"], "email": user["email"], "role": user.get("role", "user")}}

@api_router.post("/auth/google")
async def google_auth(body: GoogleAuthRequest):
    try:
        GOOGLE_TOKEN_INFO_URL = "https://oauth2.googleapis.com/tokeninfo"
        resp = http_requests.get(GOOGLE_TOKEN_INFO_URL, params={"id_token": body.token}, timeout=10)
        info = resp.json()
        if "error" in info:
            raise HTTPException(status_code=401, detail="Invalid Google token")
        email = info["email"].lower()
        name = info.get("name", email.split("@")[0])
        # Check if admin
        role = "admin" if email == ADMIN_EMAIL.lower() else "user"
        # Upsert user
        user = await db.users.find_one({"email": email}, {"_id": 0})
        if not user:
            user = {"id": str(uuid.uuid4()), "name": name, "email": email, "password": "", "role": role, "created_at": datetime.now(timezone.utc).isoformat()}
            await db.users.insert_one(user)
        token = create_token({"id": user["id"], "email": email, "name": name, "role": role})
        return {"token": token, "user": {"id": user["id"], "name": name, "email": email, "role": role}}
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Google auth failed: {str(e)}")

@api_router.get("/auth/me")
async def get_me(current_user=Depends(get_current_user)):
    return current_user

# Forgot password - send OTP
@api_router.post("/auth/forgot-password")
async def forgot_password(body: ForgotPasswordRequest):
    user = await db.users.find_one({"email": body.email.lower()}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Email not found")
    
    otp = str(random.randint(100000, 999999))
    otp_store[body.email.lower()] = {"otp": otp, "expires": datetime.now(timezone.utc) + timedelta(minutes=10)}
    
    # Send email
    try:
        msg = MIMEMultipart()
        msg['From'] = SMTP_USER
        msg['To'] = body.email.lower()
        msg['Subject'] = 'Reset Your Password - Celebration QR'
        
        html = f"""
        <html>
          <body style="font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5;">
            <div style="max-width: 500px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px;">
              <h2 style="color: #D4AF37;">Reset Your Password</h2>
              <p>Your OTP code is:</p>
              <h1 style="color: #0A0F1F; letter-spacing: 5px; font-size: 32px;">{otp}</h1>
              <p style="color: #666;">This code expires in 10 minutes.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
              <p style="color: #999; font-size: 12px;">If you didn't request this, ignore this email.</p>
            </div>
          </body>
        </html>
        """
        msg.attach(MIMEText(html, 'html'))
        
        await aiosmtplib.send(
            msg,
            hostname=SMTP_HOST,
            port=SMTP_PORT,
            username=SMTP_USER,
            password=SMTP_PASSWORD,
            start_tls=True
        )
        return {"message": "OTP sent to your email"}
    except Exception as e:
        logger.error(f"Email send error: {e}")
        raise HTTPException(status_code=500, detail="Failed to send OTP email")

# Reset password with OTP
@api_router.post("/auth/reset-password")
async def reset_password(body: ResetPasswordRequest):
    email = body.email.lower()
    stored = otp_store.get(email)
    
    if not stored:
        raise HTTPException(status_code=400, detail="OTP not found or expired")
    
    if datetime.now(timezone.utc) > stored['expires']:
        del otp_store[email]
        raise HTTPException(status_code=400, detail="OTP expired")
    
    if stored['otp'] != body.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    # Update password
    result = await db.users.update_one(
        {"email": email},
        {"$set": {"password": hash_password(body.new_password)}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    del otp_store[email]
    return {"message": "Password reset successfully"}

# --- Profile ---
@api_router.get("/profile")
async def get_profile(current_user=Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@api_router.put("/profile")
async def update_profile(body: dict, current_user=Depends(get_current_user)):
    allowed = {"name", "mobile", "bio", "avatar_url"}
    update_data = {k: v for k, v in body.items() if k in allowed}
    if not update_data:
        raise HTTPException(status_code=400, detail="Nothing to update")
    await db.users.update_one({"id": current_user["id"]}, {"$set": update_data})
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0, "password": 0})
    return user
@api_router.get("/")
async def root():
    return {"message": "Celebration QR Experience API"}

@api_router.get("/themes")
async def get_themes():
    return THEMES

# --- Maintenance ---
@api_router.get("/admin/maintenance")
async def get_maintenance():
    doc = await db.settings.find_one({"key": "maintenance"}, {"_id": 0})
    return {"maintenance": doc["value"] if doc else False}

@api_router.post("/admin/maintenance")
async def set_maintenance(body: dict, current_user=Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    value = bool(body.get("maintenance", False))
    await db.settings.update_one({"key": "maintenance"}, {"$set": {"key": "maintenance", "value": value}}, upsert=True)
    return {"maintenance": value}

# --- Upload Signature (for direct browser upload) ---
@api_router.get("/upload/signature")
async def upload_signature(folder: str = "uploads", current_user=Depends(get_current_user)):
    import hashlib, time
    ALLOWED = ['photos', 'videos', 'voice', 'songs', 'avatars']
    if folder not in ALLOWED:
        raise HTTPException(status_code=400, detail="Invalid folder")
    timestamp = int(time.time())
    cloud_folder = f"celebration-qr/{folder}"
    params = f"folder={cloud_folder}&timestamp={timestamp}"
    signature = hashlib.sha1(f"{params}{os.environ.get('CLOUDINARY_API_SECRET')}".encode()).hexdigest()
    return {
        "signature": signature,
        "timestamp": timestamp,
        "folder": cloud_folder,
        "api_key": os.environ.get('CLOUDINARY_API_KEY'),
        "cloud_name": os.environ.get('CLOUDINARY_CLOUD_NAME'),
    }

# --- Upload ---
@api_router.post("/upload", response_model=FileUploadResponse)
async def upload_file(file: UploadFile = File(...), folder: str = "uploads"):
    try:
        data = await file.read()
        resource_type = "video" if file.content_type and file.content_type.startswith(("video", "audio")) else "image"
        result = cloudinary.uploader.upload(data, folder=f"celebration-qr/{folder}", resource_type=resource_type)
        return FileUploadResponse(url=result["secure_url"], path=result["public_id"], size=result.get("bytes", len(data)))
    except Exception as e:
        logger.error(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

# --- Event CRUD ---
@api_router.post("/events", response_model=Event)
async def create_event(input: EventCreate, current_user=Depends(get_current_user)):
    # Admin can always create; only block regular users during maintenance
    if current_user["role"] != "admin":
        doc = await db.settings.find_one({"key": "maintenance"}, {"_id": 0})
        if doc and doc.get("value"):
            raise HTTPException(status_code=503, detail="maintenance")
    event = Event(**input.model_dump(), user_id=current_user["id"])
    doc = event.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.events.insert_one(doc)
    return event

@api_router.get("/events", response_model=List[Event])
async def get_events(current_user=Depends(get_current_user)):
    query = {} if current_user["role"] == "admin" else {"user_id": current_user["id"]}
    projection = {"_id": 0}
    events = await db.events.find(query, projection).to_list(1000)
    for event in events:
        if isinstance(event.get('created_at'), str):
            event['created_at'] = datetime.fromisoformat(event['created_at'])
        if isinstance(event.get('updated_at'), str):
            event['updated_at'] = datetime.fromisoformat(event['updated_at'])
    return events

@api_router.get("/events/{event_id}", response_model=Event)
async def get_event(event_id: str):
    event_id = safe_event_id(event_id)
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if isinstance(event.get('created_at'), str):
        event['created_at'] = datetime.fromisoformat(event['created_at'])
    if isinstance(event.get('updated_at'), str):
        event['updated_at'] = datetime.fromisoformat(event['updated_at'])
    await db.events.update_one({"id": event_id}, {"$inc": {"view_count": 1}})
    return event

@api_router.put("/events/{event_id}", response_model=Event)
async def update_event(event_id: str, input: EventUpdate, current_user=Depends(get_current_user)):
    event_id = safe_event_id(event_id)
    query = {"id": event_id} if current_user["role"] == "admin" else {"id": event_id, "user_id": current_user["id"]}
    existing = await db.events.find_one(query, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Event not found")
    update_data = {k: v for k, v in input.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    await db.events.update_one({"id": event_id}, {"$set": update_data})
    updated = await db.events.find_one({"id": event_id}, {"_id": 0})
    if isinstance(updated.get('created_at'), str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    if isinstance(updated.get('updated_at'), str):
        updated['updated_at'] = datetime.fromisoformat(updated['updated_at'])
    return updated

@api_router.delete("/events/{event_id}")
async def delete_event(event_id: str, current_user=Depends(get_current_user)):
    event_id = safe_event_id(event_id)
    query = {"id": event_id} if current_user["role"] == "admin" else {"id": event_id, "user_id": current_user["id"]}
    result = await db.events.delete_one(query)
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    return {"message": "Event deleted successfully"}

# Admin delete user
@api_router.delete("/admin/users/{user_id}")
async def delete_user(user_id: str, current_user=Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    # Also delete their events
    await db.events.delete_many({"user_id": user_id})
    return {"message": "User and their events deleted"}

# Admin users
@api_router.get("/admin/users")
async def admin_users(current_user=Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    users = await db.users.find({}, {"_id": 0, "id": 1, "name": 1, "email": 1}).to_list(1000)
    # Attach each user's events (with lock_pin)
    result = []
    for u in users:
        events = await db.events.find({"user_id": u["id"]}, {"_id": 0, "id": 1, "person_name": 1, "occasion_type": 1, "lock_pin": 1, "view_count": 1}).to_list(100)
        result.append({"id": u["id"], "name": u["name"], "email": u["email"], "events": events})
    return result

# Admin stats
@api_router.get("/admin/stats")
async def admin_stats(current_user=Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    total_events = await db.events.count_documents({})
    total_users = await db.users.count_documents({})
    total_views = await db.events.aggregate([{"$group": {"_id": None, "total": {"$sum": "$view_count"}}}]).to_list(1)
    return {
        "total_events": total_events,
        "total_users": total_users,
        "total_views": total_views[0]["total"] if total_views else 0
    }

class AIMessageRequest(BaseModel):
    person_name: str
    occasion_type: str
    custom_occasion: Optional[str] = None
    tone: str = "heartfelt"

# --- Feedback ---
@api_router.post("/feedback")
async def submit_feedback(body: dict):
    event_id = body.get("event_id", "")
    stars = body.get("stars")
    if not event_id or not stars or not isinstance(stars, int) or stars < 1 or stars > 5:
        raise HTTPException(status_code=400, detail="event_id and stars (1-5) are required")
    feedback = {
        "id": str(uuid.uuid4()),
        "event_id": event_id,
        "stars": stars,
        "message": body.get("message", "").strip()[:500],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.feedback.insert_one(feedback)
    return {"message": "Thank you for your feedback!"}

@api_router.get("/admin/feedback")
async def get_feedback(current_user=Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    items = await db.feedback.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    # Attach event person_name
    for item in items:
        ev = await db.events.find_one({"id": item["event_id"]}, {"_id": 0, "person_name": 1, "occasion_type": 1})
        item["event_name"] = ev["person_name"] if ev else "Unknown"
        item["occasion_type"] = ev["occasion_type"] if ev else ""
    return items

@api_router.post("/ai/generate-message")
async def generate_message(body: AIMessageRequest, current_user=Depends(get_current_user)):
    key = os.environ.get('GEMINI_API_KEY', GEMINI_API_KEY)
    if not key:
        raise HTTPException(status_code=503, detail="AI not configured")
    
    occasion = body.custom_occasion if body.occasion_type == 'custom' and body.custom_occasion else body.occasion_type
    if body.tone == 'flipcards':
        prompt = f"Write exactly 6 short, heartfelt reasons why {body.person_name} is special for a {occasion} celebration. Each reason on a new line, numbered 1-6. Max 10 words each. Warm and personal."
    else:
        prompt = f"Write a {body.tone} {occasion} message for {body.person_name}. Keep it under 100 words, personal and warm. No quotes, just the message."
    
    try:
        resp = http_requests.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key={key}",
            json={"contents": [{"parts": [{"text": prompt}]}]},
            timeout=20
        )
        resp.raise_for_status()
        data = resp.json()
        text = data["candidates"][0]["content"]["parts"][0]["text"]
        return {"message": text.strip()}
    except Exception as e:
        logger.error(f"AI generate error: {e} | response: {resp.text if 'resp' in dir() else 'no response'}")
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup():
    logger.info("Celebration QR API started")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
