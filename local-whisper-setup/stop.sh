#!/bin/bash

echo "🛑 Stopping Qlisen Whisper Server..."
echo ""

# Stop Cloudflare tunnel
if [ -f tunnel.pid ]; then
    TUNNEL_PID=$(cat tunnel.pid)
    echo "🔗 Stopping Cloudflare tunnel (PID: $TUNNEL_PID)..."
    kill $TUNNEL_PID 2>/dev/null || echo "   Tunnel already stopped"
    rm tunnel.pid 2>/dev/null
else
    echo "🔗 Stopping any running Cloudflare tunnels..."
    pkill -f "cloudflared tunnel" || echo "   No tunnel found"
fi

# Stop Docker container
echo "🐳 Stopping Docker container..."
docker-compose down

# Clean up log files (optional)
if [ -f tunnel.log ]; then
    mv tunnel.log tunnel.log.old
    echo "📝 Moved tunnel.log to tunnel.log.old"
fi

echo ""
echo "✅ Everything stopped"
echo ""
echo "💡 To start again: ./start.sh"
echo ""
