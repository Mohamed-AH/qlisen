# Hafiz Integration Guide: Recitation Checker Backend

## 📋 Overview

This guide explains how to integrate the Qlisen Recitation Checker backend into the existing Hafiz Quran memorization tracker.

---

## 🔧 Backend Integration Steps

### Step 1: Copy Data Files

Copy the Quran data to the Hafiz backend:

```bash
# From qlisen directory
cp -r data/* /path/to/hafiz/backend/data/quran/
```

Files to copy:
- `quran-uthmani.json` (3.5MB) - All verses with metadata
- `quran-metadata.json` (148KB) - Surah and page information
- `ngram-index.json` (11MB) - Position detection index

### Step 2: Copy Backend Files

Copy the service, routes, and model:

```bash
# Copy service
cp backend/services/quranService.js /path/to/hafiz/backend/services/

# Copy routes
cp backend/routes/recitation.js /path/to/hafiz/backend/routes/

# Copy model
cp backend/models/RecitationSession.js /path/to/hafiz/backend/models/
```

### Step 3: Update Hafiz server.js

Add these lines to the Hafiz `backend/server.js`:

```javascript
// Near the top with other imports
const quranService = require('./services/quranService');
const recitationRoutes = require('./routes/recitation');

// After database connection, before starting server
// Initialize Quran data on startup
quranService.init(path.join(__dirname, 'data/quran'))
    .then(() => {
        console.log('✅ Quran data loaded for recitation checker');
    })
    .catch(err => {
        console.error('❌ Failed to load Quran data:', err);
        // Don't exit - other features will still work
    });

// With other route mountings
app.use('/api/recitation', recitationRoutes);
```

### Step 4: Update recitation.js Routes

In `backend/routes/recitation.js`, replace the mock auth middleware:

```javascript
// Remove this line:
// const authenticateJWT = (req, res, next) => { ... };

// Add this line:
const { authenticateJWT } = require('../middleware/auth');
```

### Step 5: Uncomment Session Save Code

In `backend/routes/recitation.js`, find and uncomment:
- Session saving in `POST /sessions` (lines ~115-128)
- Session retrieval in `GET /sessions` (lines ~150-175)
- Session stats in `GET /stats` (implement using RecitationSession.getUserStats())

### Step 6: Test Backend

1. Restart the Hafiz backend server
2. Check server logs for "✅ Quran data loaded"
3. Test endpoints:

```bash
# Test position detection
curl -X POST http://localhost:5000/api/recitation/detect-position \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"transcript":"بسم الله الرحمن الرحيم"}'

# Test page retrieval
curl http://localhost:5000/api/recitation/pages?start=1&count=3 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Test metadata
curl http://localhost:5000/api/recitation/metadata \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 🎨 Frontend Integration Steps

### Step 1: Add Recitation Tab to app.html

In `app.html`, add the new tab to the navigation:

```html
<!-- Add to existing tab navigation -->
<div class="tabs">
  <button class="tab active" data-tab="dashboard">Dashboard</button>
  <button class="tab" data-tab="juz">Juz</button>
  <button class="tab" data-tab="history">History</button>
  <button class="tab" data-tab="stats">Stats</button>
  <button class="tab" data-tab="recitation">🎤 Recitation</button> <!-- NEW -->
</div>

<!-- Add new tab content section -->
<section id="recitation-tab" class="tab-content" style="display: none;">
  <div class="recitation-container">
    <!-- Position indicator -->
    <div class="stat-card position-indicator">
      <h3>📖 <span data-i18n="current-position">الموضع الحالي</span></h3>
      <div id="position-display">
        <span id="current-surah">-</span> •
        <span id="current-ayah">-</span> •
        <span id="current-page">-</span>
      </div>
      <div class="confidence-badge">
        <span id="confidence-level">-</span>
      </div>
    </div>

    <!-- Controls -->
    <div class="recitation-controls">
      <button id="listen-btn" class="btn">
        🎤 <span data-i18n="start-listening">ابدأ الاستماع</span>
      </button>
      <button id="stop-btn" class="btn-secondary" style="display: none;">
        ⏹️ <span data-i18n="stop">إيقاف</span>
      </button>
    </div>

    <!-- Live stats -->
    <div class="stat-card live-stats" style="display: none;">
      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-label" data-i18n="words-correct">كلمات صحيحة</span>
          <span class="stat-value" id="live-words">0</span>
        </div>
        <div class="stat-item">
          <span class="stat-label" data-i18n="ayahs-recited">آيات</span>
          <span class="stat-value" id="live-ayahs">0</span>
        </div>
        <div class="stat-item">
          <span class="stat-label" data-i18n="duration">المدة</span>
          <span class="stat-value" id="live-duration">0:00</span>
        </div>
      </div>
    </div>

    <!-- Transcription display -->
    <div class="stat-card" id="transcription-card" style="display: none;">
      <h3 data-i18n="what-heard">ما سمعته</h3>
      <div id="transcription-text" class="arabic-text"></div>
    </div>

    <!-- Results display -->
    <div id="results-container" style="display: none;"></div>
  </div>
</section>
```

### Step 2: Create recitation.js Module

Copy `frontend/recitation.js` to `hafiz/js/recitation.js`

(This file will be created in the next step)

### Step 3: Create recitation.css

Copy `frontend/recitation.css` to `hafiz/css/recitation.css`

(This file will be created in the next step)

### Step 4: Link Files in app.html

Add to `<head>` section:

```html
<link rel="stylesheet" href="css/recitation.css">
```

Add before closing `</body>`:

```html
<script src="js/recitation.js"></script>
```

### Step 5: Initialize in app.js

In `hafiz/js/app.js`, add:

```javascript
// Add to tab switching logic
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const tabName = tab.dataset.tab;

    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(content => {
      content.style.display = 'none';
    });

    // Remove active class
    document.querySelectorAll('.tab').forEach(t => {
      t.classList.remove('active');
    });

    // Show selected tab
    tab.classList.add('active');

    if (tabName === 'recitation') {
      document.getElementById('recitation-tab').style.display = 'block';
      if (typeof RecitationModule !== 'undefined') {
        RecitationModule.init();
      }
    }
    // ... existing tab logic
  });
});
```

---

## 🧪 Testing the Integration

### Backend Tests

1. **Health Check:**
```bash
curl http://localhost:5000/api/recitation/metadata \
  -H "Authorization: Bearer YOUR_JWT"
```

Expected: Surah list, page count

2. **Position Detection:**
```bash
curl -X POST http://localhost:5000/api/recitation/detect-position \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT" \
  -d '{"transcript":"بسم الله الرحمن الرحيم الحمد لله رب العالمين"}'
```

Expected: Detected position (Surah 1, Ayah 1-2, Page 1)

3. **Page Retrieval:**
```bash
curl http://localhost:5000/api/recitation/pages?start=1&count=3 \
  -H "Authorization: Bearer YOUR_JWT"
```

Expected: Pages 1-3 with verses

### Frontend Tests

1. Open Hafiz app and login
2. Click "🎤 Recitation" tab
3. Click "ابدأ الاستماع" (Start Listening)
4. Recite Al-Fatiha verse 1
5. Verify position updates automatically
6. Click "إيقاف" (Stop)
7. Check results display

---

## 📊 File Structure After Integration

```
hafiz/
├── backend/
│   ├── data/
│   │   └── quran/
│   │       ├── quran-uthmani.json
│   │       ├── quran-metadata.json
│   │       └── ngram-index.json
│   ├── models/
│   │   ├── ...existing models...
│   │   └── RecitationSession.js          ← NEW
│   ├── routes/
│   │   ├── ...existing routes...
│   │   └── recitation.js                 ← NEW
│   ├── services/
│   │   └── quranService.js               ← NEW
│   └── server.js                          ← MODIFIED
│
├── js/
│   ├── ...existing modules...
│   ├── recitation.js                      ← NEW
│   └── app.js                              ← MODIFIED
│
├── css/
│   ├── ...existing styles...
│   └── recitation.css                     ← NEW
│
└── app.html                                ← MODIFIED
```

---

## 🎯 Checklist

### Backend
- [ ] Copied data files to `backend/data/quran/`
- [ ] Copied `quranService.js` to `backend/services/`
- [ ] Copied `recitation.js` to `backend/routes/`
- [ ] Copied `RecitationSession.js` to `backend/models/`
- [ ] Updated `server.js` to initialize Quran service
- [ ] Updated `server.js` to mount recitation routes
- [ ] Updated `recitation.js` to use real auth middleware
- [ ] Uncommented session save/retrieve code
- [ ] Tested backend endpoints

### Frontend
- [ ] Added recitation tab to `app.html`
- [ ] Created `recitation.js` module
- [ ] Created `recitation.css` stylesheet
- [ ] Linked CSS in `app.html`
- [ ] Linked JS in `app.html`
- [ ] Updated `app.js` tab switching logic
- [ ] Added i18n translations
- [ ] Tested tab navigation
- [ ] Tested speech recognition
- [ ] Tested position detection

### Testing
- [ ] Backend API responds correctly
- [ ] Position detection works
- [ ] Page retrieval works
- [ ] Session saving works
- [ ] Frontend tab displays correctly
- [ ] Speech recognition starts
- [ ] Position updates in real-time
- [ ] Results display properly
- [ ] Mobile responsive
- [ ] RTL/LTR switching works

---

## 🐛 Troubleshooting

### Backend Issues

**Problem: "Quran data not loaded"**
- Check file paths in `server.js`
- Ensure data files exist in `backend/data/quran/`
- Check file permissions

**Problem: "Position detection not working"**
- Verify ngram-index.json loaded correctly
- Check transcript normalization
- Test with known verses (Al-Fatiha)

**Problem: "Session save fails"**
- Ensure RecitationSession model is imported
- Check MongoDB connection
- Verify user authentication

### Frontend Issues

**Problem: "Speech recognition not starting"**
- Check browser compatibility (Chrome/Edge)
- Verify microphone permissions
- Check console for errors

**Problem: "Position not updating"**
- Check network requests in dev tools
- Verify API endpoints are reachable
- Check JWT token validity

**Problem: "Styling doesn't match Hafiz"**
- Verify CSS variables are defined
- Check file linking order
- Compare with existing Hafiz styles

---

## 🚀 Next Steps

After successful integration:

1. **Add i18n translations** for recitation tab
2. **Implement session history** view in main History tab
3. **Add recitation stats** to Statistics tab
4. **Create progress tracking** for full Quran completion
5. **Add export functionality** for session data
6. **Implement goals/streaks** for recitation practice

---

## 📚 API Reference

### Detect Position
```
POST /api/recitation/detect-position
Body: { transcript, lastKnownPosition? }
Returns: { detected, confidence, position, matchedText }
```

### Get Pages
```
GET /api/recitation/pages?start=1&count=3
Returns: { success, pages[] }
```

### Get Metadata
```
GET /api/recitation/metadata
Returns: { success, totalSurahs, totalAyahs, totalPages, surahs[], pages[] }
```

### Save Session
```
POST /api/recitation/sessions
Body: { startTime, endTime, duration, coverage, accuracy }
Returns: { success, sessionId, savedAt }
```

### Get Sessions
```
GET /api/recitation/sessions?limit=10&fromDate=2025-01-01
Returns: { success, sessions[], statistics }
```

---

## ✅ Success Criteria

Integration is complete when:
- ✅ Backend loads Quran data on startup
- ✅ All API endpoints respond correctly
- ✅ Recitation tab appears in Hafiz navigation
- ✅ Tab matches Hafiz design 100%
- ✅ Speech recognition works
- ✅ Position detection is accurate
- ✅ Sessions save to database
- ✅ Mobile/desktop responsive
- ✅ RTL/LTR works correctly

---

Good luck with the integration! 🎉
