# Qlisen Local Whisper Server Setup

This directory contains everything you need to run the Whisper transcription server on your local PC.

## 📋 Prerequisites

### Required Software

1. **Docker Desktop**
   - Download: https://www.docker.com/products/docker-desktop
   - Windows/Mac: Install and start Docker Desktop
   - Verify: `docker --version`

2. **Cloudflare Tunnel (cloudflared)**
   - Download: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation
   - **Windows**: Download from https://github.com/cloudflare/cloudflared/releases
   - **Mac**: `brew install cloudflare/cloudflare/cloudflared`
   - **Linux**: `wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb && sudo dpkg -i cloudflared-linux-amd64.deb`
   - Verify: `cloudflared --version`

### System Requirements

- **CPU**: 13th Gen Intel i7 (you have this ✅)
- **RAM**: 16GB total (you have this ✅)
- **Storage**: 10GB free space
- **Internet**: 5+ Mbps upload speed

---

## 🚀 Quick Start

### 1. Copy This Directory to Your PC

```bash
# Create directory on your PC
mkdir ~/qlisen-whisper
cd ~/qlisen-whisper

# Copy all files from this directory to ~/qlisen-whisper/
```

### 2. Create Environment File

```bash
cp .env.example .env
```

Edit `.env` if you want to change the model (default is `base`):

```env
WHISPER_MODEL=base
```

### 3. Make Scripts Executable (Mac/Linux)

```bash
chmod +x start.sh stop.sh restart.sh test-whisper.sh
```

### 4. Start Everything

```bash
./start.sh
```

**First run will:**
- Download Docker image (~3GB) - takes 5-10 minutes
- Download Whisper model (~150MB for base)
- Start Docker container
- Create Cloudflare tunnel
- Show you the tunnel URL

**Output will look like:**
```
✅ Tunnel created successfully!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📡 Your Whisper Server is now accessible at:

   https://abc-def-123.trycloudflare.com

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 5. Copy the Tunnel URL

**IMPORTANT**: Copy this URL and save it!

You'll need to add it to your Render backend:
1. Go to https://dashboard.render.com
2. Select your backend service
3. Go to **Environment** tab
4. Add/Update variable:
   - **Name**: `WHISPER_URL`
   - **Value**: `https://abc-def-123.trycloudflare.com`
5. Click **Save Changes**

---

## 🛠️ Daily Usage

### Starting the Server

```bash
./start.sh
```

**Takes**: 10-30 seconds (after first run)

### Stopping the Server

```bash
./stop.sh
```

### Testing the Server

```bash
./test-whisper.sh
```

### Restarting Tunnel (if URL changes)

```bash
./restart.sh
```

This will give you a **new URL** - you'll need to update Render again.

---

## 📊 Monitoring

### View Docker Logs

```bash
docker-compose logs -f
```

Press `Ctrl+C` to exit.

### View Tunnel Logs

```bash
tail -f tunnel.log
```

### Check Status

```bash
docker ps
```

Should show `qlisen-whisper` container running.

---

## 🔧 Troubleshooting

### Docker Container Won't Start

**Check logs:**
```bash
docker-compose logs
```

**Common issues:**
- Docker Desktop not running → Start it
- Port 5000 already in use → Change port in `docker-compose.yml`
- Not enough RAM → Close other applications

### Tunnel Not Creating

**Check if cloudflared is installed:**
```bash
cloudflared --version
```

**Check tunnel logs:**
```bash
cat tunnel.log
```

**Restart tunnel:**
```bash
./restart.sh
```

### Whisper Not Responding

**1. Check if container is running:**
```bash
docker ps | grep qlisen-whisper
```

**2. Check health:**
```bash
curl http://localhost:5000/
```

**3. Restart everything:**
```bash
./stop.sh
./start.sh
```

### Out of Memory Errors

**Reduce Docker limits in `docker-compose.yml`:**

```yaml
deploy:
  resources:
    limits:
      cpus: '2.0'    # Reduced from 4
      memory: 4G     # Reduced from 6G
```

Or use smaller model in `.env`:
```env
WHISPER_MODEL=tiny
```

### Slow Transcription

**Try smaller model:**
- `tiny` - fastest, less accurate
- `base` - good balance (current)
- `small` - slower, more accurate

Edit `.env`:
```env
WHISPER_MODEL=tiny
```

Then restart:
```bash
./stop.sh
./start.sh
```

---

## 📁 Files Explanation

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Docker configuration |
| `.env` | Environment variables |
| `start.sh` | Start Docker + Tunnel |
| `stop.sh` | Stop everything |
| `restart.sh` | Restart tunnel (new URL) |
| `test-whisper.sh` | Test if working |
| `tunnel_url.txt` | Current tunnel URL (auto-created) |
| `tunnel.log` | Tunnel logs (auto-created) |
| `tunnel.pid` | Tunnel process ID (auto-created) |

---

## 🔄 Auto-Start on Boot (Optional)

### Windows

1. Press `Win+R`, type `shell:startup`
2. Create shortcut to `start.sh` in startup folder

### Mac

1. Open **System Preferences** → **Users & Groups**
2. Click **Login Items**
3. Add `start.sh` to login items

### Linux

Create systemd service (advanced).

---

## 📈 Performance Expectations

With your **13th Gen i7 + 16GB RAM**:

| Audio Length | Processing Time |
|--------------|-----------------|
| 10 seconds | ~1 second |
| 30 seconds | ~2-4 seconds |
| 60 seconds | ~5-8 seconds |
| 120 seconds | ~10-15 seconds |

**Concurrent users**: 3-5 (with queue system)

---

## 💰 Costs

### Setup
- Docker Desktop: **Free**
- Cloudflare Tunnel: **Free**
- Whisper models: **Free**

### Monthly
- Electricity: ~$5-10/month (24/7)
- Everything else: **$0**

---

## 🔒 Security

### What's Exposed
- Your Whisper server via Cloudflare tunnel
- Encrypted HTTPS connection
- No direct IP exposure

### What's NOT Exposed
- Your home network
- Your PC file system
- Other applications

**Risk level**: Low (Cloudflare tunnel is secure)

---

## 📞 Support

### Check Status
```bash
./test-whisper.sh
```

### View Logs
```bash
# Docker logs
docker-compose logs -f

# Tunnel logs
tail -f tunnel.log
```

### Restart Everything
```bash
./stop.sh
./start.sh
```

### Clean Reinstall
```bash
# Stop and remove everything
./stop.sh
docker-compose down -v
docker system prune -a

# Start fresh
./start.sh
```

---

## 🎯 Next Steps

After setup:

1. ✅ Run `./start.sh`
2. ✅ Copy tunnel URL
3. ✅ Add to Render backend environment
4. ✅ Run `./test-whisper.sh` to verify
5. ✅ Test with sample audio from frontend
6. ✅ Invite friends to test

---

## ⚡ Tips

- **Keep PC on**: For 24/7 testing
- **Save tunnel URL**: Keep `tunnel_url.txt` backed up
- **Monitor logs**: Check occasionally for errors
- **Test regularly**: Run `./test-whisper.sh` daily
- **Update Render**: When you restart tunnel

---

## 🚨 Emergency Procedures

### If PC Crashes
- Docker auto-restarts: Wait 30 seconds
- Tunnel auto-reconnects: Should resume

### If Internet Goes Down
- Queued jobs will wait
- When back: Auto-processes queue

### If You Need to Restart PC
```bash
# Before restarting
./stop.sh

# After restarting
./start.sh
# Update Render with new tunnel URL
```

---

## 📝 UptimeRobot Setup

Monitor your Whisper server:

1. Go to https://uptimerobot.com (free account)
2. Add New Monitor:
   - **Type**: HTTP(s)
   - **Name**: Qlisen Whisper
   - **URL**: Your tunnel URL from `tunnel_url.txt`
   - **Interval**: 5 minutes
3. Add alert email
4. Get uptime dashboard

---

## ✅ Checklist

Before inviting friends:

- [ ] Docker installed and running
- [ ] cloudflared installed
- [ ] `./start.sh` runs successfully
- [ ] Tunnel URL created
- [ ] Added WHISPER_URL to Render
- [ ] `./test-whisper.sh` passes
- [ ] Tested from Render backend
- [ ] UptimeRobot monitoring setup
- [ ] PC set to not sleep
- [ ] Know how to restart if needed

---

**Your Whisper server is ready! 🎉**
