#!/bin/bash

echo "🔄 Restarting Cloudflare Tunnel..."
echo ""
echo "⚠️  Note: This will generate a NEW tunnel URL"
echo "   You'll need to update the WHISPER_URL in Render backend"
echo ""

# Stop tunnel only (keep Docker running)
if [ -f tunnel.pid ]; then
    TUNNEL_PID=$(cat tunnel.pid)
    echo "🔗 Stopping old tunnel (PID: $TUNNEL_PID)..."
    kill $TUNNEL_PID 2>/dev/null || echo "   Tunnel already stopped"
    rm tunnel.pid 2>/dev/null
else
    echo "🔗 Stopping any running tunnels..."
    pkill -f "cloudflared tunnel" || echo "   No tunnel found"
fi

# Archive old log
if [ -f tunnel.log ]; then
    mv tunnel.log tunnel.log.old
fi

# Start new tunnel
echo "🌐 Starting new tunnel..."
cloudflared tunnel --url http://localhost:5000 > tunnel.log 2>&1 &
TUNNEL_PID=$!
echo $TUNNEL_PID > tunnel.pid

# Wait for new URL
echo "⏳ Waiting for tunnel URL..."
sleep 5

# Extract new URL
TUNNEL_URL=""
max_attempts=10
attempt=0
while [ $attempt -lt $max_attempts ]; do
    if [ -f tunnel.log ]; then
        TUNNEL_URL=$(grep -oP 'https://[a-zA-Z0-9-]+\.trycloudflare\.com' tunnel.log | head -1)
        if [ ! -z "$TUNNEL_URL" ]; then
            break
        fi
    fi
    attempt=$((attempt + 1))
    sleep 2
done

if [ -z "$TUNNEL_URL" ]; then
    echo "❌ Could not extract tunnel URL"
    echo "   Check tunnel.log for details"
else
    # Save new URL
    echo $TUNNEL_URL > tunnel_url.txt

    echo ""
    echo "✅ Tunnel restarted successfully!"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📡 NEW Tunnel URL:"
    echo ""
    echo "   $TUNNEL_URL"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "⚠️  ACTION REQUIRED:"
    echo ""
    echo "1. Go to Render Dashboard: https://dashboard.render.com"
    echo "2. Select your backend service (qlisen-backend)"
    echo "3. Go to Environment tab"
    echo "4. Update WHISPER_URL to: $TUNNEL_URL"
    echo "5. Click 'Save Changes' (this will redeploy the backend)"
    echo ""
    echo "💡 Your backend will be back online in ~2-3 minutes after redeployment"
    echo ""
fi
