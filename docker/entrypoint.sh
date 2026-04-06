#!/bin/sh
set -eu

# Start Next.js app in background.
# standalone mode provides /app/server.js; otherwise fallback to next start.
if [ -f /app/server.js ]; then
  node /app/server.js &
else
  node /app/node_modules/next/dist/bin/next start -H 0.0.0.0 -p "${APP_PORT:-3000}" &
fi
APP_PID=$!

# Stop app when container receives termination signal
trap 'kill -TERM "$APP_PID" 2>/dev/null || true; wait "$APP_PID" 2>/dev/null || true' TERM INT

# Keep nginx in foreground
nginx -g 'daemon off;'
