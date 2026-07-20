# ─────────────────────────────────────────────
# Use Debian-slim instead of Alpine.
# Alpine lacks OpenSSL which Prisma requires.
# node:20-slim is the correct base for Render.
# ─────────────────────────────────────────────
FROM node:20-slim

# Install OpenSSL explicitly (Prisma schema engine requires it)
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and Prisma schema first (better layer caching)
COPY package*.json ./
COPY prisma ./prisma/

# Install Node dependencies
RUN npm install

# Copy the rest of the application source
COPY . .

# Generate Prisma client (schema is present; database is NOT needed at this step)
RUN npx prisma generate

# Render assigns port 10000 by default
ENV PORT=10000
EXPOSE 10000

# start.sh runs: prisma migrate deploy → seed → npm start
CMD ["sh", "start.sh"]
