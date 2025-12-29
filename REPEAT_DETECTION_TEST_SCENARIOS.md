# Repeat Detection Test Scenarios

## Problem Statement

The Quran itself contains natural repetition that must NOT be flagged as user corrections:
- Repeated refrains (e.g., Ar-Rahman's "فَبِأَيِّ آلَاءِ رَبِّكُمَا تُكَذِّبَانِ")
- Identical verses appearing multiple times
- Words/phrases appearing naturally multiple times in sequence

Current system: Detects ALL exact sequence repetitions
Needed: Context-aware detection that distinguishes natural Quranic repetition from user corrections

---

## Test Categories

### CATEGORY 1: User Corrections ✅ (Should detect)

These are genuine user mistakes/corrections that should be flagged:

| Test | Input | Expected | Reason |
|------|-------|----------|--------|
| Single word correction | `القارعة القارعة ما القارعة` | Detect 1 repeat | User said القارعة twice (stutter/correction) |
| Phrase correction | `يا أيها الناس يا أيها الناس اتقوا ربكم` | Detect 1 repeat | User repeated phrase before continuing |
| Verse practice | `قُلْ هُوَ اللَّهُ أَحَدٌ قُلْ هُوَ اللَّهُ أَحَدٌ` | Detect 1 repeat | Full verse repeated for practice |
| Stutter on first word | `بِسْمِ بِسْمِ اللَّهِ الرَّحْمَٰنِ` | Detect 1 repeat | Stuttered on بِسْمِ |

---

### CATEGORY 2: Natural Quranic Repetition ❌ (Should NOT detect)

These are natural Quran structure - NOT user mistakes:

| Test | Input | Expected | Reason |
|------|-------|----------|--------|
| **Ar-Rahman refrain** | `فَبِأَيِّ آلَاءِ رَبِّكُمَا تُكَذِّبَانِ` | NO repeat | This phrase appears 31 times in Ar-Rahman naturally |
| **Al-Mursalat refrain** | `وَيْلٌ يَوْمَئِذٍ لِّلْمُكَذِّبِينَ أَلَمْ نَخْلُقكُّم وَيْلٌ يَوْمَئِذٍ لِّلْمُكَذِّبِينَ` | NO repeat | Verses 15-16 - refrain appears at end of v15 and v16 |
| **Al-Qamar refrain** | `وَلَقَدْ يَسَّرْنَا الْقُرْآنَ لِلذِّكْرِ فَهَلْ مِن مُّدَّكِرٍ` | NO repeat | Identical verse appears 4x in Al-Qamar (v17, 22, 32, 40) |
| **Al-Qaria natural** | `الْقَارِعَةُ مَا الْقَارِعَةُ وَمَا أَدْرَاكَ مَا الْقَارِعَةُ` | NO repeat | Verses 1-3 - القارعة appears 3x naturally |
| **Same word different context** | `قُلْ هُوَ اللَّهُ أَحَدٌ اللَّهُ الصَّمَدُ` | NO repeat | Allah appears twice in different grammatical positions |
| **Similar words** | `الرَّحْمَٰنِ الرَّحِيمِ` | NO repeat | Different words, not a repeat |

---

### CATEGORY 3: Ambiguous Cases ⚠️ (Requires context)

These require verse boundary detection to determine correctly:

| Test | Input | Challenge | Solution Needed |
|------|-------|-----------|-----------------|
| **User repeats natural refrain** | `فَبِأَيِّ آلَاءِ... فَبِأَيِّ آلَاءِ... فَبِأَيِّ آلَاءِ...` | Could be 3 verses OR user repeating | Check verse boundaries |
| **Correction mid-natural repetition** | `الْقَارِعَةُ مَا الْقَارِعَةُ مَا الْقَارِعَةُ وَمَا أَدْرَاكَ...` | User repeated v2 before v3 | Detect which occurrence is extra |

---

## Current Implementation Issues

### Issue 1: No Verse Boundary Awareness

**Problem:**
```javascript
// Current: Detects ALL exact repetitions
"القارعة ما القارعة" → Detected as repeat ❌
```

**Reality:**
- If this spans verses 1-2: Natural Quran (verses 1="القارعة", 2="ما القارعة") → Should NOT detect
- If all in verse 1: User correction → Should detect

**Solution:** Check verse boundaries before flagging

---

### Issue 2: No Multi-Verse Context

**Problem:**
```javascript
// Current: Can't distinguish
Input: "القارعة ما القارعة وما أدراك ما القارعة"
// This is verses 1-3, القارعة appears 3x naturally → Should NOT detect

Input: "القارعة القارعة ما القارعة"
// User repeated verse 1 → Should detect
```

**Solution:** Map transcript to verse numbers, check if repetition is within natural verse structure

---

### Issue 3: No Refrain Recognition

**Problem:**
```javascript
// Ar-Rahman has "فَبِأَيِّ آلَاءِ رَبِّكُمَا تُكَذِّبَانِ" 31 times
// Current system would flag all as repeats ❌
```

**Solution:** Maintain list of known refrains, or check if phrase appears in multiple verse numbers

---

## Proposed Solution

### Algorithm Enhancement

```javascript
function detectRepeats(transcriptWords, detectedVerses) {
    const repeats = [];

    // STEP 1: Get verse boundaries from transcript
    const verseMapping = mapWordsToVerses(transcriptWords, detectedVerses);

    // STEP 2: For each potential repeat
    for (const potentialRepeat of findSequenceRepeats(transcriptWords)) {
        const firstOccurrence = potentialRepeat.positions[0];
        const secondOccurrence = potentialRepeat.positions[1];

        // Get verse numbers for both occurrences
        const firstVerse = verseMapping[firstOccurrence];
        const secondVerse = verseMapping[secondOccurrence];

        // CRITICAL CHECK: Are they in different verses?
        if (firstVerse !== secondVerse) {
            // Check if this phrase naturally appears in both verses
            if (isNaturalRepetition(potentialRepeat.words, firstVerse, secondVerse)) {
                // Natural Quranic repetition - DON'T flag
                continue;
            }
        }

        // If same verse or not natural → User correction
        repeats.push(potentialRepeat);
    }

    return repeats;
}

function isNaturalRepetition(words, verse1, verse2) {
    // Get actual verse texts
    const verse1Text = getVerseText(verse1);
    const verse2Text = getVerseText(verse2);

    const sequence = words.join(' ');

    // Does this sequence appear in both verse texts?
    const inVerse1 = verse1Text.includes(sequence);
    const inVerse2 = verse2Text.includes(sequence);

    return inVerse1 && inVerse2;
}

function mapWordsToVerses(transcriptWords, detectedVerses) {
    // For each word position, determine which verse it belongs to
    // Based on word-by-word alignment results

    const mapping = {};
    let currentWordIndex = 0;

    for (const verse of detectedVerses) {
        const verseWordCount = verse.wordCount;

        for (let i = 0; i < verseWordCount; i++) {
            mapping[currentWordIndex] = verse.ayah;
            currentWordIndex++;
        }
    }

    return mapping;
}
```

---

## Implementation Checklist

- [ ] **Step 1:** Add verse boundary detection to repeat detection
  - Map each word in transcript to its verse number
  - Store in `repeatDetection` object

- [ ] **Step 2:** Check if repetition spans verses
  - If first occurrence in verse 1, second in verse 2 → Check natural
  - If both in same verse → User correction

- [ ] **Step 3:** Verify against Quran text
  - Load actual verse texts
  - Check if sequence appears naturally in both verses
  - If yes → Don't flag

- [ ] **Step 4:** Handle known refrains
  - Maintain list of common refrains (Ar-Rahman, Al-Mursalat, etc.)
  - Auto-skip these patterns

- [ ] **Step 5:** Update tests
  - Add all scenarios from this document
  - Verify 100% pass rate

---

## Success Criteria

✅ **All natural Quranic repetition ignored:**
- Ar-Rahman refrain: 0 repeats detected
- Al-Mursalat refrain: 0 repeats detected
- Al-Qaria verses 1-3: 0 repeats detected
- Al-Qamar repeated verse: 0 repeats detected

✅ **All user corrections detected:**
- Single word stutter: 1 repeat detected
- Phrase correction: 1 repeat detected
- Verse practice: 1 repeat detected

✅ **Ambiguous cases handled correctly:**
- Uses verse boundary context
- Provides clear explanation in edge cases

---

## Test Command

```bash
node /tmp/test_repeat_comprehensive.js
```

Expected: 0 failures, all natural Quranic repetition correctly ignored

---

## Related Issues

This connects to:
- **Priority 1.3:** Verse order detection (need verse boundaries)
- **Word-by-word alignment:** Need to know which words belong to which verse
- **Skip detection:** Already has verse-level analysis we can reuse

The verse boundary mapping from alignment can be reused here!
