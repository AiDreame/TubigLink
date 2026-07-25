#!/bin/bash
cd /home/team/aqualink-ph
echo "=== Kill old server ==="
kill $(lsof -t -i:3000 -sTCP:LISTEN 2>/dev/null) 2>/dev/null || true
sleep 2
PORT_IN_USE=$(ss -tlnp | grep :3000 | head -1)
echo "Port check: $PORT_IN_USE"
if [ -n "$PORT_IN_USE" ]; then
  echo "Trying harder kill..."
  sudo fuser -k 3000/tcp 2>/dev/null
  sleep 2
fi
ss -tlnp | grep :3000 || echo "PORT_FREE"
echo "=== Start new server ==="
cd /home/team/aqualink-ph
nohup npx next start -p 3000 > /tmp/final-server.log 2>&1 &
SERVER_PID=$!
echo "Server PID: $SERVER_PID"
sleep 5
echo "=== Verify ==="
curl -s -o /dev/null -w "HTTP_%{http_code}\n" --max-time 5 http://localhost:3000/ 2>&1
echo "=== Check server log ==="
tail -5 /tmp/final-server.log 2>/dev/null
echo "=== DONE ==="