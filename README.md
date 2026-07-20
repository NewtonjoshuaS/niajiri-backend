# Niajiri Backend API

> Express + Prisma + MySQL REST API for the Niajiri Recruitment Platform.

**Developer:** Newton Joshua Sinda — [github.com/NewtonjoshuaS](https://github.com/NewtonjoshuaS)

This is the **backend** repository. The frontend lives at [github.com/NewtonjoshuaS/niajiri-frontend](https://github.com/NewtonjoshuaS/niajiri-frontend).

---

## What This Does

This API powers:
- **Employer Portal** — auth, job management, application tracking, dashboards
- **NiaBot** — candidate chat sessions, dynamic question flow, CV uploads, status lookups
- **WhatsApp Bot** — Twilio webhook integration for real WhatsApp job applications
- **File Uploads** — CVs/resumes stored in `/uploads/resumes/`

---

## Quick Start

### Prerequisites
- Node.js 20+
- MySQL 8 database (local or managed)

### Setup
```bash
git clone https://github.com/NewtonjoshuaS/niajiri-backend.git
cd niajiri-backend

# Copy and configure environment
cp .env.example .env
# Edit .env with your database credentials and JWT secrets

# Install dependencies
npm install

# Run database migrations and load demo data
npx prisma migrate deploy
npm run seed

# Start the development server
npm run dev
```

The API runs at: **http://localhost:5000**

Health check: **http://localhost:5000/api/health**

---

## Environment Variables

See `.env.example` for all required variables. Key ones:

```env
DATABASE_URL="mysql://root:password@localhost:3307/niajiri_platform"
PORT=5000
CLIENT_URL=http://localhost:5173
JWT_SECRET=your_long_random_secret
```

---

## Key Endpoints

### Public (No Auth)
```
GET  /api/jobs                         List open jobs
GET  /api/health                       Health check
POST /api/chat/sessions                Start a candidate application chat
POST /api/chat/sessions/:id/answer     Answer a chat question
GET  /api/chat/status?phone=xxx        Check application status
POST /api/chat/upload-cv               Upload a CV file
```

### Employer (JWT Bearer Token Required)
```
POST /api/auth/login                   Login
POST /api/auth/register                Register employer
GET  /api/auth/me                      Get current employer
GET  /api/applications/dashboard       Dashboard metrics
GET  /api/applications                 List applications
PATCH /api/applications/:id/status     Update application status
POST /api/jobs                         Create job
PUT  /api/jobs/:id                     Update job
DELETE /api/jobs/:id                   Delete job
```

---

## Deploy to Render

1. Create a [Render](https://render.com) Web Service
2. Connect this GitHub repository
3. Set:
   - **Build Command:** `npm install && npx prisma generate && npx prisma migrate deploy && npm run seed`
   - **Start Command:** `npm start`
4. Add all environment variables from `.env.example` with production values
5. Deploy

---

## Docker

```bash
# Build and run standalone (requires external MySQL)
docker build -t niajiri-backend .
docker run -p 5000:5000 --env-file .env niajiri-backend

# Or use the full docker-compose from the monorepo root
```

---

## Demo Login

After seeding, use:
```
Email:    employer@niajiri.co.tz
Password: Password123!
```

---

## License
MIT © Newton Joshua Sinda
