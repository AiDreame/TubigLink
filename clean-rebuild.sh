#!/bin/bash
cd /home/team/aqualink-ph
echo "=== STEP 1: Kill server ==="
sudo fuser -k 3000/tcp 2>/dev/null
sleep 2
echo "=== STEP 2: Port check ==="
ss -tlnp | grep :3000 || echo "PORT_FREE"
echo "=== STEP 3: Clean .next ==="
sudo rm -rf .next 2>/dev/null
echo "Cleaned"
echo "=== STEP 4: Build ==="
npx next build 2>&1 | tail -20
echo "=== STEP 5: Start server ==="
nohup npx next start -p 3000 > /tmp/new-server.log 2>&1 &
sleep 5
echo "Server PID: $!"
echo "=== STEP 6: Verify ==="
curl -s -o /dev/null -w "HTTP %{http_code}\n" --max-time 5 http://localhost:3000/
echo "=== DONE ==="