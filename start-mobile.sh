#!/bin/bash

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════╗"
echo "║   🕌 Hafiz Recitation Tracker Setup       ║"
echo "║   Full Quran with Mobile Support          ║"
echo "╚════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# Step 1: Check if backend is already running
echo -e "${YELLOW}Step 1: Checking backend status...${NC}"
if curl -s http://localhost:5001/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend is already running on port 5001${NC}"
else
    echo -e "${YELLOW}→ Starting backend server...${NC}"
    cd /home/user/qlisen
    node backend/test-server.js > backend.log 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > backend.pid
    sleep 3

    if curl -s http://localhost:5001/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Backend started successfully (PID: $BACKEND_PID)${NC}"
    else
        echo -e "${RED}✗ Failed to start backend${NC}"
        exit 1
    fi
fi
echo ""

# Step 2: Start ngrok
echo -e "${YELLOW}Step 2: Setting up ngrok tunnel...${NC}"
echo -e "   ${BLUE}Starting ngrok on port 5001...${NC}"

# Kill any existing ngrok process
pkill ngrok 2>/dev/null

# Start ngrok in background
ngrok http 5001 > /dev/null 2>&1 &
NGROK_PID=$!
echo $NGROK_PID > ngrok.pid

sleep 3

# Get ngrok URL
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o 'https://[^"]*ngrok[^"]*' | head -1)

if [ -z "$NGROK_URL" ]; then
    echo -e "${RED}✗ Could not get ngrok URL${NC}"
    echo -e "${YELLOW}   Make sure ngrok is installed and authenticated${NC}"
    echo -e "${YELLOW}   Visit: https://ngrok.com/download${NC}"
    echo ""
    echo -e "${YELLOW}   For now, continuing with localhost...${NC}"
    NGROK_URL="http://localhost:5001"
else
    echo -e "${GREEN}✓ ngrok tunnel created successfully${NC}"
    echo -e "   ${BLUE}Public URL: ${NGROK_URL}${NC}"
fi
echo ""

# Step 3: Start HTTP server for frontend
echo -e "${YELLOW}Step 3: Starting frontend server...${NC}"

# Kill any existing Python server on port 8000
lsof -ti:8000 | xargs kill -9 2>/dev/null

cd /home/user/qlisen
python3 -m http.server 8000 > frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > frontend.pid

sleep 2

if lsof -i:8000 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Frontend server started on port 8000${NC}"
else
    echo -e "${RED}✗ Failed to start frontend server${NC}"
    exit 1
fi
echo ""

# Step 4: Get local IP for mobile access
echo -e "${YELLOW}Step 4: Getting network information...${NC}"
LOCAL_IP=$(hostname -I | awk '{print $1}')
echo -e "   ${BLUE}Local IP: ${LOCAL_IP}${NC}"
echo ""

# Summary
echo -e "${GREEN}╔════════════════════════════════════════════╗"
echo "║           Setup Complete! 🎉               ║"
echo "╚════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📱 For MOBILE testing:${NC}"
echo ""
echo -e "   1. Open this URL on your mobile (same WiFi):"
echo -e "      ${YELLOW}http://${LOCAL_IP}:8000/quran-full.html${NC}"
echo ""
echo -e "   2. When the page loads, set the API URL to:"
echo -e "      ${YELLOW}${NGROK_URL}${NC}"
echo ""
echo -e "   3. Click 'حفظ' (Save) to connect"
echo ""
echo -e "${BLUE}💻 For DESKTOP testing:${NC}"
echo ""
echo -e "   Open in browser:"
echo -e "      ${YELLOW}http://localhost:8000/quran-full.html${NC}"
echo ""
echo -e "${BLUE}📊 Monitoring:${NC}"
echo ""
echo -e "   Backend logs:  ${YELLOW}tail -f /home/user/qlisen/backend.log${NC}"
echo -e "   Frontend logs: ${YELLOW}tail -f /home/user/qlisen/frontend.log${NC}"
echo -e "   ngrok dashboard: ${YELLOW}http://localhost:4040${NC}"
echo ""
echo -e "${BLUE}🛑 To stop all services:${NC}"
echo ""
echo -e "   ${YELLOW}./stop-all.sh${NC}"
echo ""
echo -e "${GREEN}Process IDs saved:${NC}"
echo -e "   Backend PID: $(cat backend.pid 2>/dev/null || echo 'N/A')"
echo -e "   ngrok PID: $(cat ngrok.pid 2>/dev/null || echo 'N/A')"
echo -e "   Frontend PID: $(cat frontend.pid 2>/dev/null || echo 'N/A')"
echo ""
echo -e "${GREEN}✨ Happy reciting! بارك الله فيك${NC}"
