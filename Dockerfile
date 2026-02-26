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
# Ensure media/imgs exists even if repository has no static images yet
RUN mkdir -p /app/media/imgs

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV APP_PORT=3000

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Install nginx for single-container reverse proxy
RUN apk add --no-cache nginx

# Copy necessary files from builder
# `public` directory may be absent in this project, create an empty fallback.
RUN mkdir -p ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Runtime writable dirs for mounted data/media
RUN mkdir -p /app/data /app/media /app/assets /app/media-builtin && chown -R nextjs:nodejs /app/data /app/media /app/assets /app/media-builtin
# Bundle default static media assets into image (kept in dedicated builtin directory)
COPY --from=builder --chown=nextjs:nodejs /app/media/imgs /app/media-builtin/imgs

COPY ./docker/nginx-single.conf /etc/nginx/http.d/default.conf
COPY ./docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh && mkdir -p /run/nginx /var/lib/nginx/tmp

EXPOSE 80

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV DATA_DIR="/app/data"
ENV MEDIA_DIR="/app/media"
ENV ASSETS_DIR="/app/assets"
ENV BUILTIN_MEDIA_DIR="/app/media-builtin"

CMD ["/entrypoint.sh"]
