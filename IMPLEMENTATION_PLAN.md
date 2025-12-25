# Implementation Plan: Full Quran MCP Server Approach

## ✅ Confirmed Decisions

- **Architecture**: MCP Server
- **Mushaf**: Madinah Mushaf (King Fahd Complex edition)
- **Storage**: Server-based (multi-user)
- **Scope**: Full Quran (all 114 surahs)
- **Priority**: Simplicity

---

## 🎯 MVP (Minimum Viable Product) - Phase 1

### Goal: Single "Listen" button → Auto-detect position → Save results

**Must Have:**
1. Single "Listen" button (no pre-selection)
2. Auto-detect what user is reciting
3. Show current position in real-time
4. Basic accuracy feedback
5. Save session to server

**Can Wait:**
- History viewer
- Advanced analytics
- Progress tracking
- Export features

---

## 📊 Data Source Options

### Option 1: Tanzil Project ⭐ (RECOMMENDED)
**Source**: https://tanzil.net/docs/download
- ✅ Free, open-source
- ✅ Multiple text types (simple, uthmani, imlaei)
- ✅ Madinah Mushaf page/verse mapping available
- ✅ High quality, trusted source
- ✅ XML, SQL, JSON formats
- 📦 Download: ~2-5 MB

**Files needed:**
- `quran-uthmani.xml` - Arabic text with Uthmani script
- `quran-data.xml` - Surah names, metadata
- `quran-madani.json` - Madinah Mushaf page boundaries

### Option 2: Quran.com API
**Source**: https://api.quran.com/api/v4/
- ✅ REST API, well-documented
- ✅ Madinah Mushaf edition available
- ⚠️ Requires internet for each request
- ⚠️ Rate limits may apply

### Option 3: King Saud University Electronic Mushaf
- ✅ Official Madinah Mushaf
- ❌ More complex to obtain/parse
- ❌ May have usage restrictions

**DECISION**: Use **Tanzil** for simplicity and offline capability

---

## 🏗️ MCP Server Architecture

### Server Structure:
```
qlisen-mcp-server/
├── server.py (or server.js)
├── data/
│   ├── quran-uthmani.json         # Full Quran text
│   ├── quran-metadata.json        # Surah info, page mapping
│   ├── ngram-index.json           # Pre-computed n-gram index
│   └── page-boundaries.json       # Madinah Mushaf page breaks
├── database/
│   └── sessions.db                # SQLite for user sessions
├── tools/
│   ├── quran_init.py
│   ├── quran_detect_position.py
│   ├── quran_get_pages.py
│   ├── quran_save_session.py
│   └── quran_get_history.py
└── utils/
    ├── text_normalizer.py
    ├── ngram_indexer.py
    └── position_detector.py
```

---

## 🔧 MCP Tools Design

### Tool 1: `quran_init`
**Purpose**: Initialize session, get Quran structure

**Input**: None (or optional userId)
**Output**:
```json
{
  "totalSurahs": 114,
  "totalAyahs": 6236,
  "totalPages": 604,
  "surahs": [
    {
      "id": 1,
      "name": "الفاتحة",
      "nameTransliteration": "Al-Fatihah",
      "ayahCount": 7,
      "startPage": 1,
      "endPage": 1
    }
    // ... all 114 surahs
  ]
}
```

**Use**: One-time call when app loads

---

### Tool 2: `quran_detect_position` ⭐ (CORE)
**Purpose**: Find where in Quran the user is reciting

**Input**:
```json
{
  "transcript": "بسم الله الرحمن الرحيم الحمد لله رب العالمين",
  "lastKnownPosition": {
    "page": 1,
    "surah": 1,
    "ayah": 1
  },
  "context": {
    "transcriptWordCount": 50,
    "sessionDuration": 120
  }
}
```

**Output**:
```json
{
  "detected": true,
  "confidence": 0.95,
  "position": {
    "page": 1,
    "pagePosition": "top",
    "surah": 1,
    "surahName": "الفاتحة",
    "ayahStart": 1,
    "ayahEnd": 2,
    "wordStart": 0,
    "wordEnd": 13
  },
  "matchedText": "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ ۝ الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ",
  "alternatives": [
    {
      "position": { "page": 1, "surah": 1, "ayah": 1 },
      "confidence": 0.95
    }
  ]
}
```

**Algorithm**:
1. Normalize transcript (remove diacritics)
2. Extract n-grams (3-word chunks)
3. Look up in pre-computed index
4. Find longest consecutive match
5. Use lastKnownPosition to prefer sequential matches
6. Return position with confidence score

---

### Tool 3: `quran_get_pages`
**Purpose**: Get Quran pages for comparison

**Input**:
```json
{
  "startPage": 1,
  "pageCount": 5
}
```

**Output**:
```json
{
  "pages": [
    {
      "number": 1,
      "verses": [
        {
          "surah": 1,
          "surahName": "الفاتحة",
          "ayah": 1,
          "text": "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
          "textNormalized": "بسم الله الرحمن الرحيم"
        }
        // ... all verses on page 1
      ]
    }
    // ... pages 2-5
  ]
}
```

**Use**: Called when position is detected, gets current + next 4 pages

---

### Tool 4: `quran_save_session`
**Purpose**: Save recitation session results

**Input**:
```json
{
  "userId": "user123",
  "sessionData": {
    "startTime": "2025-12-25T10:00:00Z",
    "endTime": "2025-12-25T10:15:00Z",
    "duration": 900,
    "coverage": {
      "surahs": [1],
      "ayahsRecited": 7,
      "pagesRecited": 1,
      "startPosition": { "surah": 1, "ayah": 1 },
      "endPosition": { "surah": 1, "ayah": 7 }
    },
    "accuracy": {
      "totalWords": 150,
      "correctWords": 142,
      "percentAccuracy": 94.7,
      "contemplativeRepeats": 3
    }
  }
}
```

**Output**:
```json
{
  "success": true,
  "sessionId": "sess_abc123",
  "savedAt": "2025-12-25T10:16:00Z"
}
```

**Storage**: SQLite database

---

### Tool 5: `quran_get_history`
**Purpose**: Retrieve user's recitation history

**Input**:
```json
{
  "userId": "user123",
  "limit": 10,
  "fromDate": "2025-12-01T00:00:00Z"
}
```

**Output**:
```json
{
  "sessions": [
    {
      "sessionId": "sess_abc123",
      "timestamp": "2025-12-25T10:00:00Z",
      "duration": 900,
      "ayahsRecited": 7,
      "accuracy": 94.7
    }
    // ... more sessions
  ],
  "statistics": {
    "totalSessions": 25,
    "totalAyahsRecited": 450,
    "totalDuration": 18000,
    "averageAccuracy": 91.2,
    "uniqueSurahsRecited": 15
  }
}
```

**Use**: Show user their progress and history

---

## 🔍 N-gram Index Design

### Pre-processing (done once, saved to file):

**Input**: Full Quran text
**Process**:
```python
def build_ngram_index(quran_verses):
    index = {}

    for verse in quran_verses:
        # Normalize text
        normalized = normalize_arabic(verse.text)
        words = normalized.split()

        # Create 3-grams
        for i in range(len(words) - 2):
            ngram = f"{words[i]} {words[i+1]} {words[i+2]}"

            if ngram not in index:
                index[ngram] = []

            index[ngram].append({
                "surah": verse.surah,
                "ayah": verse.ayah,
                "page": verse.page,
                "wordIndex": i
            })

    return index
```

**Output**: JSON file (~10-20 MB)
```json
{
  "بسم الله الرحمن": [
    {"surah": 1, "ayah": 1, "page": 1, "wordIndex": 0},
    {"surah": 27, "ayah": 30, "page": 378, "wordIndex": 2}
  ],
  "الله الرحمن الرحيم": [
    {"surah": 1, "ayah": 1, "page": 1, "wordIndex": 1}
  ]
  // ... thousands of n-grams
}
```

---

## 💾 Database Schema

### SQLite Tables:

```sql
-- Users table (simple for now)
CREATE TABLE users (
    user_id TEXT PRIMARY KEY,
    username TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table
CREATE TABLE sessions (
    session_id TEXT PRIMARY KEY,
    user_id TEXT,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    duration INTEGER, -- seconds

    -- Coverage
    surahs_json TEXT, -- JSON array of surah IDs
    ayahs_recited INTEGER,
    pages_recited INTEGER,
    start_surah INTEGER,
    start_ayah INTEGER,
    end_surah INTEGER,
    end_ayah INTEGER,

    -- Accuracy
    total_words INTEGER,
    correct_words INTEGER,
    percent_accuracy REAL,
    contemplative_repeats INTEGER,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Index for fast queries
CREATE INDEX idx_user_sessions ON sessions(user_id, start_time DESC);
```

---

## 🎨 Frontend Changes (index.html)

### 1. Remove Selection UI
**Remove**:
- Surah dropdown
- Ayah start/end dropdowns
- Verse display section (before recording)

**Keep**:
- Title, info box
- Recording buttons
- Transcription display
- Comparison results

### 2. New UI Components

**Add**:
```html
<!-- Position indicator (shows real-time position) -->
<div id="position-indicator" style="display: none;">
    <div class="position-box">
        <h3>📖 الموضع الحالي</h3>
        <div id="current-position">
            <span id="surah-name">...</span> •
            <span id="ayah-range">الآية ...</span> •
            <span id="page-number">صفحة ...</span>
        </div>
        <div id="confidence-indicator">
            <span>الدقة: <span id="confidence-value">...</span></span>
        </div>
    </div>
</div>

<!-- Live stats -->
<div id="live-stats" style="display: none;">
    <div class="stats-grid">
        <div>✅ <span id="words-correct">0</span> كلمة صحيحة</div>
        <div>📖 <span id="ayahs-recited">0</span> آية</div>
        <div>⏱️ <span id="duration">0:00</span></div>
    </div>
</div>
```

### 3. New JavaScript Flow

**Current flow** (before):
```
User selects surah/ayahs → Click start → Record → Stop → Compare
```

**New flow**:
```
Click Listen → Record → Auto-detect position →
Show position → Keep recording → Update position →
Stop → Show full results → Save to server
```

**Key changes**:
- No `currentVerse` variable (we don't know in advance)
- Accumulated transcript sent to MCP for detection
- Position detection every 5-10 words
- Dynamic verse loading from MCP
- Comparison happens in chunks, not all at once

---

## 📱 MCP Communication Pattern

### 1. App Load:
```javascript
// Initialize MCP connection
const mcpClient = await connectToMCP();

// Get Quran structure
const quranInfo = await mcpClient.call('quran_init');
// Store surah info for display
```

### 2. User Clicks "Listen":
```javascript
// Start recording
recognition.start();

// Initialize session tracking
currentSession = {
    startTime: new Date(),
    transcript: '',
    detectedPositions: [],
    accuracy: { correct: 0, total: 0 }
};
```

### 3. As User Recites (every 10 words or 5 seconds):
```javascript
recognition.onresult = async (event) => {
    // Accumulate transcript
    let fullTranscript = getFullTranscript(event);

    // Every 10 words, detect position
    if (wordCount % 10 === 0) {
        const position = await mcpClient.call('quran_detect_position', {
            transcript: fullTranscript,
            lastKnownPosition: currentPosition
        });

        if (position.detected) {
            // Update UI
            updatePositionDisplay(position);

            // Get pages for comparison
            const pages = await mcpClient.call('quran_get_pages', {
                startPage: position.position.page,
                pageCount: 3
            });

            // Compare and show results
            compareAndDisplay(fullTranscript, pages);
        }
    }
};
```

### 4. User Clicks "Stop":
```javascript
async function stopRecitation() {
    recognition.stop();

    // Final comparison
    const finalResults = calculateFinalResults();

    // Save to server
    const saved = await mcpClient.call('quran_save_session', {
        userId: getCurrentUserId(),
        sessionData: finalResults
    });

    // Show results
    displayFinalResults(finalResults);
}
```

---

## 🔐 User Management (Simple)

### Option 1: Browser-based ID (Simplest)
```javascript
// Generate or retrieve user ID from localStorage
let userId = localStorage.getItem('userId');
if (!userId) {
    userId = 'user_' + generateUUID();
    localStorage.setItem('userId', userId);
}
```

**Pros**: No login required, simple
**Cons**: Different devices = different users

### Option 2: Optional Username
```javascript
// Prompt for username (optional)
let username = localStorage.getItem('username');
if (!username) {
    username = prompt('اختر اسمًا (اختياري):') || 'مستخدم';
    localStorage.setItem('username', username);
}
```

**Pros**: Personalized, still simple
**Cons**: No real authentication

### Option 3: Simple Login (Future)
- Email + password
- Or social login (Google, etc.)

**RECOMMENDATION**: Start with Option 1, add Option 2 later

---

## 🚀 Implementation Steps

### Step 1: Get Quran Data (2-3 hours)
- [ ] Download Tanzil Quran data
- [ ] Convert to JSON format
- [ ] Add Madinah Mushaf page boundaries
- [ ] Normalize all text
- [ ] Create master JSON file

### Step 2: Build N-gram Index (2-3 hours)
- [ ] Write indexing script
- [ ] Process all 6,236 verses
- [ ] Generate n-gram index
- [ ] Save to JSON file
- [ ] Test lookup performance

### Step 3: MCP Server Setup (4-6 hours)
- [ ] Create MCP server structure
- [ ] Implement `quran_init` tool
- [ ] Implement `quran_detect_position` tool
- [ ] Implement `quran_get_pages` tool
- [ ] Test with sample queries

### Step 4: Database Setup (1-2 hours)
- [ ] Create SQLite database
- [ ] Write session save logic
- [ ] Implement `quran_save_session` tool
- [ ] Implement `quran_get_history` tool

### Step 5: Frontend Changes (6-8 hours)
- [ ] Remove selection UI
- [ ] Add "Listen" button
- [ ] Add position indicator
- [ ] Add live stats
- [ ] Implement MCP client connection
- [ ] Update comparison logic for dynamic verses
- [ ] Test end-to-end flow

### Step 6: Testing & Refinement (4-6 hours)
- [ ] Test with different surahs
- [ ] Test long sessions (30+ minutes)
- [ ] Test position detection accuracy
- [ ] Optimize performance
- [ ] Handle edge cases

**Total Estimated Time**: 19-28 hours

---

## 🎯 Success Criteria

### MVP Complete When:
- [ ] User can click "Listen" without selecting anything
- [ ] App auto-detects position within 10 seconds
- [ ] Position displayed shows correct surah/ayah/page
- [ ] Can recite for 30+ minutes continuously
- [ ] Results saved to server successfully
- [ ] Can retrieve past sessions

### Quality Metrics:
- Position detection accuracy: >85%
- Position detection latency: <1 second
- No crashes during 30-minute session
- Accurate word matching: >90%
- Database saves: 100% success rate

---

## 📦 Deliverables

### Phase 1 (MVP):
1. **MCP Server** (`qlisen-mcp-server/`)
   - All 5 tools implemented
   - Quran data loaded
   - N-gram index ready
   - Database functional

2. **Updated Frontend** (`index.html`)
   - No pre-selection UI
   - Single "Listen" button
   - Real-time position display
   - Dynamic comparison
   - Session saving

3. **Data Files**:
   - `quran-uthmani.json` (Full Quran)
   - `quran-metadata.json` (Surah info)
   - `ngram-index.json` (Search index)
   - `page-boundaries.json` (Madinah Mushaf)

4. **Database**:
   - `sessions.db` (SQLite)

### Phase 2 (Enhancements):
- History viewer UI
- Statistics dashboard
- Export functionality
- Progress tracking
- Goal setting

---

## 🔄 Next Steps

1. **Confirm MCP server framework**:
   - Python (FastAPI/Flask) or Node.js?
   - Any preference?

2. **Download Quran data**:
   - I'll fetch Tanzil data
   - Process for Madinah Mushaf

3. **Start with MCP server**:
   - Build data infrastructure first
   - Then frontend changes

Ready to start? Which step should we begin with?
