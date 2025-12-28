# Qlisen Frontend

Quran Recitation Verification - Frontend Interface

## 🎨 Design System

Matches the design system from [Hafiz Quran Memorization Tracker](https://github.com/Mohamed-AH/quran):

- **Colors:** Forest green & gold theme
- **Fonts:** Rakkas, Cairo, Crimson Pro, Amiri
- **Style:** Glassmorphism with backdrop blur effects
- **Languages:** Arabic (RTL) and English (LTR)

## 📁 File Structure

```
frontend/
├── index.html          # Main HTML file
├── css/
│   └── styles.css      # Complete styling (matching mother app)
├── js/
│   ├── config.js       # Configuration and constants
│   ├── translations.js # Arabic/English translations
│   ├── recorder.js     # Audio recording handler
│   ├── api.js          # Backend API communication
│   ├── ui.js           # UI updates and display logic
│   └── app.js          # Main application logic
└── README.md           # This file
```

## 🚀 Quick Start

### 1. Start Backend

```bash
cd backend
npm start
```

Backend runs on http://localhost:5001

### 2. Serve Frontend

**Option A: Python HTTP Server**
```bash
cd frontend
python -m http.server 3000
```

**Option B: Node.js HTTP Server**
```bash
cd frontend
npx http-server -p 3000
```

**Option C: VS Code Live Server**
- Install "Live Server" extension
- Right-click `index.html` → "Open with Live Server"

### 3. Open in Browser

Navigate to: http://localhost:3000

## 🎤 How to Use

1. Click **"Listen"** button (🎤) to start recording
2. Recite Quran verses
3. Click **"Stop"** button (⏹️) to end recording
4. Wait for analysis results

## ✨ Features

### Recording
- ✅ Browser-based audio recording
- ✅ Real-time recording timer
- ✅ Visual recording indicator
- ✅ Maximum 10-minute duration

### Analysis
- ✅ Automatic transcription (Whisper)
- ✅ Fast-path detection for quick results
- ✅ N-gram fallback for accuracy
- ✅ Verse-by-verse analysis
- ✅ Word-by-word comparison

### Results Display
- ✅ Surah name and verse range
- ✅ Overall accuracy percentage
- ✅ Full transcript
- ✅ Per-verse status:
  - ✅ Perfect (100%)
  - ✓ Good (70-99%)
  - ⚠️ Partial (25-69%)
  - ❌ Skipped (<25%)
- ✅ Missing words count
- ✅ Recommendations

### Queue Support
- ✅ Automatic queuing when backend is busy
- ✅ Job ID display
- ✅ Email notification (if configured)

### Language Support
- ✅ Arabic (RTL) - Default
- ✅ English (LTR)
- ✅ Toggle button in header
- ✅ Persistent language selection

## ⌨️ Keyboard Shortcuts

- **Space:** Toggle recording
- **Escape:** Cancel recording / Close help modal

## 🎨 Color Palette

```css
--forest-dark: #0a3a2a
--forest-mid: #145a3e
--forest-light: #1e7a54
--gold: #d4af37
--gold-light: #f4d77f
--cream: #faf8f3
--sage: #8ba888
```

## 📱 Responsive Design

- ✅ Desktop (1024px+)
- ✅ Tablet (768px-1023px)
- ✅ Mobile (320px-767px)

## 🌐 Browser Support

### Required Features
- MediaRecorder API
- getUserMedia API
- ES6+ JavaScript
- CSS Grid & Flexbox

### Tested Browsers
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

## 🔧 Configuration

Edit `js/config.js` to change:

```javascript
const CONFIG = {
    API_BASE_URL: 'http://localhost:5001',
    RECORDING: {
        maxDuration: 600000, // 10 minutes
        audioBitsPerSecond: 128000
    },
    DEFAULT_LANG: 'ar'
};
```

## 📊 Analysis Results Structure

```json
{
  "success": true,
  "transcript": "قل أعوذ برب الفلق...",
  "transcriptionTime": 3168,
  "analysis": {
    "surah": "الفلق",
    "surahId": 113,
    "surahNameArabic": "الفلق",
    "startVerse": 1,
    "endVerse": 5,
    "verseCount": 5,
    "method": "fast_path",
    "accuracy": 0.91,
    "verses": [
      {
        "ayah": 1,
        "status": "perfect",
        "accuracy": 1.0,
        "wordCount": 4,
        "wordsMatched": 4,
        "wordsMissing": 0,
        "text": "قُلْ أَعُوذُ بِرَبِّ ٱلْفَلَقِ"
      }
    ],
    "mistakes": [],
    "recommendations": []
  }
}
```

## 🔄 Integration with Mother App

To integrate with [Hafiz Quran Memorization Tracker](https://github.com/Mohamed-AH/quran):

1. **Add link in user profile:**
```html
<a href="https://qlisen.yourdomain.com" class="btn">
    قليسن - تحقق من تلاوتك
</a>
```

2. **Maintain consistent styling:**
   - Uses same color variables
   - Uses same fonts
   - Uses same button styles
   - Uses same glassmorphism effects

## 🚀 Deployment

### Frontend Deployment (Vercel/Netlify)

1. Push to GitHub
2. Connect to Vercel/Netlify
3. Set build settings:
   - Build command: (none)
   - Publish directory: `frontend`

### Backend Deployment (Render)

Already configured. Update `js/config.js`:

```javascript
API_BASE_URL: 'https://your-backend.onrender.com'
```

## 📝 Notes

- Email field is optional (for queue notifications)
- Recordings are not saved on the server
- All processing happens in real-time
- Queue system handles busy/offline scenarios
- Dark mode only (matches mother app)

## 🤝 Contributing

Follow the same design patterns as the mother app:
- Use CSS variables
- Maintain RTL/LTR support
- Keep glassmorphism aesthetic
- Use forest & gold theme

## 📄 License

Same as main Qlisen project
