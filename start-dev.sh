#!/bin/bash
# Persistent dev server startup script
cd /home/z/my-project

# Kill any existing instances
pkill -9 -f "next-server" 2>/dev/null
pkill -9 -f "next dev" 2>/dev/null
pkill -9 -f "bun run dev" 2>/dev/null
sleep 2

# Clear any stale port binding
fuser -k 3000/tcp 2>/dev/null
sleep 1

# Start dev server with full detachment
nohup bun run dev > /home/z/my-project/dev.log 2>&1 &
DEV_PID=$!
echo "Dev server PID: $DEV_PID"

# Wait for server to be ready (up to 60s)
for i in $(seq 1 60); do
  if ss -tlnp 2>/dev/null | grep -q ":3000.*LISTEN"; then
    echo "Port 3000 bound after ${i}s"
    # Verify it actually responds
    if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/ 2>/dev/null | grep -q "200"; then
      echo "Server responding with 200 OK"
      exit 0
    fi
  fi
  sleep 1
done

echo "Server failed to start within 60s"
exit 1
