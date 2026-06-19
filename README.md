# 🎉 Celebration QR

> Create personalized interactive celebrations and share them via QR code.

Built by **Sudhanshu Kumar**

---

## What is this?

Celebration QR lets you create cinematic digital experiences for birthdays, anniversaries, and special occasions. The receiver scans a QR code and gets a full interactive surprise — cake, games, photos, music, and a heartfelt message.

---

## Features

- 🎨 **50 Themes** — 20 for boys, 20 for girls, 10 for anniversaries
- 🔒 **PIN Lock** — protect the celebration with a 4-digit PIN
- 🎵 **Music Player** — upload a song with a clip picker
- 📸 **Photo Gallery** — polaroid-style reveal after balloon game
- 🎂 **Interactive Cake** — blow candles with a tap
- 🎮 **6 Birthday Games** — Balloon Pop, Lucky Gift Box, Catch The Cake, Cake Decoration, Memory Match, Birthday Quiz
- 💝 **Flip Cards** — 6 reasons why they're special
- 🤖 **AI Write** — generate messages & flip cards using Gemini AI
- 🔗 **QR Code Sharing** — WhatsApp, copy link, download QR
- 🎥 **Video Surprise** — play a personal video message
- 💌 **Secret Message** — heartfelt typewriter love letter
- 🎁 **Gift Reveal** — animated gift box opening moment
- ✨ **Make A Wish** — type a wish before the reveal
- 🔑 **Forgot Password** — OTP sent to email
- 👤 **Profile Page** — avatar, name, bio, mobile number
- 👑 **VIP Premium** — unlock all themes, games & features via UPI payment
- 🔔 **Push Notifications** — Firebase notifications when someone views your celebration
- 🎫 **Support Tickets** — raise issues and get help from admin
- 👨‍💼 **Admin Panel** — manage users, celebrations, feedback, support tickets, maintenance mode
- ⭐ **Star Feedback** — rate the celebration at the end
- 🥚 **Easter Egg** — tap name 3 times for a secret message
- 🛡️ **Maintenance Mode** — admin can put the site in maintenance with one toggle

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
| Notifications | Firebase Cloud Messaging |
| Payments | UPI (QR code based) |
| Deploy | Render (backend + frontend) |

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
│   ├── public/
│   │   ├── firebase-messaging-sw.js   # Firebase background notifications
│   │   └── qrcode_upi.jpeg            # UPI payment QR
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx
│   │   │   ├── AuthPage.jsx
│   │   │   ├── CreateEvent.jsx
│   │   │   ├── CelebrationExperience.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── AdminPage.jsx
│   │   │   ├── ProfilePage.jsx
│   │   │   ├── PremiumPage.jsx        # VIP upgrade + UPI payment
│   │   │   └── SupportPage.jsx        # Support ticket system
│   │   ├── lib/
│   │   │   ├── auth.js        # Auth context + premium status
│   │   │   ├── firebase.js    # Firebase config + FCM
│   │   │   ├── themes.js      # 50 theme definitions
│   │   │   └── utils.js
│   │   └── components/ui/     # Shadcn components
│   └── package.json
└── README.md
```

---

## Themes (50 Total)

### 👦 Boys (20)
Neon Cyber, Royal Gold, Gaming RGB, Kaacha Mango, Minimal Dark, Galaxy, Neon, Celebration, Minimal, Ocean Breeze, Dark Knight, Fire Dragon, Arctic Frost, Jungle Wild, Retro Wave, Space Commander, Thunder Storm, Samurai, Crypto Punk, Mountain Peak

### 👧 Girls (20)
Pink Pastel, Floral Elegant, Glitter Party, Cute Cartoon, Kaacha Mango, Princess Pink, Rose Gold, Lavender Dream, Mermaid Teal, Candy Pop, Golden Girl, Cherry Blossom, Unicorn Magic, Midnight Diva, Sunshine Yellow, Coral Reef, Emerald Fairy, Blush Marble, Violet Vibes, Bubblegum

### 💑 Anniversary (10)
Romantic Red, Golden Love, Memory Lane, Sunset Love, Silver Jubilee, Ruby Love, Midnight Romance, Champagne Toast, Eternal Bond, Platinum Years

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
FIREBASE_CREDENTIALS=your_firebase_service_account_json
```

```bash
uvicorn server:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install --legacy-peer-deps
```

Create `frontend/.env`:
```env
REACT_APP_BACKEND_URL=http://localhost:8000
REACT_APP_FRONTEND_URL=http://localhost:3000
REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id
REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
REACT_APP_FIREBASE_VAPID_KEY=your_vapid_key
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
| `FIREBASE_CREDENTIALS` | Firebase service account JSON (stringified) |
| `REACT_APP_FIREBASE_API_KEY` | Firebase web API key |
| `REACT_APP_FIREBASE_VAPID_KEY` | Firebase VAPID key for push notifications |

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
| GET | `/api/admin/feedback` | All star ratings and feedback |
| GET | `/api/admin/support` | All support tickets |
| PUT | `/api/admin/support/{id}` | Update ticket status |
| POST | `/api/admin/maintenance` | Toggle maintenance mode |

### AI
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/ai/generate-message` | Generate message or flip cards |

### Premium
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/premium/verify` | Verify UPI payment and activate VIP |
| GET | `/api/premium/status` | Get user's premium status |

### Notifications
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/notifications/register` | Register FCM device token |
| POST | `/api/notifications/send` | Send push notification |

### Support
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/support/ticket` | Create support ticket |
| GET | `/api/support/tickets` | Get user's tickets |

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

## Setting Up Firebase

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create a project → enable Cloud Messaging
3. Get web app config → add to `frontend/.env`
4. Generate VAPID key under Cloud Messaging settings
5. Download service account JSON → stringify → set as `FIREBASE_CREDENTIALS`

---

## License

MIT — Created by **Sudhanshu Kumar**
