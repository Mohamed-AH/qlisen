# Qlisen - Quick Start Guide

## ✅ What's Ready

### Backend ✅
- ✅ All APIs working
- ✅ Whisper transcription (Docker on localhost:5000)
- ✅ Fast-path detection
- ✅ N-gram fallback
- ✅ Verse analysis
- ✅ Queue system

### Frontend ✅
- ✅ Complete UI matching Hafiz design
- ✅ Audio recording
- ✅ Results display
- ✅ Arabic/English support
- ✅ Queue support

---

## 🚀 Test Locally (Your PC)

### Step 1: Start Docker Whisper

```bash
cd /d/qlisen-whisper-local
docker-compose up -d
```

**Verify:** http://localhost:5000 (should redirect to /docs)

### Step 2: Start Backend

```bash
cd /d/claudes/quranlisten/qlisen/backend
npm start
```

**Verify:** http://localhost:5001/health

### Step 3: Serve Frontend

Open **new terminal**:

```bash
cd /d/claudes/quranlisten/qlisen/frontend
python -m http.server 3000
```

Or use Node.js:

```bash
npx http-server -p 3000
```

**Verify:** http://localhost:3000

---

## 🎤 Test the App

1. **Open:** http://localhost:3000 in your browser
2. **Click:** "استمع" (Listen) button
3. **Allow:** Microphone permission
4. **Recite:** Any Quran verses
5. **Click:** "إيقاف" (Stop) button
6. **Wait:** Results appear!

---

## 🎨 Design Features

### Colors (Matching Hafiz)
- Forest Dark: #0a3a2a
- Forest Mid: #145a3e
- Forest Light: #1e7a54
- Gold: #d4af37
- Gold Light: #f4d77f
- Cream: #faf8f3

### Fonts
- Rakkas (titles)
- Cairo (Arabic body)
- Crimson Pro (English body)
- Amiri (decorative)

### Effects
- Glassmorphism cards
- Backdrop blur (20px)
- Gradient backgrounds
- Smooth animations

---

## 📊 Expected Results

### Perfect Recitation (Al-Fatihah Verse 1)
```json
{
  "surah": "الفاتحة",
  "startVerse": 1,
  "endVerse": 1,
  "accuracy": 1.0,
  "method": "fast_path",
  "verses": [{
    "status": "perfect",
    "accuracy": 1.0
  }]
}
```

### Good Recitation (Al-Falaq)
```json
{
  "surah": "الفلق",
  "startVerse": 1,
  "endVerse": 5,
  "accuracy": 0.91,
  "verses": [
    { "ayah": 1, "status": "perfect", "accuracy": 1.0 },
    { "ayah": 4, "status": "good", "accuracy": 0.8 }
  ]
}
```

---

## ⌨️ Keyboard Shortcuts

- **Space:** Start/Stop recording
- **Escape:** Cancel recording or close help
- **Click background:** Close help modal

---

## 🌐 Language Toggle

Click "English" in top-left to switch to English.
Click "العربية" to switch back to Arabic.

**Saved automatically** in localStorage.

---

## 🔧 Troubleshooting

### Microphone Not Working
- Check browser permissions (click 🔒 in address bar)
- Try different browser (Chrome recommended)
- Check System → Privacy → Microphone

### Backend Not Connecting
- Verify backend is running on localhost:5001
- Check `frontend/js/config.js` → `API_BASE_URL`
- Check browser console for errors (F12)

### Whisper Not Responding
- Verify Docker is running: `docker ps`
- Should see `qlisen-whisper` container
- Check logs: `docker-compose logs -f`

### Poor Transcription Quality
- Use **small** or **medium** model (not base)
- Speak clearly and slowly
- Reduce background noise
- Try shorter recitations (1-3 verses)

---

## 📱 Mobile Testing

Frontend works on mobile browsers:

1. **Find your PC's IP:**
   ```bash
   ipconfig
   # Look for IPv4 Address (e.g., 192.168.1.100)
   ```

2. **Update frontend config:**
   Edit `frontend/js/config.js`:
   ```javascript
   API_BASE_URL: 'http://192.168.1.100:5001'
   ```

3. **Open on phone:**
   ```
   http://192.168.1.100:3000
   ```

**Note:** PC and phone must be on same WiFi network.

---

## 🚀 Next Steps

### For Local Testing
- ✅ Test with friends (share PC IP)
- ✅ Collect feedback
- ✅ Test various surahs

### For Production
1. **Deploy Backend** to Render
2. **Deploy Frontend** to Vercel/Netlify
3. **Update API_BASE_URL** in config.js
4. **Configure SendGrid** for email notifications
5. **Add link** from Hafiz user profile page

---

## 📋 Integration with Hafiz

### Add Link to User Profile

In Hafiz `app.html`, add:

```html
<!-- Qlisen Link -->
<div class="feature-card">
    <h3>🎤 تحقق من تلاوتك</h3>
    <p>استخدم قليسن للتحقق من تلاوتك وتحسين حفظك</p>
    <a href="https://qlisen.yourdomain.com" class="btn">
        افتح قليسن
    </a>
</div>
```

Styling will automatically match because we use the same design system!

---

## ✨ Summary

**Ready to test:**
1. ✅ Backend working perfectly
2. ✅ Whisper transcribing accurately
3. ✅ Frontend matching Hafiz design
4. ✅ Bilingual support (AR/EN)
5. ✅ Queue system ready
6. ✅ All features implemented

**Test it now!** 🎉

Open http://localhost:3000 and try reciting Al-Fatihah!
