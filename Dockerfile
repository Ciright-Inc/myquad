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
# Build-time placeholder only; Railway must set real DATABASE_URL at runtime.
ENV DATABASE_URL="postgresql://postgres:password@localhost:5432/myquad"
RUN npx prisma generate --schema=./prisma/schema.prisma

COPY server ./server
COPY tsconfig*.json ./
COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production

COPY scripts/docker-start.sh /docker-start.sh
RUN chmod +x /docker-start.sh
CMD ["/docker-start.sh"]
