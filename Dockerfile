# Production image for Railway (and other PaaS): React UI + API on one PORT.
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --ignore-scripts

COPY . .
RUN npm run build

FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
COPY prisma ./prisma

RUN npm ci --ignore-scripts
# Placeholder only for this RUN — do not bake localhost into the image (Railway must set DATABASE_URL).
RUN DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build" \
  npx prisma generate --schema=./prisma/schema.prisma

COPY server ./server
COPY tsconfig*.json ./
COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production

COPY scripts/docker-start.sh /docker-start.sh
RUN chmod +x /docker-start.sh
CMD ["/docker-start.sh"]
