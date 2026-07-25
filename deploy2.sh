#!/bin/bash
cd /home/team/aqualink-ph
echo "=== STEP 1: Kill port 3000 ==="
pkill -f "node.*3000" 2>/dev/null || true
pkill -f "bun.*3000" 2>/dev/null || true
sleep 2
python3 -c "import socket; s=socket.socket(); s.settimeout(2); r=s.connect_ex(('localhost',3000)); print('Port 3000 in use:', r==0); s.close()"

echo "=== STEP 2: Clean .next ==="
rm -rf .next 2>/dev/null
mkdir -p .next
echo "Cleaned"

echo "=== STEP 3: Build Next.js ==="
npx next build > /tmp/next-build.log 2>&1
echo "Build exit code: $?"

echo "=== STEP 4: Start server ==="
nohup npx next start -p 3000 > /tmp/next-server.log 2>&1 &
sleep 4
echo "Server PID: $!"

echo "=== STEP 5: Verify ==="
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:3000/
echo "=== DONE ==="