# 📱 Mobile Testing Setup Guide

Complete guide for testing the Hafiz Full Quran Recitation Tracker on your mobile device using ngrok.

---

## 🚀 Quick Start (Automatic Setup)

### Option A: One-Command Setup

```bash
cd /home/user/qlisen
./start-mobile.sh
```

This script will automatically:
- ✅ Start the backend server (port 5001)
- ✅ Create ngrok tunnel for remote access
- ✅ Start frontend HTTP server (port 8000)
- ✅ Display all URLs you need

**Then follow the URLs shown in the output!**

---

## 🔧 Manual Setup (Step by Step)

If you prefer to set things up manually or the script doesn't work:

### Step 1: Start Backend Server

```bash
cd /home/user/qlisen
node backend/test-server.js
```

Keep this terminal open. You should see:
```
✅ Quran data loaded successfully
   📖 Verses: 6,236
   ...
✅ Server is running!
```

### Step 2: Start ngrok Tunnel

Open a **NEW terminal** and run:

```bash
ngrok http 5001
```

You'll see output like:
```
Session Status    online
Forwarding        https://abc123.ngrok.io -> http://localhost:5001
```

**Copy the ngrok URL** (e.g., `https://abc123.ngrok.io`)

> **Note**: If ngrok is not installed:
> - Download from: https://ngrok.com/download
> - Or install: `brew install ngrok` (Mac) / `snap install ngrok` (Linux)
> - Sign up and authenticate: `ngrok authtoken YOUR_TOKEN`

### Step 3: Serve Frontend

Open a **THIRD terminal** and run:

```bash
cd /home/user/qlisen
python3 -m http.server 8000
```

### Step 4: Get Your Local IP

```bash
hostname -I | awk '{print $1}'
# Or on Mac:
ipconfig getifaddr en0
```

Example output: `192.168.1.100`

---

## 📱 Accessing on Mobile

### Make sure your mobile is on the **SAME WiFi** as your computer!

### Step 1: Open the Page

On your mobile browser, go to:
```
http://YOUR_LOCAL_IP:8000/quran-full.html
```

Example:
```
http://192.168.1.100:8000/quran-full.html
```

### Step 2: Configure Backend URL

When the page loads, you'll see a configuration section:

1. **Tap** the input field labeled "أدخل رابط الخادم"
2. **Paste** your ngrok URL (e.g., `https://abc123.ngrok.io`)
3. **Tap** the "حفظ" (Save) button

The page will connect to the backend through ngrok.

### Step 3: Grant Microphone Permission

When you tap "🎤 استمع" (Listen):
1. Browser will ask for microphone permission
2. Tap **Allow** or **OK**

### Step 4: Start Reciting!

Recite any Quranic verse clearly and watch it detect your position!

---

## 🧪 Testing Checklist

Test these features on your mobile:

### Connection Test
- [ ] Page loads successfully
- [ ] Backend URL can be updated
- [ ] Health check shows "✅ Backend is ready"

### Speech Recognition Test
- [ ] Microphone permission granted
- [ ] "Listen" button works
- [ ] Status shows "جاري الاستماع..." (Listening...)
- [ ] Transcript appears as you speak

### Position Detection Test
- [ ] Recite Al-Fatiha: "بسم الله الرحمن الرحيم الحمد لله رب العالمين"
- [ ] Position indicator appears with gold background
- [ ] Surah name, ayah, page, juz shown correctly
- [ ] Confidence score displayed (50-100%)
- [ ] Arabic verses appear below

### Session Stats Test
- [ ] Word count increases
- [ ] Session duration timer running
- [ ] Surahs detected count updates
- [ ] Average confidence shown

### Stop and Summary Test
- [ ] "Stop" button works
- [ ] Session summary displayed
- [ ] All stats preserved

---

## 🎯 Recommended Test Verses

Try these well-known verses for best results:

### Al-Fatiha (Surah 1)
```
بسم الله الرحمن الرحيم الحمد لله رب العالمين الرحمن الرحيم مالك يوم الدين
```

### Al-Ikhlas (Surah 112)
```
قل هو الله أحد الله الصمد لم يلد ولم يولد ولم يكن له كفوا أحد
```

### Al-Falaq (Surah 113)
```
قل أعوذ برب الفلق من شر ما خلق
```

### Ayat al-Kursi (Al-Baqarah 255)
```
الله لا إله إلا هو الحي القيوم لا تأخذه سنة ولا نوم
```

---

## 🔍 Troubleshooting

### "لم يتم الاتصال بالخادم" (Cannot connect to server)

**Solutions:**
1. Make sure backend is running: `curl http://localhost:5001/health`
2. Check ngrok is running: `curl http://localhost:4040/api/tunnels`
3. Verify the ngrok URL in your mobile browser
4. Try accessing the ngrok URL directly (should show API response)

### Microphone Not Working

**Solutions:**
1. Use **Chrome** or **Safari** on mobile (best support)
2. Make sure you're on **HTTPS** (ngrok provides this automatically)
3. Check browser settings → Permissions → Microphone
4. Try reloading the page and granting permission again

### Mobile Can't Access Page

**Solutions:**
1. Verify both devices on **same WiFi network**
2. Check firewall isn't blocking port 8000
3. Try your computer's IP address: `http://YOUR_IP:8000/quran-full.html`
4. Some WiFi networks block device-to-device communication (try mobile hotspot)

### Speech Recognition Not Working

**Solutions:**
1. Speak **clearly** and **loudly**
2. Use **Modern Standard Arabic** pronunciation
3. Recite at **moderate pace** (not too fast)
4. Make sure there's minimal **background noise**
5. Try **Chrome browser** (best Arabic recognition)

### Position Not Detected

**Solutions:**
1. Recite at least **5-7 words** clearly
2. Wait **3 seconds** for detection
3. Try a **well-known verse** first (Al-Fatiha)
4. Check confidence score (below 50% means unclear audio)
5. Speak **louder** and more **clearly**

### ngrok Session Expired

**Free ngrok sessions expire after 2 hours or on restart.**

**Solutions:**
1. Restart ngrok: `ngrok http 5001`
2. Get the new URL
3. Update it in the mobile app
4. Or use `./start-mobile.sh` to restart everything

---

## 🛑 Stopping All Services

### Automatic Stop

```bash
cd /home/user/qlisen
./stop-all.sh
```

### Manual Stop

```bash
# Stop backend
pkill -f "node backend/test-server.js"

# Stop ngrok
pkill ngrok

# Stop frontend
pkill -f "python3 -m http.server"
```

---

## 📊 Monitoring & Debugging

### View Backend Logs
```bash
tail -f /home/user/qlisen/backend.log
```

### View Frontend Logs
```bash
tail -f /home/user/qlisen/frontend.log
```

### View ngrok Dashboard
Open in browser: `http://localhost:4040`

Shows:
- Request history
- Response times
- Errors and debugging info

### Mobile Browser Console

On **Chrome Android**:
1. Connect phone to computer via USB
2. Open `chrome://inspect` on desktop Chrome
3. Click "Inspect" on your mobile page
4. View console logs and errors

On **Safari iOS**:
1. Enable "Web Inspector" in Settings → Safari → Advanced
2. Connect to Mac
3. Open Safari → Develop → [Your iPhone]
4. Select the page to inspect

---

## 🌐 Alternative Access Methods

### If Same WiFi Doesn't Work

#### Option 1: Use ngrok for Frontend Too

```bash
# Terminal 1: Backend
node backend/test-server.js

# Terminal 2: Backend ngrok
ngrok http 5001
# Copy this URL (e.g., https://abc123.ngrok.io)

# Terminal 3: Frontend
python3 -m http.server 8000

# Terminal 4: Frontend ngrok
ngrok http 8000
# Copy this URL (e.g., https://xyz789.ngrok.io)
```

Then on mobile:
1. Open: `https://xyz789.ngrok.io/quran-full.html`
2. Set API URL to: `https://abc123.ngrok.io`

#### Option 2: Mobile Hotspot

1. Enable hotspot on your mobile
2. Connect computer to mobile hotspot
3. Get computer's IP on mobile network
4. Access from mobile browser

---

## 💡 Pro Tips

### For Best Speech Recognition:
- ✅ Use **wired** or **good Bluetooth** headset with mic
- ✅ Test in a **quiet environment**
- ✅ Recite at **normal conversational volume**
- ✅ Use **clear tajweed pronunciation**
- ✅ Wait a moment after each verse (not required, but helps)

### For Better Detection:
- ✅ Start with **very well-known verses** (Al-Fatiha, last 3 surahs)
- ✅ Recite **continuously** for at least 5-7 words
- ✅ The more you recite, the **higher the confidence**
- ✅ If detection fails, keep reciting - it will detect after a few seconds

### For Optimal Performance:
- ✅ Use **latest Chrome or Safari** browser
- ✅ Close **other apps** to free up RAM
- ✅ Ensure **good internet connection** for ngrok
- ✅ Keep the app in **foreground** (don't switch apps)

---

## 📞 Quick Reference

### URLs You Need

| Service | URL | Purpose |
|---------|-----|---------|
| Backend | `http://localhost:5001` | API server (local) |
| Backend (ngrok) | `https://YOUR_ID.ngrok.io` | API server (remote) |
| Frontend (local) | `http://localhost:8000/quran-full.html` | Desktop testing |
| Frontend (mobile) | `http://YOUR_IP:8000/quran-full.html` | Mobile testing |
| ngrok Dashboard | `http://localhost:4040` | Monitor requests |

### Commands You Need

| Action | Command |
|--------|---------|
| Start everything | `./start-mobile.sh` |
| Stop everything | `./stop-all.sh` |
| Backend only | `node backend/test-server.js` |
| ngrok only | `ngrok http 5001` |
| Frontend only | `python3 -m http.server 8000` |
| Get local IP | `hostname -I \| awk '{print $1}'` |
| Check backend | `curl localhost:5001/health` |

---

## ✅ Success Indicators

You'll know everything is working when:

1. **Backend**: Can curl `http://localhost:5001/health` successfully
2. **ngrok**: Dashboard shows at `http://localhost:4040`
3. **Frontend**: Page loads at `http://YOUR_IP:8000/quran-full.html`
4. **Mobile**: Can access frontend URL from phone
5. **Connection**: Config card disappears after setting API URL
6. **Microphone**: Browser asks for and grants permission
7. **Recognition**: Transcript appears as you speak
8. **Detection**: Position indicator shows with gold background
9. **Verses**: Arabic text displays correctly (RTL)
10. **Stats**: Numbers update in real-time

---

**بارك الله فيك - Happy testing! 🎉**

If you encounter any issues not covered here, check:
- Browser console (F12 or remote debugging)
- Backend logs (`backend.log`)
- ngrok dashboard (`localhost:4040`)
