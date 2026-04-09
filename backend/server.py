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

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

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

# --- General Routes ---
@api_router.get("/")
async def root():
    return {"message": "Celebration QR Experience API"}

@api_router.get("/themes")
async def get_themes():
    return THEMES

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
