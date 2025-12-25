#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "======================================"
echo "  Backend API Testing"
echo "======================================"
echo ""

# Check if server is running
echo -n "Checking if server is running... "
if curl -s http://localhost:5001/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Server is online${NC}"
else
    echo -e "${RED}✗ Server is offline${NC}"
    echo ""
    echo "Please start the server first:"
    echo "  node backend/test-server.js"
    echo ""
    exit 1
fi

echo ""

# Test 1: Health Check
echo "Test 1: Health Check"
echo "--------------------"
curl -s http://localhost:5001/health | python3 -m json.tool
echo ""
echo ""

# Test 2: Al-Fatiha Detection
echo "Test 2: Al-Fatiha Position Detection"
echo "------------------------------------"
curl -s -X POST http://localhost:5001/api/recitation/detect-position \
  -H "Content-Type: application/json" \
  -d @test-fatiha.json | python3 -m json.tool
echo ""
echo ""

# Test 3: Al-Ikhlas Detection
echo "Test 3: Al-Ikhlas Position Detection"
echo "------------------------------------"
curl -s -X POST http://localhost:5001/api/recitation/detect-position \
  -H "Content-Type: application/json" \
  -d @test-ikhlas.json | python3 -m json.tool
echo ""
echo ""

# Test 4: Al-Mulk Detection
echo "Test 4: Al-Mulk Position Detection"
echo "----------------------------------"
curl -s -X POST http://localhost:5001/api/recitation/detect-position \
  -H "Content-Type: application/json" \
  -d @test-mulk.json | python3 -m json.tool
echo ""
echo ""

# Test 5: Get Pages
echo "Test 5: Get Pages (1-2)"
echo "----------------------"
curl -s "http://localhost:5001/api/recitation/pages?start=1&count=2" | python3 -m json.tool | head -n 30
echo "... (truncated)"
echo ""
echo ""

# Test 6: Get Metadata
echo "Test 6: Get Metadata"
echo "-------------------"
curl -s http://localhost:5001/api/recitation/metadata | python3 -m json.tool | head -n 40
echo "... (truncated)"
echo ""
echo ""

echo -e "${GREEN}======================================"
echo "  All Tests Completed!"
echo "======================================${NC}"
