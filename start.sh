#!/bin/sh

# Exit immediately if any command fails
set -e

echo "==> Running Prisma migrations..."
npx prisma migrate deploy

echo "==> Seeding database with demo data..."
npm run seed

echo "==> Starting Niajiri backend server..."
npm start
