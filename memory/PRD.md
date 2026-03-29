# Celebration QR Experience - PRD

## Original Problem Statement
Build a premium web app that allows users to create personalized interactive celebrations (Birthday/Anniversary/Custom), generate QR codes, and share them. When scanned, receivers experience a cinematic, emotional, interactive digital surprise.

## User Personas
1. **Event Creator** - Someone wanting to create a special digital celebration for a loved one
2. **Receiver** - Person who scans the QR code and experiences the celebration

## Architecture
- **Frontend**: React 19 + Tailwind CSS + Framer Motion + Shadcn UI
- **Backend**: FastAPI with MongoDB (Motor async driver)
- **Storage**: Emergent Object Storage for photos, videos, voice, songs
- **QR**: qrcode.react library for QR generation

## Core Requirements (Static)
- Multi-step event creation wizard (8 steps)
- 12 themed celebration experiences (4 boys, 4 girls, 4 anniversary)
- Cinematic experience flow: preloader → countdown → curtain → main
- Interactive cake with blow candles + confetti
- Mini games: Balloon Pop, Gift Box Surprise
- Photo/video gallery with carousel
- Voice message player with waveform visualization
- Music player with autoplay
- QR code generation & sharing (WhatsApp, copy link, download)
- Dashboard to manage events
- Easter egg (3 taps reveals secret message)

## What's Been Implemented (Jan 2026)
- ✅ Landing page with hero section, features grid, how it works
- ✅ Event creation wizard (8 steps)
- ✅ All 12 themes implemented
- ✅ File upload via Emergent Object Storage (photos, videos, voice, songs)
- ✅ Celebration experience with cinematic flow
- ✅ Interactive cake with blow candles button + confetti
- ✅ Balloon pop game (15 balloons, score tracking)
- ✅ Gift box game (6 boxes with surprise messages)
- ✅ Section navigation (Home, Cake, Games, Gallery, Message)
- ✅ Photo gallery with carousel
- ✅ Special note with typing animation
- ✅ Voice message player
- ✅ Music player with play/pause/seek/volume
- ✅ Dashboard with event cards
- ✅ QR code modal with copy link & download
- ✅ WhatsApp share integration
- ✅ Delete event functionality
- ✅ View count tracking
- ✅ Easter egg (3 taps on title)

## P0/P1/P2 Features Remaining
### P0 (Must Have)
- All core features implemented ✅

### P1 (Should Have)
- Voice recording in browser (currently upload only)
- Timeline view for anniversary events
- Edit existing events

### P2 (Nice to Have)
- More games/interactive elements
- Custom font upload
- Custom background upload
- Video player component
- Social media sharing (Instagram, Facebook)
- Analytics dashboard

## Next Tasks
1. Add voice recording feature in browser
2. Implement memory timeline for anniversaries
3. Add edit event functionality
4. Video player integration
5. More theme customization options
