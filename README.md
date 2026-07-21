# Niajiri Backend API

> Express + Prisma + MySQL REST API for the Niajiri Recruitment Platform.

**Developer:** Newton Joshua Sinda — [github.com/NewtonjoshuaS](https://github.com/NewtonjoshuaS)

---

## What This Does

This API powers:
- **Employer Portal** — Authentication, job management, application tracking, dashboards.
- **NiaBot** — Candidate chat sessions, dynamic question flow, CV uploads, status lookups.
- **WhatsApp Bot** — Twilio webhook integration for real WhatsApp job applications.
- **File Uploads** — Resumes stored locally in `/uploads/resumes/` (or via mount directory).

---

## Quick Start

### Prerequisites
- Node.js 20+
- MySQL 8 database

### Setup
```bash
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

Key variables used by the backend. See `.env.example` for the full template:

```env
DATABASE_URL="mysql://root:password@localhost:3307/niajiri_platform"
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
JWT_SECRET=your_jwt_secret
```

---

## Deployed on Render

This service is deployed as a **Docker Web Service** on Render:

1. Create a **Web Service** on Render and connect your repository.
2. Select **Docker** as the Runtime environment.
3. Render will read the root `backend/Dockerfile` automatically.
4. Add all environment variables from `.env.example` with production values.
5. Set `PORT` to `10000`.

---

## API Endpoints

### Public (No Auth)
```
GET  /api/health                       Health check
GET  /api/jobs                         List open jobs
GET  /api/jobs/:slug                   Get job by slug
POST /api/chat/sessions                Start a candidate application chat
POST /api/chat/sessions/:id/answer     Answer a chat question
GET  /api/chat/status                  Check application status
POST /api/chat/upload-cv               Upload a CV file
GET  /api/whatsapp/webhook             Webhook health check
POST /api/whatsapp/webhook             Twilio WhatsApp webhook
```

### Employer (JWT Bearer Token Required)
```
POST /api/auth/register                Register employer
POST /api/auth/login                   Login
GET  /api/auth/me                      Get current employer
POST /api/auth/logout                  Logout
POST /api/auth/forgot-password         Request password reset
POST /api/auth/reset-password          Reset password
GET  /api/applications/dashboard       Dashboard metrics
GET  /api/applications                 List applications
GET  /api/applications/:id             Get single application details
PATCH /api/applications/:id/status     Update application status
POST /api/jobs                         Create job
PUT  /api/jobs/:id                     Update job
DELETE /api/jobs/:id                   Delete job
```

---

## License
MIT © Newton Joshua Sinda
