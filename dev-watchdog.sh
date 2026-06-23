#!/bin/bash
# Watchdog supervisor: keeps the Next.js dev server alive
cd /home/z/my-project

LOG=/home/z/my-project/dev.log
PIDFILE=/home/z/my-project/.dev.pid

while true; do
  # Check if server is running and responding
  ALIVE=0
  if [ -f "$PIDFILE" ]; then
    PID=$(cat "$PIDFILE" 2>/dev/null)
    if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
      ALIVE=1
    fi
  fi

  if [ "$ALIVE" -eq 0 ]; then
    echo "[$(date)] Starting dev server..." >> "$LOG"
    # Kill any stragglers
    pkill -9 -f "next-server" 2>/dev/null
    pkill -9 -f "next dev" 2>/dev/null
    sleep 1
    # Start fresh
    nohup bun run dev >> "$LOG" 2>&1 &
    NEW_PID=$!
    echo "$NEW_PID" > "$PIDFILE"
    echo "[$(date)] Dev server started, PID: $NEW_PID" >> "$LOG"
    # Wait for it to be ready
    sleep 15
  fi

  sleep 10
done
