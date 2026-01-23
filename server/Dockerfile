# Production Dockerfile for Vider 2.0 Backend
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache openssl

# Copy root files for context
COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY server/prisma ./server/prisma/

# Install dependencies for both root and server
RUN npm install
RUN cd server && npm install

# Copy server source
COPY server/ ./server/

# Generate Prisma client and build
RUN cd server && npx prisma generate && npm run build

# Runner stage
FROM node:20-alpine AS runner

WORKDIR /app

# Install runtime dependencies for Prisma
RUN apk add --no-cache openssl

ENV NODE_ENV=production
ENV PORT=8080

# Copy built app and production dependencies
COPY --from=builder /app/server/dist ./dist
COPY --from=builder /app/server/node_modules ./node_modules
COPY --from=builder /app/server/package.json ./package.json

EXPOSE 8080

CMD ["node", "dist/server.js"]
