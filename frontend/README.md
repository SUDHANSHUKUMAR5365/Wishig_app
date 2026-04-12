# Celebration QR — Frontend

React 19 app built with Tailwind CSS, Framer Motion, and Shadcn UI.

## Setup

```bash
npm install
```

Create `.env`:
```env
REACT_APP_BACKEND_URL=http://localhost:8000
REACT_APP_FRONTEND_URL=http://localhost:3000
REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id
```

```bash
npm start       # development
npm run build   # production build
```

## Pages

| Page | Route | Description |
|------|-------|-------------|
| LandingPage | `/` | Hero, features, how it works |
| AuthPage | `/login` | Login, register, forgot password |
| CreateEvent | `/create` | 8-step celebration wizard |
| CelebrationExperience | `/celebrate/:id` | Full cinematic experience |
| Dashboard | `/dashboard` | Manage your celebrations |
| AdminPage | `/admin` | Admin panel |

## Created by Sudhanshu Kumar
