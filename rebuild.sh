#!/bin/bash
cd /home/team/aqualink-ph

# Step 1: Kill server on port 3000
echo "Killing port 3000..."
sudo fuser -k 3000/tcp 2>/dev/null
sleep 2

# Step 2: Verify port is free
echo "Port check..."
ss -tlnp | grep :3000 || echo "PORT_FREE"

# Step 3: Clean .next
echo "Cleaning .next..."
sudo rm -rf .next 2>/dev/null
mkdir -p .next

# Step 4: Generate Prisma
echo "Generating Prisma client..."
npx prisma generate 2>&1 | tail -3

# Step 5: Build
echo "Building Next.js..."
npx next build 2>&1 | tail -10
echo "BUILD_EXIT=$?"

# Step 6: Start server
echo "Starting server..."
nohup npx next start -p 3000 > /tmp/aqualink-new-server.log 2>&1 &
sleep 4

# Step 7: Verify
curl -s -o /dev/null -w "HTTP_%{http_code}\n" http://localhost:3000/ 2>&1
echo "DONE"