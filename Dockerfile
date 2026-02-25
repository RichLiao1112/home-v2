# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
  else npm i; \
  fi

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from builder
# `public` directory may be absent in this project, create an empty fallback.
RUN mkdir -p ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Runtime writable dirs for mounted data/media
RUN mkdir -p /app/data /app/media && chown -R nextjs:nodejs /app/data /app/media
# Bundle default static media assets into image
COPY --from=builder --chown=nextjs:nodejs /app/media/imgs /app/media/imgs

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV DATA_DIR="/app/data"
ENV MEDIA_DIR="/app/media"

CMD ["node", "server.js"]
