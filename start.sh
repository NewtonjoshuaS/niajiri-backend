#!/bin/sh

# Exit immediately if any command fails
set -e

echo "==> Running Prisma migrations..."
npx prisma migrate deploy

echo "==> Seeding database with demo data (safe — skips if already seeded)..."
npm run seed || echo "==> Seed skipped (data may already exist — this is safe)"

echo "==> Starting Niajiri backend server..."
npm start
