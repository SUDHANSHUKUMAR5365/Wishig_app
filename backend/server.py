from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import requests

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Emergent Object Storage
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "celebration-qr"
storage_key = None

def init_storage():
    """Initialize storage and get session-scoped storage_key."""
    global storage_key
    if storage_key:
        return storage_key
    if not EMERGENT_KEY:
        raise ValueError("EMERGENT_LLM_KEY not configured")
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    storage_key = resp.json()["storage_key"]
    return storage_key

def put_object(path: str, data: bytes, content_type: str) -> dict:
    """Upload file to storage."""
    key = init_storage()
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120
    )
    resp.raise_for_status()
    return resp.json()

def get_object(path: str) -> tuple:
    """Download file from storage."""
    key = init_storage()
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key}, timeout=60
    )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

# MIME types
MIME_TYPES = {
    "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
    "gif": "image/gif", "webp": "image/webp", "mp4": "video/mp4",
    "mov": "video/quicktime", "mp3": "audio/mpeg", "wav": "audio/wav",
    "ogg": "audio/ogg", "webm": "video/webm", "m4a": "audio/mp4"
}

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Theme definitions
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

# Models
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
    voice_message_url: Optional[str] = None
    song_url: Optional[str] = None
    custom_background_url: Optional[str] = None
    custom_font: Optional[str] = None
    timeline: List[TimelineItem] = []
    easter_egg_message: Optional[str] = None

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
    voice_message_url: Optional[str] = None
    song_url: Optional[str] = None
    custom_background_url: Optional[str] = None
    custom_font: Optional[str] = None
    timeline: List[TimelineItem] = []
    easter_egg_message: Optional[str] = None
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
    voice_message_url: Optional[str] = None
    song_url: Optional[str] = None
    custom_background_url: Optional[str] = None
    custom_font: Optional[str] = None
    timeline: Optional[List[TimelineItem]] = None
    easter_egg_message: Optional[str] = None

class FileUploadResponse(BaseModel):
    url: str
    path: str
    size: int

# Routes
@api_router.get("/")
async def root():
    return {"message": "Celebration QR Experience API"}

@api_router.get("/themes")
async def get_themes():
    return THEMES

# File upload endpoint
@api_router.post("/upload", response_model=FileUploadResponse)
async def upload_file(file: UploadFile = File(...), folder: str = "uploads"):
    try:
        # Get file extension and content type
        ext = file.filename.split(".")[-1].lower() if "." in file.filename else "bin"
        content_type = file.content_type or MIME_TYPES.get(ext, "application/octet-stream")
        
        # Generate unique path
        file_id = str(uuid.uuid4())
        path = f"{APP_NAME}/{folder}/{file_id}.{ext}"
        
        # Read file data
        data = await file.read()
        
        # Upload to storage
        result = put_object(path, data, content_type)
        
        # Store file reference in DB
        await db.files.insert_one({
            "id": file_id,
            "storage_path": result["path"],
            "original_filename": file.filename,
            "content_type": content_type,
            "size": result.get("size", len(data)),
            "folder": folder,
            "is_deleted": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        # Return URL that can be used to fetch the file
        return FileUploadResponse(
            url=f"/api/files/{result['path']}",
            path=result["path"],
            size=result.get("size", len(data))
        )
    except Exception as e:
        logger.error(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

# File download endpoint
@api_router.get("/files/{path:path}")
async def download_file(path: str):
    try:
        # Check if file exists in DB
        record = await db.files.find_one({"storage_path": path, "is_deleted": False}, {"_id": 0})
        
        if not record:
            # Try to get directly from storage (for backward compatibility)
            try:
                data, content_type = get_object(path)
                return Response(content=data, media_type=content_type)
            except:
                raise HTTPException(status_code=404, detail="File not found")
        
        # Get from storage
        data, content_type = get_object(path)
        return Response(content=data, media_type=record.get("content_type", content_type))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Download error: {e}")
        raise HTTPException(status_code=500, detail=f"Download failed: {str(e)}")

# Event CRUD
@api_router.post("/events", response_model=Event)
async def create_event(input: EventCreate):
    event = Event(**input.model_dump())
    
    doc = event.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.events.insert_one(doc)
    return event

@api_router.get("/events", response_model=List[Event])
async def get_events(limit: int = 100, skip: int = 0):
    # Optimized query with field projection for list view
    projection = {
        "_id": 0,
        "id": 1,
        "person_name": 1,
        "occasion_type": 1,
        "custom_occasion": 1,
        "event_date": 1,
        "theme": 1,
        "view_count": 1,
        "created_at": 1,
        "updated_at": 1,
        "photos": 1,
        "video_url": 1,
        "special_note": 1,
        "voice_message_url": 1,
        "song_url": 1,
        "easter_egg_message": 1,
        "timeline": 1,
        "custom_background_url": 1,
        "custom_font": 1
    }
    events = await db.events.find({}, projection).skip(skip).limit(limit).to_list(limit)
    
    for event in events:
        if isinstance(event.get('created_at'), str):
            event['created_at'] = datetime.fromisoformat(event['created_at'])
        if isinstance(event.get('updated_at'), str):
            event['updated_at'] = datetime.fromisoformat(event['updated_at'])
    
    return events

@api_router.get("/events/{event_id}", response_model=Event)
async def get_event(event_id: str):
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    if isinstance(event.get('created_at'), str):
        event['created_at'] = datetime.fromisoformat(event['created_at'])
    if isinstance(event.get('updated_at'), str):
        event['updated_at'] = datetime.fromisoformat(event['updated_at'])
    
    # Increment view count
    await db.events.update_one(
        {"id": event_id},
        {"$inc": {"view_count": 1}}
    )
    
    return event

@api_router.put("/events/{event_id}", response_model=Event)
async def update_event(event_id: str, input: EventUpdate):
    existing = await db.events.find_one({"id": event_id}, {"_id": 0})
    
    if not existing:
        raise HTTPException(status_code=404, detail="Event not found")
    
    update_data = {k: v for k, v in input.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.events.update_one(
        {"id": event_id},
        {"$set": update_data}
    )
    
    updated = await db.events.find_one({"id": event_id}, {"_id": 0})
    
    if isinstance(updated.get('created_at'), str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    if isinstance(updated.get('updated_at'), str):
        updated['updated_at'] = datetime.fromisoformat(updated['updated_at'])
    
    return updated

@api_router.delete("/events/{event_id}")
async def delete_event(event_id: str):
    result = await db.events.delete_one({"id": event_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    
    return {"message": "Event deleted successfully"}

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

@app.on_event("startup")
async def startup():
    try:
        init_storage()
        logger.info("Emergent Object Storage initialized successfully")
    except Exception as e:
        logger.warning(f"Storage init deferred: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
