# Production image for Railway (and other PaaS): React UI + API on one PORT.
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
COPY prisma ./prisma

RUN npm ci --ignore-scripts
RUN npx prisma generate --schema=./prisma/schema.prisma

COPY server ./server
COPY tsconfig*.json ./
COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production

CMD ["sh", "-c", "npx prisma migrate deploy && npx tsx server/index.ts"]
