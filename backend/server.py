from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Response, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Any
import uuid
import re
from datetime import datetime, timezone, timedelta

UUID_RE = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', re.IGNORECASE)

def safe_uuid(value: str, label: str = "ID") -> str:
    """Validate a UUID string to prevent NoSQL injection."""
    if not UUID_RE.match(value):
        raise HTTPException(status_code=400, detail=f"Invalid {label}")
    return value

def safe_event_id(event_id: str) -> str:
    return safe_uuid(event_id, "event ID")
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
import httpx
import asyncio
import firebase_admin
from firebase_admin import credentials as fb_credentials, messaging as fb_messaging

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')

# ─── Firebase Admin SDK init ──────────────────────────────────────────────────
# Expects FIREBASE_SERVICE_ACCOUNT_JSON env var containing the full JSON string
# of the service account key downloaded from Firebase Console.
_firebase_initialized = False
def _init_firebase():
    global _firebase_initialized
    if _firebase_initialized:
        return True
    # Support both env var names
    sa_json = os.environ.get('FIREBASE_SERVICE_ACCOUNT_JSON') or os.environ.get('FIREBASE_CREDENTIALS', '')
    if not sa_json:
        return False
    try:
        sa_dict = json.loads(sa_json)
        cred = fb_credentials.Certificate(sa_dict)
        if not firebase_admin._apps:
            firebase_admin.initialize_app(cred)
        _firebase_initialized = True
        return True
    except Exception as e:
        logging.getLogger(__name__).warning(f'Firebase Admin init failed: {e}')
        return False

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
JWT_SECRET = os.environ.get('JWT_SECRET')
if not JWT_SECRET:
    raise RuntimeError('JWT_SECRET env var is not set — refusing to start with a weak default')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRE_DAYS = 30
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', '')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', '')
GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID', '')

# Email config for OTP
SMTP_HOST = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
SMTP_PORT = int(os.environ.get('SMTP_PORT', '587'))
SMTP_USER = os.environ.get('SMTP_USER', ADMIN_EMAIL)
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')

# OTP storage (in-memory, expires in 10 min)
otp_store = {}

def _cleanup_otp_store():
    """Remove expired OTPs to prevent unbounded memory growth."""
    now = datetime.now(timezone.utc)
    expired = [k for k, v in otp_store.items() if now > v['expires']]
    for k in expired:
        del otp_store[k]

# ─── Free tier limits ────────────────────────────────────────────────────────
FREE_PHOTO_LIMIT = 4
PREMIUM_PHOTO_LIMIT = 25
FREE_THEMES = [
    "neon_cyber", "royal_gold",          # 2 boys
    "pink_pastel", "floral_elegant",      # 2 girls
    "romantic_red",                        # 1 anniversary
]
FREE_GAMES = ["balloon_pop"]

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
    "kaacha_mango": {"name": "Kaacha Mango", "category": "boys", "primary": "#6DBE45", "secondary": "#F4C430", "bg": "#1A2A0A"},
    "minimal_dark": {"name": "Minimal Dark", "category": "boys", "primary": "#FFFFFF", "secondary": "#64748B", "bg": "#18181B"},
    "pink_pastel": {"name": "Pink Pastel", "category": "girls", "primary": "#FF69B4", "secondary": "#FFB6C1", "bg": "#FFF0F5"},
    "floral_elegant": {"name": "Floral Elegant", "category": "girls", "primary": "#E8B4BC", "secondary": "#98D8C8", "bg": "#FDF5E6"},
    "glitter_party": {"name": "Glitter Party", "category": "girls", "primary": "#FF1493", "secondary": "#FFD700", "bg": "#1A0A1A"},
    "cute_cartoon": {"name": "Cute Cartoon", "category": "girls", "primary": "#FF6B6B", "secondary": "#4ECDC4", "bg": "#FFF5EE"},
    "kaacha_mango_girls": {"name": "Kaacha Mango", "category": "girls", "primary": "#7EC850", "secondary": "#FFC300", "bg": "#F0F8E8"},
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

# --- Games Config Models ---
# Designed to be forward-compatible: new games only need a new key in games_config dict.
# Each game entry: { enabled, order, difficulty, settings: {...game-specific fields} }
class GameSettings(BaseModel):
    """Generic per-game settings bag. Accepts any keys for forward compatibility."""
    model_config = ConfigDict(extra="allow")

class GameEntry(BaseModel):
    """Configuration for one game in the journey."""
    model_config = ConfigDict(extra="allow")
    enabled: bool = False
    order: int = 0  # lower = earlier in journey
    difficulty: Optional[str] = None  # easy | medium | hard
    settings: Optional[dict] = None   # game-specific blob

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
    custom_background_url: Optional[str] = None
    custom_font: Optional[str] = None
    timeline: List[TimelineItem] = []
    easter_egg_message: Optional[str] = None
    lock_pin: Optional[str] = None
    lock_hint: Optional[str] = None
    flip_cards: List[str] = []
    # games_config: dict keyed by game_id -> GameEntry dict
    # Example: { "lucky_gift": {"enabled": true, "order": 1, "settings": {"box_count": 9}} }
    games_config: Optional[dict] = None

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
    custom_background_url: Optional[str] = None
    custom_font: Optional[str] = None
    timeline: List[TimelineItem] = []
    easter_egg_message: Optional[str] = None
    lock_pin: Optional[str] = None
    lock_hint: Optional[str] = None
    flip_cards: List[str] = []
    games_config: Optional[dict] = None
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
    custom_background_url: Optional[str] = None
    custom_font: Optional[str] = None
    timeline: Optional[List[TimelineItem]] = None
    easter_egg_message: Optional[str] = None
    lock_pin: Optional[str] = None
    lock_hint: Optional[str] = None
    flip_cards: Optional[List[str]] = None
    games_config: Optional[dict] = None

class FileUploadResponse(BaseModel):
    url: str
    path: str
    size: int

# ─── Notification helper ─────────────────────────────────────────────────────
async def create_notification(user_id: str, title: str, message: str, notif_type: str = "system"):
    notif = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "title": title,
        "message": message,
        "type": notif_type,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "is_read": False,
    }
    await db.notifications.insert_one(notif)

# ─── Premium helper ───────────────────────────────────────────────────────────
async def is_premium(user_id: str) -> bool:
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        return False
    if not user.get("premium_active"):
        return False
    if user.get("premium_type") == "lifetime":
        return True
    expiry = user.get("premium_expiry_date")
    if expiry:
        exp_dt = datetime.fromisoformat(expiry) if isinstance(expiry, str) else expiry
        if exp_dt.tzinfo is None:
            exp_dt = exp_dt.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) > exp_dt:
            await db.users.update_one({"id": user_id}, {"$set": {"premium_active": False}})
            await create_notification(user_id, "Premium Expired", "Your Premium membership has expired.", "premium")
            return False
    return True

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
        "premium_active": False,
        "premium_type": None,
        "premium_start_date": None,
        "premium_expiry_date": None,
        "vip_friend": False,
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
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    # Google OAuth users have empty password — block password login for them
    if not user.get("password"):
        raise HTTPException(status_code=401, detail="Please sign in with Google")
    if not verify_password(body.password, user["password"]):
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
    # Admin is not stored in MongoDB — return a synthetic full profile
    if current_user.get("role") == "admin":
        return {
            "id": "admin",
            "name": "Admin",
            "email": current_user["email"],
            "role": "admin",
            "premium_active": True,
            "vip_friend": True,
            "premium_type": "lifetime",
            "premium_expiry_date": None,
        }
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0, "password": 0})
    if user:
        user["premium_active"] = await is_premium(current_user["id"])
        return user
    return current_user

# Forgot password - send OTP
@api_router.post("/auth/forgot-password")
async def forgot_password(body: ForgotPasswordRequest):
    user = await db.users.find_one({"email": body.email.lower()}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Email not found")
    
    otp = str(random.randint(100000, 999999))
    _cleanup_otp_store()
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
    
    # Brute-force guard: max 5 attempts per OTP
    attempts = stored.get('attempts', 0)
    if attempts >= 5:
        del otp_store[email]
        raise HTTPException(status_code=400, detail="Too many attempts. Request a new OTP.")
    if stored['otp'] != body.otp:
        otp_store[email]['attempts'] = attempts + 1
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
    if current_user.get("role") == "admin":
        return {"id": "admin", "name": "Admin", "email": current_user["email"], "role": "admin", "premium_active": True, "vip_friend": True}
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user["premium_active"] = await is_premium(current_user["id"])
    return user

@api_router.put("/profile")
async def update_profile(body: dict, current_user=Depends(get_current_user)):
    if current_user.get("role") == "admin":
        raise HTTPException(status_code=400, detail="Admin profile cannot be edited")
    allowed = {"name", "mobile", "bio", "avatar_url"}
    update_data = {k: v for k, v in body.items() if k in allowed}
    if not update_data:
        raise HTTPException(status_code=400, detail="Nothing to update")
    # Sanitise field lengths
    if "name" in update_data:
        update_data["name"] = str(update_data["name"])[:100].strip()
    if "mobile" in update_data:
        update_data["mobile"] = str(update_data["mobile"])[:20].strip()
    if "bio" in update_data:
        update_data["bio"] = str(update_data["bio"])[:200].strip()
    if "avatar_url" in update_data:
        url = str(update_data["avatar_url"])[:500]
        if url and not url.startswith(("https://res.cloudinary.com", "https://")):
            raise HTTPException(status_code=400, detail="Invalid avatar URL")
        update_data["avatar_url"] = url
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
    ALLOWED = ['photos', 'videos', 'voice', 'songs', 'avatars', 'game_assets']
    if folder not in ALLOWED:
        raise HTTPException(status_code=400, detail="Invalid folder")
    timestamp = int(time.time())
    cloud_folder = f"celebration-qr/{folder}"
    params = f"folder={cloud_folder}&timestamp={timestamp}"
    signature = hashlib.sha256(f"{params}{os.environ.get('CLOUDINARY_API_SECRET')}".encode()).hexdigest()
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

    user_premium = current_user["role"] == "admin" or await is_premium(current_user["id"])

    if not user_premium:
        # Photo limit
        if len(input.photos) > FREE_PHOTO_LIMIT:
            raise HTTPException(status_code=403, detail=f"Free plan allows up to {FREE_PHOTO_LIMIT} photos. Upgrade to Premium for {PREMIUM_PHOTO_LIMIT} photos.")
        # Video restriction
        if input.video_url:
            raise HTTPException(status_code=403, detail="Video uploads are available for Premium members.")
        # Theme restriction
        if input.theme not in FREE_THEMES:
            raise HTTPException(status_code=403, detail="This theme is available for Premium members.")
        # Game restriction
        if input.games_config:
            for game_id, cfg in input.games_config.items():
                if cfg.get("enabled") and game_id not in FREE_GAMES:
                    raise HTTPException(status_code=403, detail="This game is available for Premium members.")
    else:
        if len(input.photos) > PREMIUM_PHOTO_LIMIT:
            raise HTTPException(status_code=403, detail=f"Premium plan allows up to {PREMIUM_PHOTO_LIMIT} photos.")

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
    user_id = safe_uuid(user_id, "user ID")
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    await db.events.delete_many({"user_id": user_id})
    await db.notifications.delete_many({"user_id": user_id})
    return {"message": "User and their events deleted"}

# Admin users
@api_router.get("/admin/users")
async def admin_users(current_user=Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    result = []
    for u in users:
        events = await db.events.find({"user_id": u["id"]}, {"_id": 0, "id": 1, "person_name": 1, "occasion_type": 1, "lock_pin": 1, "view_count": 1}).to_list(100)
        premium = await is_premium(u["id"])
        result.append({
            "id": u["id"],
            "name": u["name"],
            "email": u["email"],
            "premium_active": premium,
            "premium_type": u.get("premium_type"),
            "premium_expiry_date": u.get("premium_expiry_date"),
            "vip_friend": u.get("vip_friend", False),
            "events": events,
        })
    return result

# ─── Premium / VIP management ─────────────────────────────────────────────────
class PremiumGrantRequest(BaseModel):
    user_id: str
    subscription_type: str  # 1month | 6months | 1year | 5years | lifetime | custom
    custom_expiry: Optional[str] = None  # ISO date string for custom

class VIPRequest(BaseModel):
    user_id: str
    vip: bool

class GiftPremiumRequest(BaseModel):
    user_id: str
    subscription_type: str
    custom_expiry: Optional[str] = None

class BroadcastRequest(BaseModel):
    title: str
    message: str
    target: str  # all | premium | free | vip | specific
    target_user_id: Optional[str] = None

def _calc_expiry(subscription_type: str, custom_expiry: Optional[str]) -> Optional[str]:
    now = datetime.now(timezone.utc)
    mapping = {
        "1month": timedelta(days=30),
        "6months": timedelta(days=183),
        "1year": timedelta(days=365),
        "5years": timedelta(days=365 * 5),
    }
    if subscription_type == "lifetime":
        return None
    if subscription_type == "custom" and custom_expiry:
        return custom_expiry
    delta = mapping.get(subscription_type)
    if delta:
        return (now + delta).isoformat()
    return None

@api_router.post("/admin/premium/grant")
async def grant_premium(body: PremiumGrantRequest, current_user=Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    user_id = safe_uuid(body.user_id, "user ID")
    expiry = _calc_expiry(body.subscription_type, body.custom_expiry)
    update = {
        "premium_active": True,
        "premium_type": body.subscription_type,
        "premium_start_date": datetime.now(timezone.utc).isoformat(),
        "premium_expiry_date": expiry,
    }
    result = await db.users.update_one({"id": user_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    await notify_and_push(user_id, "Premium Activated", "Your Premium membership is now active.", "premium")
    return {"message": "Premium granted"}

@api_router.post("/admin/premium/remove")
async def remove_premium(body: dict, current_user=Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    user_id = safe_uuid(body.get("user_id", ""), "user ID")
    await db.users.update_one({"id": user_id}, {"$set": {"premium_active": False, "premium_type": None, "premium_expiry_date": None}})
    return {"message": "Premium removed"}

@api_router.post("/admin/premium/gift")
async def gift_premium(body: GiftPremiumRequest, current_user=Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    user_id = safe_uuid(body.user_id, "user ID")
    expiry = _calc_expiry(body.subscription_type, body.custom_expiry)
    update = {
        "premium_active": True,
        "premium_type": body.subscription_type,
        "premium_start_date": datetime.now(timezone.utc).isoformat(),
        "premium_expiry_date": expiry,
    }
    result = await db.users.update_one({"id": user_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    await notify_and_push(user_id, "Premium Gift Received", "You have received Premium access.", "premium")
    return {"message": "Premium gifted"}

@api_router.post("/admin/vip")
async def set_vip(body: VIPRequest, current_user=Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    user_id = safe_uuid(body.user_id, "user ID")
    result = await db.users.update_one({"id": user_id}, {"$set": {"vip_friend": body.vip}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    if body.vip:
        await notify_and_push(user_id, "VIP Friend Status", "You have been granted VIP Friend status.", "vip")
    return {"message": "VIP updated"}

@api_router.post("/admin/broadcast")
async def broadcast(body: BroadcastRequest, current_user=Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    if body.target == "specific":
        if not body.target_user_id:
            raise HTTPException(status_code=400, detail="target_user_id required for specific target")
        user_id = safe_uuid(body.target_user_id, "user ID")
        await notify_and_push(user_id, body.title, body.message, "announcement")
        return {"message": "Sent to 1 user"}
    query = {}
    if body.target == "premium":
        query = {"premium_active": True}
    elif body.target == "free":
        query = {"$or": [{"premium_active": False}, {"premium_active": {"$exists": False}}]}
    elif body.target == "vip":
        query = {"vip_friend": True}
    users = await db.users.find(query, {"_id": 0, "id": 1}).to_list(10000)
    for u in users:
        await notify_and_push(u["id"], body.title, body.message, "announcement")
    return {"message": f"Sent to {len(users)} users"}

# ─── Notifications ────────────────────────────────────────────────────────────
@api_router.get("/notifications")
async def get_notifications(current_user=Depends(get_current_user)):
    notifs = await db.notifications.find(
        {"user_id": current_user["id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return notifs

@api_router.post("/notifications/{notif_id}/read")
async def mark_read(notif_id: str, current_user=Depends(get_current_user)):
    notif_id = safe_uuid(notif_id, "notification ID")
    await db.notifications.update_one(
        {"id": notif_id, "user_id": current_user["id"]},
        {"$set": {"is_read": True}}
    )
    return {"message": "Marked as read"}

@api_router.post("/notifications/read-all")
async def mark_all_read(current_user=Depends(get_current_user)):
    await db.notifications.update_many(
        {"user_id": current_user["id"], "is_read": False},
        {"$set": {"is_read": True}}
    )
    return {"message": "All marked as read"}

# ─── FCM token registration ───────────────────────────────────────────────────
@api_router.post("/notifications/register-token")
async def register_fcm_token(body: dict, current_user=Depends(get_current_user)):
    token = body.get("token", "").strip()
    if not token:
        raise HTTPException(status_code=400, detail="Token required")
    await db.users.update_one({"id": current_user["id"]}, {"$set": {"fcm_token": token}})
    return {"message": "Token registered"}

# ─── FCM push helper (Firebase Admin SDK v1 API) ──────────────────────────────
async def send_push(user_id: str, title: str, body: str):
    """Send FCM push via Firebase Admin SDK. Silently skips if not configured."""
    if not _init_firebase():
        return
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "fcm_token": 1})
    if not user or not user.get("fcm_token"):
        return
    try:
        message = fb_messaging.Message(
            notification=fb_messaging.Notification(title=title, body=body),
            data={"title": title, "body": body},
            token=user["fcm_token"],
        )
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, fb_messaging.send, message)
    except Exception as e:
        logger.warning(f"FCM push failed for user {user_id}: {e}")

async def notify_and_push(user_id: str, title: str, message: str, notif_type: str = "system"):
    """Create in-app notification AND send FCM push."""
    await create_notification(user_id, title, message, notif_type)
    await send_push(user_id, title, message)

# ─── Support Tickets ──────────────────────────────────────────────────────────
class TicketCreate(BaseModel):
    subject: str
    message: str

class TicketReply(BaseModel):
    admin_reply: str

@api_router.post("/support/tickets")
async def create_ticket(body: TicketCreate, current_user=Depends(get_current_user)):
    if not body.subject.strip() or not body.message.strip():
        raise HTTPException(status_code=400, detail="Subject and message required")
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0})
    now = datetime.now(timezone.utc).isoformat()
    ticket = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "user_name": user.get("name", "") if user else "",
        "user_email": current_user["email"],
        "subject": body.subject.strip()[:200],
        "message": body.message.strip()[:2000],
        "status": "open",
        "admin_reply": None,
        "created_at": now,
        "updated_at": now,
        "resolved_at": None,
    }
    await db.support_tickets.insert_one(ticket)
    return {k: v for k, v in ticket.items() if k != "_id"}

@api_router.get("/support/tickets")
async def get_my_tickets(current_user=Depends(get_current_user)):
    tickets = await db.support_tickets.find(
        {"user_id": current_user["id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return tickets

@api_router.get("/admin/support/tickets")
async def admin_get_tickets(current_user=Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    tickets = await db.support_tickets.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return tickets

@api_router.post("/admin/support/tickets/{ticket_id}/reply")
async def admin_reply_ticket(ticket_id: str, body: TicketReply, current_user=Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    ticket_id = safe_uuid(ticket_id, "ticket ID")
    ticket = await db.support_tickets.find_one({"id": ticket_id}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    now = datetime.now(timezone.utc).isoformat()
    await db.support_tickets.update_one(
        {"id": ticket_id},
        {"$set": {
            "admin_reply": body.admin_reply.strip(),
            "status": "in_progress",
            "updated_at": now,
        }}
    )
    await notify_and_push(
        ticket["user_id"],
        "Support Team Replied",
        "You have received a reply from support.",
        "system"
    )
    return {"message": "Reply sent"}

@api_router.post("/admin/support/tickets/{ticket_id}/status")
async def admin_update_ticket_status(ticket_id: str, body: dict, current_user=Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    ticket_id = safe_uuid(ticket_id, "ticket ID")
    status = body.get("status", "")
    if status not in ("open", "in_progress", "resolved"):
        raise HTTPException(status_code=400, detail="Invalid status")
    ticket = await db.support_tickets.find_one({"id": ticket_id}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    now = datetime.now(timezone.utc).isoformat()
    update = {"status": status, "updated_at": now}
    if status == "resolved":
        update["resolved_at"] = now
    await db.support_tickets.update_one({"id": ticket_id}, {"$set": update})
    if status == "resolved":
        await notify_and_push(
            ticket["user_id"],
            "Support Request Resolved",
            "Your support request has been resolved.",
            "system"
        )
    return {"message": "Status updated"}

# ─── Premium expiry check (called on demand or can be scheduled) ───────────────
@api_router.post("/admin/check-expiry")
async def check_expiry(current_user=Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    now = datetime.now(timezone.utc)
    soon = now + timedelta(days=7)
    # Find active non-lifetime premium users
    users = await db.users.find(
        {"premium_active": True, "premium_type": {"$ne": "lifetime"}, "premium_expiry_date": {"$ne": None}},
        {"_id": 0, "id": 1, "premium_expiry_date": 1}
    ).to_list(10000)
    notified_expiring = 0
    notified_expired = 0
    for u in users:
        expiry_str = u.get("premium_expiry_date")
        if not expiry_str:
            continue
        exp_dt = datetime.fromisoformat(expiry_str)
        if exp_dt.tzinfo is None:
            exp_dt = exp_dt.replace(tzinfo=timezone.utc)
        if exp_dt < now:
            await db.users.update_one({"id": u["id"]}, {"$set": {"premium_active": False}})
            await notify_and_push(u["id"], "Premium Expired", "Your Premium membership has expired.", "premium")
            notified_expired += 1
        elif exp_dt < soon:
            await notify_and_push(u["id"], "Premium Expiring Soon", "Your Premium membership expires in 7 days.", "premium")
            notified_expiring += 1
    return {"expired": notified_expired, "expiring_soon": notified_expiring}

# NOTE: /notifications/register-token is defined above (register_fcm_token). Duplicate removed.

# --- Admin test notification ---
class TestNotificationRequest(BaseModel):
    user_id: str
    title: str = "Test Notification"
    body: str = "Celebration QR notification test"

@api_router.post("/admin/test-notification")
async def test_notification(body: TestNotificationRequest, current_user=Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    
    user = await db.users.find_one({"id": body.user_id}, {"_id": 0, "fcm_token": 1})
    if not user or not user.get("fcm_token"):
        raise HTTPException(status_code=404, detail="User has no FCM token")
    
    fcm_token = user["fcm_token"]
    
    # Send via FCM HTTP v1 API using service account
    firebase_creds_str = os.environ.get('FIREBASE_CREDENTIALS', '')
    if not firebase_creds_str:
        raise HTTPException(status_code=503, detail="Firebase credentials not configured")
    
    try:
        import google.auth
        import google.auth.transport.requests
        from google.oauth2 import service_account
        import json as json_lib
        
        creds_dict = json_lib.loads(firebase_creds_str)
        project_id = creds_dict.get('project_id')
        
        credentials = service_account.Credentials.from_service_account_info(
            creds_dict,
            scopes=['https://www.googleapis.com/auth/firebase.messaging']
        )
        credentials.refresh(google.auth.transport.requests.Request())
        
        resp = http_requests.post(
            f"https://fcm.googleapis.com/v1/projects/{project_id}/messages:send",
            headers={
                "Authorization": f"Bearer {credentials.token}",
                "Content-Type": "application/json",
            },
            json={
                "message": {
                    "token": fcm_token,
                    "notification": {"title": body.title, "body": body.body},
                    "android": {"priority": "high"},
                }
            },
            timeout=10
        )
        resp.raise_for_status()
        return {"message": "Notification sent", "fcm_response": resp.json()}
    except Exception as e:
        logger.error(f"FCM send error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to send notification: {str(e)}")

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

# ─── Payment QR setting ───────────────────────────────────────────────────────
@api_router.get("/settings/payment-qr")
async def get_payment_qr():
    doc = await db.settings.find_one({"key": "payment_qr_url"}, {"_id": 0})
    return {"url": doc["value"] if doc else None}

@api_router.post("/admin/settings/payment-qr")
async def set_payment_qr(body: dict, current_user=Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    url = body.get("url", "").strip()
    await db.settings.update_one(
        {"key": "payment_qr_url"},
        {"$set": {"key": "payment_qr_url", "value": url}},
        upsert=True
    )
    return {"url": url}

# ─── Payment Requests ─────────────────────────────────────────────────────────
PLAN_TO_SUB_TYPE = {
    "1month": "1month",
    "6months": "6months",
    "1year": "1year",
    "5years": "5years",
    "lifetime": "lifetime",
}

class PaymentRequestCreate(BaseModel):
    plan_type: str
    screenshot_url: str

@api_router.post("/payment-requests")
async def create_payment_request(body: PaymentRequestCreate, current_user=Depends(get_current_user)):
    if current_user["role"] == "admin":
        raise HTTPException(status_code=400, detail="Admin cannot submit payment requests")
    # Block duplicate pending
    existing = await db.payment_requests.find_one({
        "user_id": current_user["id"],
        "status": "pending"
    })
    if existing:
        raise HTTPException(status_code=400, detail="You already have a pending payment request")
    if body.plan_type not in PLAN_TO_SUB_TYPE:
        raise HTTPException(status_code=400, detail="Invalid plan type")
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0})
    req = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "user_name": user.get("name", "") if user else "",
        "user_email": current_user["email"],
        "plan_type": body.plan_type,
        "screenshot_url": body.screenshot_url,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "reviewed_at": None,
        "reviewed_by": None,
    }
    await db.payment_requests.insert_one(req)
    await create_notification(
        current_user["id"],
        "Payment Submitted",
        "Your payment proof has been submitted. We'll review it shortly.",
        "premium"
    )
    return {k: v for k, v in req.items() if k != "_id"}

@api_router.get("/payment-requests/my")
async def get_my_payment_requests(current_user=Depends(get_current_user)):
    reqs = await db.payment_requests.find(
        {"user_id": current_user["id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(20)
    return reqs

@api_router.get("/admin/payment-requests")
async def admin_get_payment_requests(current_user=Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    reqs = await db.payment_requests.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return reqs

@api_router.post("/admin/payment-requests/{req_id}/approve")
async def approve_payment_request(req_id: str, current_user=Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    req_id = safe_uuid(req_id, "request ID")
    req = await db.payment_requests.find_one({"id": req_id}, {"_id": 0})
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    if req["status"] != "pending":
        raise HTTPException(status_code=400, detail="Request already reviewed")
    # Activate premium using existing subscription system
    sub_type = PLAN_TO_SUB_TYPE.get(req["plan_type"], "1month")
    expiry = _calc_expiry(sub_type, None)
    await db.users.update_one(
        {"id": req["user_id"]},
        {"$set": {
            "premium_active": True,
            "premium_type": sub_type,
            "premium_start_date": datetime.now(timezone.utc).isoformat(),
            "premium_expiry_date": expiry,
        }}
    )
    await db.payment_requests.update_one(
        {"id": req_id},
        {"$set": {
            "status": "approved",
            "reviewed_at": datetime.now(timezone.utc).isoformat(),
            "reviewed_by": current_user["email"],
        }}
    )
    await notify_and_push(
        req["user_id"],
        "Premium Activated",
        "Your Premium membership has been activated successfully.",
        "premium"
    )
    return {"message": "Approved and premium activated"}

@api_router.post("/admin/payment-requests/{req_id}/reject")
async def reject_payment_request(req_id: str, current_user=Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    req_id = safe_uuid(req_id, "request ID")
    req = await db.payment_requests.find_one({"id": req_id}, {"_id": 0})
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    if req["status"] != "pending":
        raise HTTPException(status_code=400, detail="Request already reviewed")
    await db.payment_requests.update_one(
        {"id": req_id},
        {"$set": {
            "status": "rejected",
            "reviewed_at": datetime.now(timezone.utc).isoformat(),
            "reviewed_by": current_user["email"],
        }}
    )
    await notify_and_push(
        req["user_id"],
        "Payment Verification Failed",
        "Your payment proof could not be verified. Please contact support if needed.",
        "premium"
    )
    return {"message": "Rejected"}

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
    event_id = safe_uuid(event_id, "event ID")
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

_cors_origins_raw = os.environ.get('CORS_ORIGINS', '')
_cors_origins = [o.strip() for o in _cors_origins_raw.split(',') if o.strip()] or ['*']

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=_cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(name)s %(levelname)s %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup():
    logger.info("Celebration QR API started")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
