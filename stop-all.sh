#!/bin/bash

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}Stopping all Hafiz services...${NC}"
echo ""

# Stop backend
if [ -f backend.pid ]; then
    BACKEND_PID=$(cat backend.pid)
    if kill -0 $BACKEND_PID 2>/dev/null; then
        kill $BACKEND_PID
        echo -e "${GREEN}✓ Stopped backend (PID: $BACKEND_PID)${NC}"
    else
        echo -e "${YELLOW}! Backend not running${NC}"
    fi
    rm backend.pid
else
    # Try to find and kill by port
    BACKEND_PID=$(lsof -ti:5001 2>/dev/null)
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID
        echo -e "${GREEN}✓ Stopped backend on port 5001${NC}"
    else
        echo -e "${YELLOW}! Backend not running${NC}"
    fi
fi

# Stop ngrok
if [ -f ngrok.pid ]; then
    NGROK_PID=$(cat ngrok.pid)
    if kill -0 $NGROK_PID 2>/dev/null; then
        kill $NGROK_PID
        echo -e "${GREEN}✓ Stopped ngrok (PID: $NGROK_PID)${NC}"
    else
        echo -e "${YELLOW}! ngrok not running${NC}"
    fi
    rm ngrok.pid
else
    pkill ngrok 2>/dev/null && echo -e "${GREEN}✓ Stopped ngrok${NC}"
fi

# Stop frontend
if [ -f frontend.pid ]; then
    FRONTEND_PID=$(cat frontend.pid)
    if kill -0 $FRONTEND_PID 2>/dev/null; then
        kill $FRONTEND_PID
        echo -e "${GREEN}✓ Stopped frontend (PID: $FRONTEND_PID)${NC}"
    else
        echo -e "${YELLOW}! Frontend not running${NC}"
    fi
    rm frontend.pid
else
    # Try to find and kill by port
    FRONTEND_PID=$(lsof -ti:8000 2>/dev/null)
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID
        echo -e "${GREEN}✓ Stopped frontend on port 8000${NC}"
    else
        echo -e "${YELLOW}! Frontend not running${NC}"
    fi
fi

# Clean up log files
rm -f backend.log frontend.log

echo ""
echo -e "${GREEN}All services stopped!${NC}"
