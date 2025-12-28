#!/bin/bash

echo "🧪 Testing Whisper Server..."
echo ""

# Check if Docker container is running
if ! docker ps | grep -q qlisen-whisper; then
    echo "❌ Docker container is not running"
    echo "   Run ./start.sh first"
    exit 1
fi

# Test 1: Local health check
echo "Test 1: Local Health Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if curl -s http://localhost:5000/ > /dev/null 2>&1; then
    echo "✅ Local server responding"
else
    echo "❌ Local server not responding"
    echo "   Check Docker logs: docker-compose logs"
    exit 1
fi

echo ""

# Test 2: Tunnel health check
echo "Test 2: Tunnel Health Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -f tunnel_url.txt ]; then
    TUNNEL_URL=$(cat tunnel_url.txt)
    echo "Tunnel URL: $TUNNEL_URL"

    if curl -s "$TUNNEL_URL/" > /dev/null 2>&1; then
        echo "✅ Tunnel is accessible"
    else
        echo "❌ Tunnel not accessible"
        echo "   Run ./restart.sh to recreate tunnel"
        exit 1
    fi
else
    echo "⚠️  No tunnel URL found"
    echo "   Run ./start.sh to create tunnel"
fi

echo ""

# Test 3: Transcription test (requires sample audio)
echo "Test 3: Transcription Test"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "To test transcription, you need a sample audio file."
echo ""
echo "If you have a test.mp3 file in this directory, run:"
echo ""
echo "  curl -X POST http://localhost:5000/asr \\
    -F \"audio_file=@test.mp3\" \\
    -F \"task=transcribe\" \\
    -F \"language=ar\" \\
    -F \"output=json\""
echo ""
echo "Or test via tunnel:"
echo ""
if [ -f tunnel_url.txt ]; then
    TUNNEL_URL=$(cat tunnel_url.txt)
    echo "  curl -X POST $TUNNEL_URL/asr \\
    -F \"audio_file=@test.mp3\" \\
    -F \"task=transcribe\" \\
    -F \"language=ar\" \\
    -F \"output=json\""
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Basic tests passed!"
echo ""
echo "📊 System Status:"
docker ps --filter "name=qlisen-whisper" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

if [ -f tunnel.pid ]; then
    TUNNEL_PID=$(cat tunnel.pid)
    if ps -p $TUNNEL_PID > /dev/null 2>&1; then
        echo "Cloudflare Tunnel: Running (PID: $TUNNEL_PID)"
    else
        echo "Cloudflare Tunnel: ⚠️  Process not found (may have crashed)"
        echo "   Run ./restart.sh to recreate"
    fi
else
    echo "Cloudflare Tunnel: Not found"
fi

echo ""
