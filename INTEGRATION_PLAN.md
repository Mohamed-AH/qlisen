# Integration Plan: Qlisen → Hafiz Quran Memorization Tracker

## 🎯 Goal: Seamless Integration

Integrate the Quran Recitation Checker (Qlisen) into the existing Hafiz project as a new feature module, maintaining 100% visual consistency and reusing all existing infrastructure.

---

## ✅ Existing Stack Analysis

### Tech Stack (Hafiz)
- **Frontend**: Vanilla JavaScript (modular), HTML5, CSS3
- **Backend**: Node.js + Express.js
- **Database**: MongoDB Atlas
- **Auth**: Passport.js + JWT (Google/GitHub OAuth)
- **Deployment**: Frontend (Vercel/Netlify), Backend (Railway/Render)
- **No frameworks**: Pure JavaScript, custom CSS

### Design System (Hafiz)
**Colors:**
- Primary: Forest Green (#0a3a2a, #145a3e, #1e7a54)
- Accent: Gold (#d4af37, #f4d77f)
- Neutral: Cream (#faf8f3), Sage (#8ba888)

**Typography:**
- Arabic: Cairo (sans-serif), Amiri (serif)
- English: Crimson Pro, Rakkas
- Weights: 300-700

**Components:**
- `.btn` (gold gradient buttons)
- `.stat-card` (frosted glass cards)
- `.juz-card` (completion-aware cards)
- `.modal` (overlay dialogs)
- Backdrop blur effects (`backdrop-filter: blur(10px)`)
- Gold borders, 0.3s transitions
- Transform hover effects (translateY, scale)

**Layout:**
- Responsive breakpoints: 768px (tablet), 480px (mobile)
- RTL/LTR bidirectional support
- Modular CSS architecture

### Existing Backend APIs
```
/api/auth/*        - OAuth, JWT refresh
/api/user/*        - User profile, settings
/api/logs/*        - Daily log entries (CRUD)
/api/juz/*         - Juz tracking (30 endpoints)
/api/stats/*       - Statistics
```

### Frontend Modules
```javascript
js/config.js       - API configuration
js/storage.js      - LocalStorage helpers
js/auth.js         - JWT management, OAuth
js/api.js          - API calls
js/ui.js           - UI rendering
js/app.js          - Main app logic
js/demo.js         - Demo mode
```

---

## 🔄 Integration Strategy

### Option 1: Separate Tab/Page ⭐ (RECOMMENDED)
Add Qlisen as a new section in the main app, accessible via navigation.

**Structure:**
```
Hafiz App
├── Dashboard (existing)
├── Juz Tracker (existing)
├── History (existing)
├── Statistics (existing)
└── 🎤 Recitation Checker (NEW - Qlisen)
```

**Pros:**
- ✅ Clean separation of concerns
- ✅ Easy to add to existing nav
- ✅ Doesn't disrupt current features
- ✅ Can reuse all existing infrastructure

**Cons:**
- None significant

---

### Option 2: Modal/Overlay
Add as a floating action button that opens a modal.

**Cons:**
- Limited screen space for results
- Not suitable for long sessions

---

## 📋 Revised Implementation Plan

### Phase 1: Backend Extension (Reuse Existing Server)

**NO separate MCP server needed!** Extend the existing Node.js/Express backend.

#### 1.1 Add New API Endpoints to Existing Backend

**File**: `backend/routes/recitation.js` (new)

```javascript
// New endpoints to add:
POST   /api/recitation/detect-position
GET    /api/recitation/pages
POST   /api/recitation/sessions
GET    /api/recitation/sessions
GET    /api/recitation/sessions/:id
GET    /api/recitation/stats
```

#### 1.2 Extend MongoDB Schema

**New Collections**:

```javascript
// RecitationSession collection
{
  userId: ObjectId,
  startTime: Date,
  endTime: Date,
  duration: Number, // seconds

  coverage: {
    surahs: [Number],
    ayahsRecited: Number,
    pagesRecited: Number,
    startPosition: { surah: Number, ayah: Number, page: Number },
    endPosition: { surah: Number, ayah: Number, page: Number }
  },

  accuracy: {
    totalWords: Number,
    correctWords: Number,
    percentAccuracy: Number,
    contemplativeRepeats: Number
  },

  transcript: String, // Optional, can be large
  createdAt: Date
}
```

#### 1.3 Quran Data in Backend

**File**: `backend/data/quran/` (new directory)

```
quran-uthmani.json         - Full Quran text (Tanzil source)
quran-metadata.json        - Surah info, page boundaries
ngram-index.json           - Pre-computed search index
page-boundaries.json       - Madinah Mushaf pages
```

**Endpoints will load this data on server startup** (in-memory for speed)

---

### Phase 2: Frontend Integration

#### 2.1 Add New Navigation Tab

**File**: `app.html` (modify existing)

```html
<!-- Add to existing tab navigation -->
<div class="tabs">
  <button class="tab active" data-tab="dashboard">Dashboard</button>
  <button class="tab" data-tab="juz">Juz</button>
  <button class="tab" data-tab="history">History</button>
  <button class="tab" data-tab="stats">Stats</button>
  <button class="tab" data-tab="recitation">🎤 Recitation</button> <!-- NEW -->
</div>
```

#### 2.2 Add Recitation Section

**File**: `app.html` (modify existing)

```html
<!-- Add new tab content -->
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
    <div id="results-container" style="display: none;">
      <!-- Results will be inserted here -->
    </div>
  </div>
</section>
```

#### 2.3 Create New JS Module

**File**: `js/recitation.js` (new)

```javascript
// Recitation Checker Module
// Follows existing Hafiz module pattern

const RecitationModule = {
  recognition: null,
  currentSession: null,
  isRecording: false,

  init() {
    this.setupSpeechRecognition();
    this.bindEvents();
  },

  setupSpeechRecognition() {
    // Same as current qlisen implementation
    // But integrated with Hafiz UI patterns
  },

  async detectPosition(transcript) {
    // Call backend API
    const response = await api.post('/api/recitation/detect-position', {
      transcript,
      lastKnownPosition: this.currentSession?.lastPosition
    });
    return response.data;
  },

  async getPages(startPage, pageCount) {
    const response = await api.get(`/api/recitation/pages?start=${startPage}&count=${pageCount}`);
    return response.data;
  },

  async saveSession(sessionData) {
    const response = await api.post('/api/recitation/sessions', sessionData);
    return response.data;
  },

  updateUI(position, stats) {
    // Update using existing Hafiz UI patterns
    document.getElementById('current-surah').textContent = position.surahName;
    document.getElementById('current-ayah').textContent = `الآية ${position.ayahStart}-${position.ayahEnd}`;
    document.getElementById('current-page').textContent = `صفحة ${position.page}`;
    // etc.
  },

  bindEvents() {
    document.getElementById('listen-btn').addEventListener('click', () => this.startListening());
    document.getElementById('stop-btn').addEventListener('click', () => this.stopListening());
  }
};
```

#### 2.4 Update Main App Module

**File**: `js/app.js` (modify existing)

```javascript
// Add to existing tab switching logic
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const tabName = tab.dataset.tab;

    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(content => {
      content.style.display = 'none';
    });

    // Show selected tab
    if (tabName === 'recitation') {
      document.getElementById('recitation-tab').style.display = 'block';
      RecitationModule.init(); // Initialize when tab opens
    }
    // ... existing tab logic
  });
});
```

---

### Phase 3: Styling Integration

#### 3.1 Extend Existing CSS

**File**: `css/recitation.css` (new, but matches Hafiz patterns)

```css
/* Recitation Checker Styles - Matches Hafiz Design System */

/* Use existing CSS variables */
.recitation-container {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

/* Match existing stat-card style */
.position-indicator {
  /* Inherits from .stat-card */
  text-align: center;
  margin-bottom: 2rem;
}

#position-display {
  font-size: 1.5rem;
  color: var(--gold);
  font-family: 'Cairo', sans-serif;
  margin: 1rem 0;
}

.confidence-badge {
  display: inline-block;
  padding: 0.5rem 1rem;
  background: rgba(212, 175, 55, 0.1);
  border: 2px solid var(--gold);
  border-radius: 20px;
  font-size: 0.9rem;
  color: var(--gold-light);
}

/* Match existing button styles */
.recitation-controls {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-bottom: 2rem;
}

.recitation-controls .btn {
  /* Inherits from existing .btn */
  min-width: 200px;
}

/* Live stats - matches existing stats-grid */
.live-stats .stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

.stat-item {
  text-align: center;
}

.stat-label {
  display: block;
  color: var(--sage);
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}

.stat-value {
  display: block;
  color: var(--gold);
  font-size: 2rem;
  font-weight: 700;
}

/* Arabic text display */
.arabic-text {
  font-family: 'Amiri', serif;
  font-size: 1.8rem;
  line-height: 2;
  color: var(--cream);
  direction: rtl;
  text-align: center;
}

/* Ayah cards - match existing juz-card style */
.ayah-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 2px solid rgba(212, 175, 55, 0.3);
  border-radius: 15px;
  padding: 1.5rem;
  margin-bottom: 1rem;
  transition: all 0.3s;
}

.ayah-card:hover {
  transform: translateY(-5px);
  border-color: var(--gold);
}

.ayah-card.complete {
  border-color: var(--forest-light);
  background: rgba(30, 122, 84, 0.1);
}

.ayah-card.partial {
  border-color: var(--gold-light);
  background: rgba(212, 175, 55, 0.05);
}

.ayah-card.missing {
  border-color: #dc3545;
  background: rgba(220, 53, 69, 0.05);
}

/* Contemplative repeats - peaceful styling */
.contemplative-section {
  background: rgba(147, 112, 219, 0.1);
  border: 2px solid #9370DB;
  border-radius: 15px;
  padding: 1.5rem;
  margin-top: 1rem;
}

.contemplative-section h4 {
  color: #9370DB;
  margin-bottom: 1rem;
}

/* RTL support - inherits from Hafiz patterns */
[dir="rtl"] .recitation-container {
  direction: rtl;
}

[dir="ltr"] .arabic-text {
  direction: rtl; /* Arabic text always RTL */
}

/* Responsive - match Hafiz breakpoints */
@media (max-width: 768px) {
  .recitation-container {
    padding: 1rem;
  }

  .recitation-controls {
    flex-direction: column;
  }

  .live-stats .stats-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  #position-display {
    font-size: 1.2rem;
  }

  .stat-value {
    font-size: 1.5rem;
  }
}
```

---

### Phase 4: Backend Implementation Details

#### 4.1 Position Detection Endpoint

**File**: `backend/routes/recitation.js`

```javascript
const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middleware/auth');
const quranService = require('../services/quranService');

// Detect position from transcript
router.post('/detect-position', authenticateJWT, async (req, res) => {
  try {
    const { transcript, lastKnownPosition } = req.body;

    // Use n-gram index to find position
    const position = await quranService.detectPosition(
      transcript,
      lastKnownPosition
    );

    res.json({
      success: true,
      ...position
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get Quran pages
router.get('/pages', authenticateJWT, async (req, res) => {
  try {
    const { start, count } = req.query;
    const pages = await quranService.getPages(
      parseInt(start),
      parseInt(count) || 3
    );

    res.json({
      success: true,
      pages
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Save recitation session
router.post('/sessions', authenticateJWT, async (req, res) => {
  try {
    const session = await RecitationSession.create({
      userId: req.user._id,
      ...req.body
    });

    res.json({
      success: true,
      sessionId: session._id,
      savedAt: session.createdAt
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get user's recitation history
router.get('/sessions', authenticateJWT, async (req, res) => {
  try {
    const { limit = 10, fromDate } = req.query;

    const query = { userId: req.user._id };
    if (fromDate) {
      query.createdAt = { $gte: new Date(fromDate) };
    }

    const sessions = await RecitationSession
      .find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    const stats = await RecitationSession.aggregate([
      { $match: { userId: req.user._id } },
      {
        $group: {
          _id: null,
          totalSessions: { $sum: 1 },
          totalAyahs: { $sum: '$coverage.ayahsRecited' },
          avgAccuracy: { $avg: '$accuracy.percentAccuracy' }
        }
      }
    ]);

    res.json({
      success: true,
      sessions,
      statistics: stats[0] || {}
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
```

#### 4.2 Quran Service

**File**: `backend/services/quranService.js`

```javascript
const fs = require('fs').promises;
const path = require('path');

class QuranService {
  constructor() {
    this.quranData = null;
    this.ngramIndex = null;
    this.metadata = null;
  }

  async init() {
    // Load all Quran data on server startup
    const dataPath = path.join(__dirname, '../data/quran');

    this.quranData = JSON.parse(
      await fs.readFile(path.join(dataPath, 'quran-uthmani.json'), 'utf8')
    );

    this.ngramIndex = JSON.parse(
      await fs.readFile(path.join(dataPath, 'ngram-index.json'), 'utf8')
    );

    this.metadata = JSON.parse(
      await fs.readFile(path.join(dataPath, 'quran-metadata.json'), 'utf8')
    );

    console.log('✅ Quran data loaded successfully');
  }

  normalizeArabic(text) {
    return text
      .replace(/[ًٌٍَُِّْٰ]/g, '')
      .replace(/[إأآٱا]/g, 'ا')
      .replace(/[ىيئ]/g, 'ي')
      .replace(/[ةه]/g, 'ه')
      .replace(/[وؤ]/g, 'و')
      .replace(/ء/g, '')
      .replace(/ٱ/g, '')
      .replace(/ـ/g, '')
      .trim()
      .replace(/\s+/g, ' ');
  }

  async detectPosition(transcript, lastKnownPosition = null) {
    const normalized = this.normalizeArabic(transcript);
    const words = normalized.split(' ');

    // Extract 3-grams
    const ngrams = [];
    for (let i = 0; i < words.length - 2; i++) {
      ngrams.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
    }

    // Find matches in index
    const candidates = new Map();

    for (const ngram of ngrams) {
      const matches = this.ngramIndex[ngram] || [];
      for (const match of matches) {
        const key = `${match.surah}-${match.ayah}`;
        candidates.set(key, (candidates.get(key) || 0) + 1);
      }
    }

    // Find best match (most consecutive ngram matches)
    let bestMatch = null;
    let bestScore = 0;

    for (const [key, score] of candidates.entries()) {
      if (score > bestScore) {
        bestScore = score;
        const [surah, ayah] = key.split('-').map(Number);
        bestMatch = { surah, ayah };
      }
    }

    if (!bestMatch) {
      return {
        detected: false,
        confidence: 0,
        message: 'Could not detect position'
      };
    }

    // Get full position details
    const verse = this.quranData.verses.find(
      v => v.surah === bestMatch.surah && v.ayah === bestMatch.ayah
    );

    const surahInfo = this.metadata.surahs.find(s => s.id === bestMatch.surah);

    return {
      detected: true,
      confidence: Math.min(bestScore / ngrams.length, 1),
      position: {
        page: verse.page,
        surah: bestMatch.surah,
        surahName: surahInfo.name,
        ayahStart: bestMatch.ayah,
        ayahEnd: bestMatch.ayah,
        wordStart: 0,
        wordEnd: verse.text.split(' ').length - 1
      },
      matchedText: verse.text
    };
  }

  async getPages(startPage, pageCount) {
    const pages = [];

    for (let i = 0; i < pageCount; i++) {
      const pageNum = startPage + i;
      if (pageNum > 604) break;

      const verses = this.quranData.verses.filter(v => v.page === pageNum);

      pages.push({
        number: pageNum,
        verses: verses.map(v => ({
          surah: v.surah,
          surahName: this.metadata.surahs.find(s => s.id === v.surah)?.name,
          ayah: v.ayah,
          text: v.text,
          textNormalized: this.normalizeArabic(v.text)
        }))
      });
    }

    return pages;
  }
}

// Singleton instance
const quranService = new QuranService();
module.exports = quranService;
```

#### 4.3 Initialize in Server

**File**: `backend/server.js` (modify existing)

```javascript
// Add after existing imports
const quranService = require('./services/quranService');
const recitationRoutes = require('./routes/recitation');

// Initialize Quran data on startup
quranService.init().catch(err => {
  console.error('❌ Failed to load Quran data:', err);
  process.exit(1);
});

// Add routes (after existing routes)
app.use('/api/recitation', recitationRoutes);
```

---

### Phase 5: Data Preparation

#### 5.1 Download Tanzil Data

**Script**: `backend/scripts/prepare-quran-data.js`

```javascript
const fs = require('fs').promises;
const path = require('path');

async function downloadAndPrepareQuranData() {
  // 1. Download from Tanzil
  // 2. Convert to JSON
  // 3. Add Madinah Mushaf page boundaries
  // 4. Generate n-gram index
  // 5. Save all files

  console.log('✅ Quran data prepared');
}

downloadAndPrepareQuranData();
```

**Run once**: `node backend/scripts/prepare-quran-data.js`

---

## 📊 Reusable Components

### From Hafiz → Qlisen

✅ **Auth System**: Use existing JWT authentication
✅ **API Module**: Reuse `js/api.js` for API calls
✅ **Storage**: Reuse `js/storage.js` for localStorage
✅ **UI Patterns**: Match `.stat-card`, `.btn`, etc.
✅ **Database**: Use existing MongoDB connection
✅ **i18n**: Reuse existing bilingual system
✅ **Colors**: Use existing CSS variables
✅ **Fonts**: Use Cairo/Amiri for Arabic

### New Components Needed

📦 **Speech Recognition**: Browser Web Speech API (no backend needed)
📦 **N-gram Index**: Pre-computed JSON file
📦 **Position Detection**: New service in backend
📦 **Recitation UI**: New tab content

---

## 🚀 Implementation Steps (Revised)

### Step 1: Data Preparation (2-3 hours)
- [ ] Download Tanzil Quran data (uthmani script)
- [ ] Add Madinah Mushaf page boundaries
- [ ] Generate n-gram index
- [ ] Create metadata file
- [ ] Save to `backend/data/quran/`

### Step 2: Backend Extension (3-4 hours)
- [ ] Create `RecitationSession` model
- [ ] Create `quranService.js`
- [ ] Create `routes/recitation.js`
- [ ] Add routes to `server.js`
- [ ] Initialize Quran data on startup
- [ ] Test endpoints with Postman/curl

### Step 3: Frontend Integration (4-6 hours)
- [ ] Add recitation tab to `app.html`
- [ ] Create `js/recitation.js` module
- [ ] Create `css/recitation.css`
- [ ] Integrate with existing tab system
- [ ] Add i18n translations
- [ ] Match Hafiz design 100%

### Step 4: Speech Recognition (2-3 hours)
- [ ] Port existing qlisen speech recognition
- [ ] Adapt to Hafiz UI patterns
- [ ] Handle continuous recording
- [ ] Auto-restart on timeout

### Step 5: Position Detection Flow (3-4 hours)
- [ ] Implement periodic position detection
- [ ] Update UI in real-time
- [ ] Fetch pages from backend
- [ ] Compare and display results
- [ ] Match existing Hafiz UI/UX

### Step 6: Session Saving (2-3 hours)
- [ ] Collect session data
- [ ] Save to MongoDB via API
- [ ] Display confirmation
- [ ] Add to history tab
- [ ] Show in stats

### Step 7: Testing (3-4 hours)
- [ ] Test with different surahs
- [ ] Test long sessions
- [ ] Test on mobile
- [ ] RTL/LTR switching
- [ ] OAuth flow integration

**Total: 19-27 hours** (similar to original estimate)

---

## 🎨 Design Checklist

### Colors ✅
- [ ] Use `var(--gold)` for accents
- [ ] Use `var(--forest-dark/mid/light)` for backgrounds
- [ ] Use `var(--cream)` for text
- [ ] Use `var(--sage)` for labels

### Typography ✅
- [ ] Cairo for Arabic sans-serif
- [ ] Amiri for Arabic serif (Quran text)
- [ ] Match existing font sizes

### Components ✅
- [ ] Buttons: `.btn` and `.btn-secondary`
- [ ] Cards: `.stat-card` with backdrop blur
- [ ] Tabs: Match existing tab system
- [ ] Grid: Use existing `.stats-grid`

### Animations ✅
- [ ] 0.3s transitions
- [ ] translateY(-5px) hover
- [ ] scale(1.05) on cards

### Responsive ✅
- [ ] 768px breakpoint
- [ ] 480px breakpoint
- [ ] Mobile-first approach

---

## ✅ Success Criteria

### Visual Integration
- [ ] **100% design match** with Hafiz
- [ ] Same colors, fonts, spacing
- [ ] Smooth tab transitions
- [ ] RTL/LTR support

### Functional Integration
- [ ] Uses existing auth (no separate login)
- [ ] Uses existing backend/database
- [ ] Saved sessions appear in stats
- [ ] Bilingual interface

### Performance
- [ ] Position detection <1 second
- [ ] No lag during recording
- [ ] Smooth UI updates

---

## 🔄 Next Steps

1. **Confirm integration approach**: Separate tab vs modal?
2. **Download Quran data**: Start with Tanzil
3. **Backend first**: Extend existing Express server
4. **Frontend last**: Match Hafiz design 100%

Ready to start? Should we begin with data preparation or backend extension?
