#!/bin/bash
# Classifieds UAE — background scheduler
# Runs every 15 min:
#   - Classifieds UAE promo (platform-specific UAE peak hours)
#   - Shiffera promo (30 min offset)
#   - SHAMRA promo (9 AM UAE = 5 AM UTC, daily)
#   - Expire ads (every 2 hours)

SECRET="r0c3940mlI487IGgU3p4U2bAsUEJ0r2cZMpLSb5hYmoWXtBVh6fc4DTqEInkjsXyW1IYqGNGi9KALRhMvLB14A=="
LOG="/tmp/classifieds-scheduler.log"

echo "[$(date)] Scheduler started" >> "$LOG"

COUNTER=0
while true; do
  # Get current UAE hour (UTC+4)
  UTC_HOUR=$(date -u +%H)
  UAE_HOUR=$(( (UTC_HOUR + 4) % 24 ))

  # Every 15 minutes: Classifieds UAE promo publish
  RESULT=$(curl -s -m 120 "http://localhost:3000/api/cron/promo-publish?secret=${SECRET}" 2>&1)
  echo "[$(date)] PROMO: $RESULT" >> "$LOG"

  # 30 minutes after Classifieds promo (every other 15-min cycle): Shiffera promo
  if [ $((COUNTER % 2)) -eq 1 ]; then
    SHIFFERA=$(curl -s -m 120 "http://localhost:3000/api/cron/shiffera-promo?secret=${SECRET}" 2>&1)
    echo "[$(date)] SHIFFERA: $SHIFFERA" >> "$LOG"
  fi

  # SHAMRA promo: daily at 9 AM UAE time (UAE_HOUR=9)
  if [ "$UAE_HOUR" -eq 9 ]; then
    SHAMRA=$(curl -s -m 180 "http://localhost:3000/api/cron/shamra-promo?secret=${SECRET}" 2>&1)
    echo "[$(date)] SHAMRA: $SHAMRA" >> "$LOG"
  fi

  # Every 2 hours (8 iterations of 15 min): expire ads
  if [ $((COUNTER % 8)) -eq 0 ]; then
    EXPIRE=$(curl -s -m 60 "http://localhost:3000/api/cron/expire-ads?secret=${SECRET}" 2>&1)
    echo "[$(date)] EXPIRE: $EXPIRE" >> "$LOG"
  fi

  COUNTER=$((COUNTER + 1))

  # Trim log if too large (keep last 500 lines)
  if [ $(wc -l < "$LOG" 2>/dev/null || echo 0) -gt 1000 ]; then
    tail -500 "$LOG" > "${LOG}.tmp" && mv "${LOG}.tmp" "$LOG"
  fi

  sleep 900  # 15 minutes
done
