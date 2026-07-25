#!/bin/bash
# AquaLink PH dev server start script
# Recreates the node_modules symlink if needed and starts the dev server

set -e
cd /home/team/shared/aqualink-v2

# Ensure symlink exists (node_modules lives in /tmp due to /home size limits)
if [ ! -L node_modules ] || [ ! -d node_modules/.bin ]; then
    rm -rf node_modules
    ln -s /tmp/aqualink-v2/node_modules node_modules
fi

# Kill any existing server on port 3000
sudo lsof -ti:3000 | xargs -r sudo kill -9 2>/dev/null || true
sleep 1

# Clear cache for clean compilation
rm -rf .next

# Start the dev server
echo "Starting AquaLink PH on port 3000..."
nohup npm run dev -- -p 3000 -H 0.0.0.0 > /tmp/aqualink-dev.log 2>&1 &
echo "PID: $!"
sleep 5
curl -s -o /dev/null -w "Status: %{http_code}\n" http://localhost:3000
