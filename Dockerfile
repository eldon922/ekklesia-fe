# ─── build stage ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY .env .
# cache/node modules
COPY package*.json ./
RUN npm ci

# copy the rest of the sources and build
COPY . .
RUN npm run build

# ─── runtime stage ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# only copy production deps from the builder
COPY --from=builder /app/package*.json ./
RUN npm ci --only=production

# copy built files and assets
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.js ./
# (add any other files your server needs, e.g. .env.production)

EXPOSE 3000

# start the next.js production server
CMD ["npm", "start"]