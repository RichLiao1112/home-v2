#!/bin/sh
set -eu

# Start Next.js app in background
node /app/server.js &
APP_PID=$!

# Stop app when container receives termination signal
trap 'kill -TERM "$APP_PID" 2>/dev/null || true; wait "$APP_PID" 2>/dev/null || true' TERM INT

# Keep nginx in foreground
nginx -g 'daemon off;'
