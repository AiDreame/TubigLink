#!/bin/bash
set -e
cd /home/team/aqualink-ph

echo "=== Step 1: Kill port 3000 ==="
sudo fuser -k 3000/tcp 2>&1 || true
sleep 2

echo "=== Step 2: Verify port is free ==="
ss -tlnp | grep :3000 || echo "Port 3000 is free"

echo "=== Step 3: Clean .next cache ==="
sudo rm -rf .next
echo ".next cleaned"

echo "=== Step 4: Generate Prisma client ==="
npx prisma generate 2>&1

echo "=== Step 5: Build Next.js ==="
npx next build 2>&1
echo "BUILD_EXIT_CODE=$?"

echo "=== Step 6: Start server ==="
nohup npx next start -p 3000 > /tmp/aqualink-server.log 2>&1 &
sleep 3
echo "Server started, PID: $!"

echo "=== Step 7: Verify ==="
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:3000/ 2>&1 || echo "curl failed"

echo "=== Step 8: Check log ==="
tail -5 /tmp/aqualink-server.log 2>&1

echo "=== DONE ==="