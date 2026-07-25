#!/bin/bash
# Final step: kill old server, start new one
cd /home/team/aqualink-ph
# Kill anything on port 3000
fuser -k 3000/tcp 2>/dev/null
sleep 3
# Check if port is free
python3 -c "
import socket
s = socket.socket()
s.settimeout(2)
r = s.connect_ex(('localhost', 3000))
print('Port open:', r == 0)
s.close()
"
# Start the new server
nohup npx next start -p 3000 > /tmp/restart.log 2>&1 &
echo "New server PID: $!"
sleep 5
# Verify
curl -s -o /dev/null -w "HTTP_CODE:%{http_code}" --max-time 5 http://localhost:3000/
echo ""
echo "DONE"