FROM node:20-alpine

WORKDIR /app

# Install dependencies first (better Docker layer caching)
COPY package*.json ./
COPY prisma ./prisma/

RUN npm install

# Copy the rest of the source code
COPY . .

# Generate Prisma client during build (schema is available, database is NOT needed)
RUN npx prisma generate

# Render uses port 10000 by default
ENV PORT=10000
EXPOSE 10000

# Run the startup script which handles migrations + seed + server
CMD ["sh", "start.sh"]
