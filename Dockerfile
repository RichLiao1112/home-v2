# Build stage
FROM node:20-alpine AS builder

WORKDIR /app
ARG NEXT_OUTPUT_STANDALONE=true
ENV NEXT_OUTPUT_STANDALONE=${NEXT_OUTPUT_STANDALONE}
ARG NPM_REGISTRY=""

# Copy package files
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN set -eux; \
  if [ -n "$NPM_REGISTRY" ]; then npm config set registry "$NPM_REGISTRY"; fi; \
  npm config set fetch-retries 5; \
  npm config set fetch-retry-factor 2; \
  npm config set fetch-retry-mintimeout 10000; \
  npm config set fetch-retry-maxtimeout 120000; \
  npm config set fetch-timeout 600000; \
  if [ -f yarn.lock ]; then \
    install_cmd="yarn --frozen-lockfile"; \
  elif [ -f package-lock.json ]; then \
    install_cmd="npm ci --no-audit --no-fund"; \
  elif [ -f pnpm-lock.yaml ]; then \
    install_cmd="corepack enable pnpm && pnpm i --frozen-lockfile"; \
  else \
    install_cmd="npm i --no-audit --no-fund"; \
  fi; \
  i=1; \
  until [ "$i" -gt 3 ]; do \
    sh -c "$install_cmd" && break; \
    echo "Dependency install failed (attempt $i/3), retrying..."; \
    i=$((i+1)); \
    sleep 10; \
  done; \
  if [ "$i" -gt 3 ]; then \
    echo "Dependency install failed after retries."; \
    exit 1; \
  fi

# Copy source code
COPY . .
# Ensure media/imgs exists even if repository has no static images yet
RUN mkdir -p /app/media/imgs

# Build the application
RUN npm run build

# Prepare runtime payload based on build mode
RUN mkdir -p /tmp/runtime/public && \
  if [ -d /app/public ]; then cp -R /app/public/. /tmp/runtime/public/; fi && \
  if [ "$NEXT_OUTPUT_STANDALONE" = "true" ]; then \
    cp -R .next/standalone/. /tmp/runtime/ && \
    mkdir -p /tmp/runtime/.next && \
    cp -R .next/static /tmp/runtime/.next/static; \
  else \
    cp package.json /tmp/runtime/package.json && \
    cp -R node_modules /tmp/runtime/node_modules && \
    cp -R .next /tmp/runtime/.next; \
  fi

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
COPY --from=builder --chown=nextjs:nodejs /tmp/runtime/ ./
RUN mkdir -p ./public

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
