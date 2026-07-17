#!/bin/bash
set -e

echo "Killing all servers..."
pkill -f "next" 2>/dev/null || true
pkill -f "bun" 2>/dev/null || true
sleep 2

echo "Starting AquaLink PH Next.js dev server on port 3000..."
cd /home/team/aqualink-ph
npx next dev -p 3000 &>/tmp/aqualink-server.log &
sleep 8

echo "Server log:"
cat /tmp/aqualink-server.log | tail -5

echo "Checking response..."
curl -s -o /dev/null -w "Status: %{http_code}\n" http://localhost:3000/ 2>/dev/null || echo "Not ready yet"