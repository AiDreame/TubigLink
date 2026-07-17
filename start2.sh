#!/bin/bash
# Force kill port 3000
fuser -k 3000/tcp 2>/dev/null
sleep 2

# Start Next.js dev server
cd /home/team/aqualink-ph
npx next dev -p 3000 > /tmp/aqua2.log 2>&1 &
sleep 10

# Show result
cat /tmp/aqua2.log | tail -5
echo ""
echo "=== Testing ==="
curl -s -o /dev/null -w "Status: %{http_code}\n" http://localhost:3000/ 2>/dev/null || echo "Not ready"