# 🎉 Celebration QR

> Create personalized interactive celebrations and share them via QR code.

Built by **Sudhanshu Kumar**

---

## What is this?

Celebration QR lets you create cinematic digital experiences for birthdays, anniversaries, and special occasions. The receiver scans a QR code and gets a full interactive surprise — cake, games, photos, music, and a heartfelt message.

---

## Features

- 🎨 **12 Themes** — 4 for boys, 4 for girls, 4 for anniversaries
- 🔒 **PIN Lock** — protect the celebration with a 4-digit PIN
- 🎵 **Music Player** — upload a song with a 60-second clip picker
- 📸 **Photo Gallery** — polaroid-style reveal after balloon game
- 🎂 **Interactive Cake** — blow candles with a tap
- 🎈 **Balloon Pop Game** — pop all 15 to unlock photos
- 💝 **Flip Cards** — 6 reasons why they're special
- 🤖 **AI Write** — generate messages & flip cards using Gemini AI
- 🔗 **QR Code Sharing** — WhatsApp, copy link, download QR
- 🔑 **Forgot Password** — OTP sent to email
- 👤 **Admin Panel** — manage users and celebrations
- 🥚 **Easter Egg** — tap name 3 times for a secret message

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, Tailwind CSS, Framer Motion, Shadcn UI |
| Backend | FastAPI, Python |
| Database | MongoDB (Motor async) |
| Storage | Cloudinary |
| Auth | JWT + Google OAuth |
| AI | Google Gemini 1.5 Flash |
| Email | Gmail SMTP (aiosmtplib) |
| Deploy | Render (backend) + Vercel/Netlify (frontend) |

---

## Project Structure

```
wish/
├── backend/
│   ├── server.py          # FastAPI app — all routes
│   ├── requirements.txt
│   ├── .env               # Environment variables (not committed)
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx
│   │   │   ├── AuthPage.jsx
│   │   │   ├── CreateEvent.jsx
│   │   │   ├── CelebrationExperience.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   └── AdminPage.jsx
│   │   ├── lib/
│   │   │   ├── auth.js        # Auth context
│   │   │   ├── themes.js      # 12 theme definitions
│   │   │   └── utils.js
│   │   └── components/ui/     # Shadcn components
│   └── package.json
└── README.md
```

---

## Local Setup

### Backend

```bash
cd backend
pip install -r requirements.txt
```

Create `backend/.env`:
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=celebration_qr
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
JWT_SECRET=your_jwt_secret
ADMIN_EMAIL=your@email.com
ADMIN_PASSWORD=yourpassword
GOOGLE_CLIENT_ID=your_google_client_id
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASSWORD=your_gmail_app_password
GEMINI_API_KEY=your_gemini_api_key
```

```bash
uvicorn server:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env`:
```env
REACT_APP_BACKEND_URL=http://localhost:8000
REACT_APP_FRONTEND_URL=http://localhost:3000
REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id
```

```bash
npm start
```

---

## Environment Variables (Render/Production)

| Key | Description |
|-----|-------------|
| `MONGO_URL` | MongoDB Atlas connection string |
| `DB_NAME` | Database name |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `JWT_SECRET` | Secret for JWT tokens |
| `ADMIN_EMAIL` | Admin login email |
| `ADMIN_PASSWORD` | Admin login password |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `SMTP_HOST` | SMTP host (smtp.gmail.com) |
| `SMTP_PORT` | SMTP port (587) |
| `SMTP_USER` | Gmail address for sending OTP |
| `SMTP_PASSWORD` | Gmail App Password (16 chars) |
| `GEMINI_API_KEY` | Google Gemini AI API key |

---

## API Routes

### Auth
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/google` | Google OAuth |
| POST | `/api/auth/forgot-password` | Send OTP to email |
| POST | `/api/auth/reset-password` | Reset password with OTP |
| GET | `/api/auth/me` | Get current user |

### Events
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/events` | Create celebration |
| GET | `/api/events` | Get user's celebrations |
| GET | `/api/events/{id}` | Get single celebration |
| PUT | `/api/events/{id}` | Update celebration |
| DELETE | `/api/events/{id}` | Delete celebration |

### Admin
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/admin/stats` | Total users, events, views |
| GET | `/api/admin/users` | All users with their celebrations |
| DELETE | `/api/admin/users/{id}` | Delete user + their events |

### AI
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/ai/generate-message` | Generate message or flip cards |

---

## Getting a Gmail App Password

1. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
2. Select "Mail" and your device
3. Copy the 16-character password
4. Use it as `SMTP_PASSWORD` (no spaces)

## Getting a Gemini API Key

1. Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Click "Create API Key"
3. Copy and use as `GEMINI_API_KEY`

---

## License

MIT — Created by **Sudhanshu Kumar**
