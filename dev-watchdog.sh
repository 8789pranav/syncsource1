#!/bin/bash
cd /home/z/my-project
while true; do
  echo "[watchdog] starting bun at $(date)" >> dev-watchdog.log
  bun run dev > dev.log 2>&1
  echo "[watchdog] bun exited ($?) at $(date)" >> dev-watchdog.log
  sleep 3
done
