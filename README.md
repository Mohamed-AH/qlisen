Here's a comprehensive description for another developer:

---

# Quran Recitation Checker - Developer Documentation

## Overview
A web-based application that helps users practice and verify their Quran recitation using browser-based speech recognition. The app listens to users reciting Quranic verses and provides feedback on accuracy and completeness.

## Core Technology Stack
- **Frontend**: Pure HTML/CSS/JavaScript (no frameworks)
- **Speech Recognition**: Web Speech API (`SpeechRecognition`/`webkitSpeechRecognition`)
- **Language**: Arabic (ar-SA locale)
- **Debugging**: Eruda console (for mobile debugging, especially iPhone)

## Key Features

### 1. **Verse Selection**
- Users select a Surah (chapter) from a predefined list
- Can choose a single verse or range of verses (e.g., verses 1-7 of Al-Fatiha)
- Currently supports 5 surahs: Al-Fatiha, Al-Mulk, Al-Ikhlas, Al-Falaq, Al-Nas

### 2. **Speech Recognition**
- **Continuous mode**: Handles pauses between verses (users can breathe, pause for contemplation)
- **Interim results**: Shows real-time transcription as user speaks
- **Arabic-specific**: Configured for Saudi Arabic (ar-SA)
- **Multi-alternative processing**: Requests 5 alternatives for better accuracy

### 3. **Comparison Algorithm** (Planned/In Progress)
The advanced version includes:
- **Text normalization**: Removes diacritics, normalizes Arabic characters
- **Fuzzy matching**: Uses Levenshtein distance for word similarity (55% threshold)
- **Sequential matching**: Handles repeated words correctly (e.g., "الرَّحْمَٰنِ الرَّحِيمِ" appears in both verse 1 and 3 of Al-Fatiha)
- **Ayah-level display**: Groups results by verse, not word-by-word
- **Repetition tolerance**: Repeated words for emphasis/contemplation don't count as errors

### 4. **Feedback System**
- **Ayah-level status**:
  - ✅ Green: 75%+ words matched (complete)
  - ⚠️ Orange: Partial match (shows missing words)
  - ❌ Red: Completely missing (shows full verse for review)
  
- **Statistics**:
  - Complete ayahs count (X/Y)
  - Word accuracy percentage
  - Ayah completion percentage

## Technical Challenges & Solutions

### Challenge 1: Quranic Arabic vs. Modern Arabic
**Problem**: Speech recognition trained on conversational Arabic struggles with:
- Classical Quranic vocabulary
- Tajweed (elongation, emphasis)
- Melodious recitation

**Solution**:
- Lower similarity threshold (55% vs typical 70%)
- Fuzzy matching with Levenshtein distance
- Normalize all diacritical marks before comparison

### Challenge 2: Repeated Words in Quran
**Problem**: Words like "الرَّحْمَٰنِ" appear multiple times. Algorithm was matching verse 3's word to verse 1, marking it as duplicate.

**Solution**:
- Sequential matching: prioritize words AFTER last matched position
- Track position index, not just word occurrence
- Only mark as repeat if matched word is BEFORE current position

### Challenge 3: Different Recitation Styles
**Problem**: Users recite differently:
- Verse-by-verse with long pauses
- Continuous without stopping
- Breath pauses mid-verse
- Testing lung capacity (very long without pause)

**Solution**:
- Continuous mode with auto-resume after "no-speech" errors
- Accumulate transcript across multiple speech events
- 2-second silence timeout for progress updates
- User controls when to stop (manual button)

### Challenge 4: Browser Compatibility
**Problem**: Speech Recognition API varies across browsers
- Chrome/Edge: Full support
- Safari iOS: Limited support
- Firefox: No support

**Solution**:
- Feature detection: `window.SpeechRecognition || window.webkitSpeechRecognition`
- Clear error messages for unsupported browsers
- Eruda console for iPhone debugging

## Data Structure

```javascript
quranData = {
  "1": {  // Surah number
    name: "الفاتحة",
    verses: {
      "1": "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
      "2": "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ",
      // ... more verses
    }
  }
}
```

## Algorithm Flow

```
1. User selects surah + verse range
2. Click "Start Recording"
3. Speech Recognition starts (continuous mode)
4. As user speaks:
   - Interim results shown in real-time
   - Final results accumulated
5. User clicks "Stop"
6. Normalization:
   - Remove diacritics from both texts
   - Normalize character variations (ا أ إ → ا)
7. Word Matching:
   - For each transcribed word
   - Find best match in correct text (sequential)
   - Calculate similarity (Levenshtein)
   - Accept if > 55% similar
8. Ayah-level Grouping:
   - Count matched words per ayah
   - Mark as complete if ≥75% matched
9. Display Results:
   - Green: Complete ayahs
   - Orange/Red: Incomplete (show full text)
   - Statistics summary
```

## Key Variables

```javascript
recognition          // SpeechRecognition instance
currentVerse         // Combined text of selected verses
currentAyahStart     // Starting ayah number
currentAyahEnd       // Ending ayah number
```

## Performance Considerations

1. **Text Normalization**: Done once per comparison, cached if possible
2. **Levenshtein Distance**: O(n×m) complexity - acceptable for short words
3. **Sequential Matching**: O(n) with early exit on good match
4. **DOM Updates**: Batch updates, avoid layout thrashing

## Known Limitations

1. **Speech Recognition Accuracy**: 
   - Not perfect for Quranic Arabic
   - Better with clear pronunciation
   - Struggles with rapid/melodious recitation

2. **Network Dependency**: 
   - Speech recognition requires internet (Google's API)
   - No offline mode currently

3. **Limited Surah Coverage**: 
   - Only 5 surahs loaded
   - Easily expandable by adding to `quranData`

4. **No Tajweed Rules**: 
   - Doesn't check pronunciation rules
   - Only checks word presence/accuracy

## Future Enhancements

1. **Full Quran Support**: Load all 114 surahs
2. **Offline Mode**: Use local speech recognition models
3. **Tajweed Checking**: Advanced pronunciation analysis
4. **Progress Tracking**: Save user's recitation history
5. **Audio Playback**: Compare with professional reciter
6. **Multi-language UI**: English, Urdu, French interfaces

## Development Setup

```bash
# No build required - pure HTML/CSS/JS
# Just open in browser or serve via HTTP

# For mobile testing:
# 1. Enable Eruda console (already included)
# 2. Test in Safari on iOS or Chrome on Android
# 3. Grant microphone permissions
```

## Testing Checklist

- [ ] Single verse recitation
- [ ] Multiple verse recitation  
- [ ] Pause between verses
- [ ] Missing verses detection
- [ ] Repeated words handling
- [ ] Different browsers (Chrome, Safari, Edge)
- [ ] Mobile devices (iPhone, Android)
- [ ] Microphone permissions
- [ ] Network errors handling

---

**Current Status**: Core functionality working. Advanced comparison algorithm tested but had JavaScript scoping issues. Currently on stable v24 baseline, ready to add features incrementally.
