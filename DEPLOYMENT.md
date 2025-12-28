# Qlisen Deployment Guide

Complete deployment guide for the Qlisen Quran Recitation Verifier system.

## System Architecture

```
User Browser
    ↓
Frontend (Render - Free tier)
    ↓
Backend (Render - Starter $7/mo)
    ↓
Cloudflare Tunnel (Free)
    ↓
Your PC - Docker Whisper (Free)
```

---

## Prerequisites

Before deploying, ensure you have:

- [ ] GitHub account
- [ ] Render account (https://render.com)
- [ ] SendGrid account for emails (https://sendgrid.com)
- [ ] Your PC set up with Docker + Whisper (see `local-whisper-setup/README.md`)
- [ ] Cloudflare tunnel URL from your PC

---

## Part 1: Setup Your Local Whisper Server

### Step 1: Copy Local Whisper Setup Files

On your PC:

```bash
# Create directory
mkdir ~/qlisen-whisper
cd ~/qlisen-whisper

# Copy files from local-whisper-setup/ directory:
# - docker-compose.yml
# - .env.example
# - start.sh
# - stop.sh
# - restart.sh
# - test-whisper.sh
# - README.md
```

### Step 2: Start Whisper Server

```bash
# Make scripts executable (Mac/Linux)
chmod +x *.sh

# Start everything
./start.sh
```

**First run takes 5-10 minutes** to download Docker image and Whisper model.

### Step 3: Get Your Tunnel URL

After `./start.sh` completes, you'll see:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📡 Your Whisper Server is now accessible at:

   https://abc-def-123.trycloudflare.com

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**SAVE THIS URL!** You'll need it for Render deployment.

### Step 4: Test Your Whisper Server

```bash
./test-whisper.sh
```

Should show:
```
✅ Local server responding
✅ Tunnel is accessible
```

---

## Part 2: Get SendGrid API Key

### Step 1: Create SendGrid Account

1. Go to https://sendgrid.com/free/
2. Sign up (free tier: 100 emails/day)
3. Verify your email

### Step 2: Create API Key

1. Go to Settings → API Keys
2. Click "Create API Key"
3. Name: `Qlisen Production`
4. Type: **Full Access**
5. Click "Create & View"
6. **COPY THE KEY** (you'll only see it once!)

### Step 3: Verify Sender Email (Optional but Recommended)

1. Go to Settings → Sender Authentication
2. Click "Verify a Single Sender"
3. Enter your email (e.g., `noreply@yourdomain.com`)
4. Verify the email

---

## Part 3: Deploy Backend to Render

### Step 1: Push Code to GitHub

```bash
cd /path/to/qlisen
git add .
git commit -m "Add Whisper integration with queue system"
git push origin main
```

### Step 2: Create Render Web Service

1. Go to https://dashboard.render.com
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure:

**Basic Settings:**
- **Name**: `qlisen-backend`
- **Region**: Choose closest to your users
- **Branch**: `main` (or your production branch)
- **Root Directory**: `backend`
- **Runtime**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start`

**Instance Type:**
- Select: **Starter** ($7/month)

### Step 3: Add Environment Variables

In Render → Environment tab, add these variables:

```
NODE_ENV=production
PORT=5001

# Whisper Configuration
USE_REMOTE_WHISPER=true
WHISPER_URL=https://abc-def-123.trycloudflare.com

# Email Service (from SendGrid)
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
FROM_EMAIL=noreply@yourdomain.com

# Frontend URL (we'll update this after frontend deployment)
FRONTEND_URL=https://qlisen.onrender.com
```

**IMPORTANT:** Replace `WHISPER_URL` with YOUR tunnel URL from Part 1!

### Step 4: Deploy

1. Click **"Create Web Service"**
2. Wait 2-3 minutes for deployment
3. Check logs for:
   ```
   ✅ Server is running!
   🌐 Whisper configured for REMOTE mode
   ⚙️  Queue processor started
   ```

### Step 5: Test Backend

Get your backend URL (e.g., `https://qlisen-backend.onrender.com`)

Test health endpoint:
```bash
curl https://qlisen-backend.onrender.com/api/transcription/health
```

Should return:
```json
{
  "success": true,
  "whisperConfigured": true,
  "mode": "remote",
  "message": "Whisper transcription service is ready (remote mode)"
}
```

---

## Part 4: Deploy Frontend to Render

### Step 1: Update Frontend API Endpoint

In your frontend code, update the API URL:

```javascript
// frontend/src/config.js (or wherever you configure API)
const API_URL = 'https://qlisen-backend.onrender.com/api';
```

Commit and push:
```bash
git add .
git commit -m "Update API endpoint for production"
git push
```

### Step 2: Create Render Static Site

1. Go to Render Dashboard
2. Click **"New +"** → **"Static Site"**
3. Connect your GitHub repository
4. Configure:

**Basic Settings:**
- **Name**: `qlisen-frontend`
- **Branch**: `main`
- **Root Directory**: `frontend` (or wherever your frontend is)
- **Build Command**: `npm run build` (or your build command)
- **Publish Directory**: `build` or `dist` (depends on your framework)

**Instance Type:**
- Select: **Free**

### Step 3: Deploy

1. Click **"Create Static Site"**
2. Wait 2-3 minutes
3. Get your frontend URL (e.g., `https://qlisen.onrender.com`)

### Step 4: Update Backend Environment

Go back to your backend service:

1. Go to Environment tab
2. Update `FRONTEND_URL` to your frontend URL
3. Click **"Save Changes"** (will redeploy)

---

## Part 5: Setup Monitoring (UptimeRobot)

### Step 1: Create UptimeRobot Account

1. Go to https://uptimerobot.com
2. Sign up (free account)

### Step 2: Add Monitors

**Monitor 1: Whisper Server**
- Name: `Qlisen Whisper`
- Type: HTTP(s)
- URL: Your Cloudflare tunnel URL (e.g., `https://abc-def-123.trycloudflare.com/`)
- Interval: 5 minutes
- Alert: Your email

**Monitor 2: Backend API**
- Name: `Qlisen Backend`
- Type: HTTP(s)
- URL: `https://qlisen-backend.onrender.com/health`
- Interval: 5 minutes
- Alert: Your email

**Monitor 3: Frontend**
- Name: `Qlisen Frontend`
- Type: HTTP(s)
- URL: `https://qlisen.onrender.com`
- Interval: 5 minutes
- Alert: Your email

### Step 3: Configure Alerts

1. Go to My Settings → Alert Contacts
2. Add your email
3. Enable: "Get notified when monitor goes down"
4. Enable: "Get notified when monitor goes up"

---

## Part 6: Testing the Complete System

### Test 1: Health Checks

```bash
# Backend health
curl https://qlisen-backend.onrender.com/api/transcription/health

# Whisper health (via tunnel)
curl https://your-tunnel-url.trycloudflare.com/
```

### Test 2: Queue Stats

```bash
curl https://qlisen-backend.onrender.com/api/transcription/queue/stats
```

### Test 3: End-to-End Upload

1. Open frontend: `https://qlisen.onrender.com`
2. Enter your email
3. Record a short Quran recitation (or upload audio)
4. Submit

**Expected flow:**
- If Whisper online: Immediate result + email
- If Whisper offline: "You are in the queue" message + email later

### Test 4: Queue Processing

1. Stop Whisper on your PC: `./stop.sh`
2. Upload audio from frontend
3. Should get "queued" message
4. Start Whisper: `./start.sh`
5. Wait ~30 seconds (queue processor interval)
6. Check email - should receive results

---

## Part 7: Troubleshooting

### Issue: Backend can't reach Whisper

**Symptoms:**
- "Whisper offline" errors
- Jobs stuck in queue

**Solutions:**
1. Check if your PC is on and connected to internet
2. Check tunnel status: `tail -f ~/qlisen-whisper/tunnel.log`
3. Restart tunnel: `cd ~/qlisen-whisper && ./restart.sh`
4. Update `WHISPER_URL` in Render if tunnel URL changed

### Issue: Emails not sending

**Symptoms:**
- Results processed but no emails received

**Solutions:**
1. Check SendGrid API key in Render environment
2. Check SendGrid dashboard for errors
3. Verify sender email is verified in SendGrid
4. Check spam folder

### Issue: Frontend can't reach backend

**Symptoms:**
- CORS errors
- Network errors in browser console

**Solutions:**
1. Verify `API_URL` in frontend code
2. Check backend is running in Render dashboard
3. Check backend logs for errors

### Issue: Queue not processing

**Symptoms:**
- Jobs stuck in "queued" status forever

**Solutions:**
1. Check backend logs in Render
2. Verify queue processor started: Look for "⚙️ Queue processor started"
3. Restart backend service in Render

---

## Part 8: Maintenance

### Daily Tasks

**None!** System runs automatically.

### Weekly Tasks

- Check UptimeRobot dashboard for uptime %
- Check SendGrid usage (should be well under 100/day limit)

### Monthly Tasks

- Review queue statistics
- Clean up old jobs (automatic after 7 days)
- Check costs:
  - Render Backend: $7/month
  - Frontend: $0
  - SendGrid: $0
  - Your PC electricity: ~$5-10/month
  - **Total: ~$12-17/month**

### When Your Tunnel URL Changes

If you restart the tunnel, URL changes:

1. Run `./restart.sh` on your PC
2. Copy new URL
3. Go to Render → Backend → Environment
4. Update `WHISPER_URL`
5. Save (will redeploy)

---

## Part 9: Scaling Considerations

### When to upgrade?

**Upgrade to cloud Whisper if:**
- More than 50 users per day
- Need 99.9% uptime (vs ~95% with PC)
- Can't keep PC running 24/7
- Queue wait times >5 minutes regularly

**How to upgrade:**
1. Deploy Whisper to Render Pro ($85/month)
2. Update `USE_REMOTE_WHISPER=false`, `USE_LOCAL_WHISPER=true`
3. Remove `WHISPER_URL`
4. Turn off your PC Docker

### When to switch to API?

**Switch to OpenAI Whisper API if:**
- Medium usage (100-500 transcriptions/day)
- Want simplicity
- Don't want to manage infrastructure

**How to switch:**
1. Get OpenAI API key
2. Update Render environment:
   - `USE_REMOTE_WHISPER=false`
   - `OPENAI_API_KEY=sk-...`
3. Remove `WHISPER_URL`
4. Turn off your PC Docker

---

## Part 10: Backup and Recovery

### Backup Queue Data

Queue data is stored in `/backend/queue/jobs.json` on Render.

**To backup:**
1. Not critical for testing (emails are sent, users notified)
2. For production, migrate to database (MongoDB Atlas free tier)

### Recovery Procedures

**If backend crashes:**
- Render auto-restarts within 30 seconds
- Queue processor auto-starts
- Queued jobs resume processing

**If your PC crashes:**
- Docker auto-restarts
- Tunnel auto-reconnects
- Downtime: ~30 seconds

**If tunnel goes down:**
- Requests get queued
- UptimeRobot alerts you
- Restart tunnel: `./restart.sh`
- Update Render if URL changed

---

## Costs Summary

| Service | Tier | Cost/Month |
|---------|------|------------|
| **Render Backend** | Starter | $7.00 |
| **Render Frontend** | Free | $0.00 |
| **SendGrid Email** | Free (100/day) | $0.00 |
| **Cloudflare Tunnel** | Free | $0.00 |
| **UptimeRobot** | Free | $0.00 |
| **Your PC (electricity)** | 24/7 | $5-10 |
| **TOTAL** | | **$12-17/month** |

---

## Support Contacts

- **Render Support**: https://render.com/docs
- **SendGrid Support**: https://support.sendgrid.com
- **Docker Issues**: https://docs.docker.com
- **Cloudflare Tunnel**: https://developers.cloudflare.com/cloudflare-one/

---

## Next Steps After Deployment

1. ✅ Invite friends for beta testing
2. ✅ Monitor queue statistics daily
3. ✅ Collect user feedback
4. ✅ Track uptime via UptimeRobot
5. ✅ Optimize based on real usage patterns
6. ✅ Plan migration to cloud if needed

---

**Your Qlisen system is now deployed and ready for testing!** 🎉
