#!/bin/bash

echo "🚀 Starting Qlisen Whisper Server..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop first."
    exit 1
fi

# Check if .env exists, if not copy from example
if [ ! -f .env ]; then
    echo "📝 Creating .env file from example..."
    cp .env.example .env
fi

# Start Docker container
echo "🐳 Starting Docker container..."
docker-compose up -d

# Wait for Whisper to be ready
echo "⏳ Waiting for Whisper to be ready (this may take 30-60 seconds on first run)..."
sleep 10

# Check if container is running
if ! docker ps | grep -q qlisen-whisper; then
    echo "❌ Failed to start Docker container"
    echo "Run 'docker-compose logs' to see error details"
    exit 1
fi

# Wait for health check
echo "🏥 Checking Whisper health..."
max_attempts=12
attempt=0
while [ $attempt -lt $max_attempts ]; do
    if curl -s http://localhost:5000/ > /dev/null 2>&1; then
        echo "✅ Whisper is ready!"
        break
    fi
    attempt=$((attempt + 1))
    echo "   Attempt $attempt/$max_attempts..."
    sleep 5
done

if [ $attempt -eq $max_attempts ]; then
    echo "⚠️  Whisper didn't respond to health check, but container is running"
    echo "   Check logs with: docker-compose logs"
fi

echo ""
echo "🌐 Starting Cloudflare Tunnel..."
echo ""

# Check if cloudflared is installed
if ! command -v cloudflared &> /dev/null; then
    echo "❌ cloudflared is not installed"
    echo ""
    echo "Please install it from: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation"
    echo ""
    echo "Quick install:"
    echo "  Windows: Download from https://github.com/cloudflare/cloudflared/releases"
    echo "  Mac: brew install cloudflare/cloudflare/cloudflared"
    echo "  Linux: wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb && sudo dpkg -i cloudflared-linux-amd64.deb"
    exit 1
fi

# Start tunnel in background and save URL
echo "🔗 Creating tunnel (this will generate a random URL)..."
cloudflared tunnel --url http://localhost:5000 > tunnel.log 2>&1 &
TUNNEL_PID=$!
echo $TUNNEL_PID > tunnel.pid

# Wait for tunnel URL to appear in logs
echo "⏳ Waiting for tunnel URL..."
sleep 5

# Extract URL from logs
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
    echo "⚠️  Could not extract tunnel URL from logs"
    echo "   Check tunnel.log for details"
    echo "   Tunnel PID: $TUNNEL_PID"
else
    echo ""
    echo "✅ Tunnel created successfully!"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📡 Your Whisper Server is now accessible at:"
    echo ""
    echo "   $TUNNEL_URL"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "⚠️  IMPORTANT: Copy this URL and add it to your Render backend environment variables:"
    echo "   Variable name: WHISPER_URL"
    echo "   Value: $TUNNEL_URL"
    echo ""
    echo "💡 This URL will change if you restart the tunnel"
    echo ""

    # Save URL to file for reference
    echo $TUNNEL_URL > tunnel_url.txt
fi

echo ""
echo "📊 Status:"
echo "   Docker container: Running (PID: $(docker inspect -f '{{.State.Pid}}' qlisen-whisper))"
echo "   Cloudflare tunnel: Running (PID: $TUNNEL_PID)"
echo ""
echo "🛠️  Useful commands:"
echo "   View Docker logs:  docker-compose logs -f"
echo "   View tunnel logs:  tail -f tunnel.log"
echo "   Stop everything:   ./stop.sh"
echo "   Restart tunnel:    ./restart.sh"
echo ""
