🧪 Comprehensive Repeat Detection Tests

═══════════════════════════════════════════════════════


════════════════════════════════════════════════════════════
📂 CATEGORY: User Corrections
════════════════════════════════════════════════════════════

📝 Test: Single word self-correction
   Transcript: "القارعة القارعة ما القارعة"
   Expected: ✅ SHOULD detect repeat
   Reason: User said القارعة twice at start (self-correction)
   Result: 0 repeat(s) detected
   ❌ FAIL - Missed user correction that should be detected

📝 Test: Phrase correction
   Transcript: "يا أيها الناس يا أيها الناس اتقوا ربكم"
   Expected: ✅ SHOULD detect repeat
   Reason: User repeated "يا أيها الناس" for correction
   Result: 1 repeat(s) detected
     1. correction: "يا ايها الناس"
   ✅ PASS - Correctly detected user correction


════════════════════════════════════════════════════════════
📂 CATEGORY: Natural Quranic Repetition
════════════════════════════════════════════════════════════

📝 Test: Ar-Rahman refrain (verse 13)
   Transcript: "فَبِأَيِّ آلَاءِ رَبِّكُمَا تُكَذِّبَانِ"
   Expected: ❌ Should NOT detect repeat
   Reason: This phrase appears naturally in Ar-Rahman many times - not a user repeat
   Result: 0 repeat(s) detected
   ✅ PASS - Correctly ignored natural Quranic repetition

📝 Test: Al-Mursalat refrain sequence (verses 15-16)
   Transcript: "وَيْلٌ يَوْمَئِذٍ لِّلْمُكَذِّبِينَ أَلَمْ نَخْلُقكُّم مِّن مَّاءٍ مَّهِينٍ وَيْ..."
   Expected: ❌ Should NOT detect repeat
   Reason: Natural repetition in consecutive verses - different verses, not user correction
   Result: 0 repeat(s) detected
   ✅ PASS - Correctly ignored natural Quranic repetition

📝 Test: Al-Qamar verses 17, 22, 32, 40 (same verse text)
   Transcript: "وَلَقَدْ يَسَّرْنَا الْقُرْآنَ لِلذِّكْرِ فَهَلْ مِن مُّدَّكِرٍ"
   Expected: ❌ Should NOT detect repeat
   Reason: This exact verse appears 4 times in Al-Qamar - natural Quranic structure
   Result: 0 repeat(s) detected
   ✅ PASS - Correctly ignored natural Quranic repetition


════════════════════════════════════════════════════════════
📂 CATEGORY: Ambiguous Cases
════════════════════════════════════════════════════════════

📝 Test: Two consecutive verses starting the same
   Transcript: "إِنَّ الْإِنسَانَ لَفِي خُسْرٍ إِلَّا الَّذِينَ آمَنُوا"
   Expected: ❌ Should NOT detect repeat
   Reason: Al-Asr verses 2-3 - consecutive verses, not repeat
   Result: 0 repeat(s) detected
   ✅ PASS - Correctly ignored natural Quranic repetition

📝 Test: User repeats a naturally repeating phrase
   Transcript: "فَبِأَيِّ آلَاءِ رَبِّكُمَا تُكَذِّبَانِ فَبِأَيِّ آلَاءِ رَبِّكُمَا تُكَذِّبَان..."
   Expected: ✅ SHOULD detect repeat
   Reason: Could be 3 consecutive verses OR user repeating. Need context!
   Result: 1 repeat(s) detected
     1. phrase: "فباي الا ربكما تكذبان"
   ⚠️  AMBIGUOUS CASE - Manual review needed


════════════════════════════════════════════════════════════
📂 CATEGORY: Edge Cases
════════════════════════════════════════════════════════════

📝 Test: Similar but different words
   Transcript: "الرَّحْمَٰنِ الرَّحِيمِ"
   Expected: ❌ Should NOT detect repeat
   Reason: الرَّحْمَٰنِ and الرَّحِيمِ are different words - not a repeat
   Result: 0 repeat(s) detected
   ✅ PASS - Correctly ignored natural Quranic repetition

📝 Test: Same word in different contexts
   Transcript: "قُلْ هُوَ اللَّهُ أَحَدٌ اللَّهُ الصَّمَدُ"
   Expected: ❌ Should NOT detect repeat
   Reason: Allah appears twice but in different contexts - natural verse structure
   Result: 0 repeat(s) detected
   ✅ PASS - Correctly ignored natural Quranic repetition

📝 Test: User stutters on first word then continues
   Transcript: "بِسْمِ بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ"
   Expected: ✅ SHOULD detect repeat
   Reason: User stuttered/corrected on بِسْمِ before continuing
   Result: 1 repeat(s) detected
     1. single_word: "بسم"
   ✅ PASS - Correctly detected user correction


════════════════════════════════════════════════════════════
📂 CATEGORY: Complex Scenarios
════════════════════════════════════════════════════════════

📝 Test: Multiple verses with natural repetition
   Transcript: "الْقَارِعَةُ مَا الْقَارِعَةُ وَمَا أَدْرَاكَ مَا الْقَارِعَةُ"
   Expected: ❌ Should NOT detect repeat
   Reason: Al-Qaria verses 1-3 - القارعة appears 3 times across 3 verses naturally
   Result: 0 repeat(s) detected
   ✅ PASS - Correctly ignored natural Quranic repetition

📝 Test: User correction in middle of natural repetition
   Transcript: "الْقَارِعَةُ مَا الْقَارِعَةُ مَا الْقَارِعَةُ وَمَا أَدْرَاكَ مَا الْقَارِعَةُ"
   Expected: ✅ SHOULD detect repeat
   Reason: User repeated "مَا الْقَارِعَةُ" (verse 2) before continuing to verse 3
   Result: 1 repeat(s) detected
     1. correction: "القارعه ما"
   ✅ PASS - Correctly detected user correction

📝 Test: Full verse repetition for practice
   Transcript: "قُلْ هُوَ اللَّهُ أَحَدٌ قُلْ هُوَ اللَّهُ أَحَدٌ"
   Expected: ✅ SHOULD detect repeat
   Reason: User repeated entire verse 1 of Al-Ikhlas for practice
   Result: 1 repeat(s) detected
     1. phrase: "قل هو الله احد"
   ✅ PASS - Correctly detected user correction


════════════════════════════════════════════════════════════
📂 CATEGORY: Exact Duplicate Verses - Database
════════════════════════════════════════════════════════════

📝 Test: Surah 2:134 = 2:141 (Same Surah Exact Match)
   Transcript: "تِلْكَ أُمَّةٌ قَدْ خَلَتْ لَهَا مَا كَسَبَتْ وَلَكُم مَّا كَسَبْتُمْ"
   Verse Locations: 2:134, 2:141
   Expected: ❌ Should NOT detect repeat
   Reason: This exact verse appears identically at 2:134 AND 2:141 - natural Quran structure, not user error.
   Result: 0 repeat(s) detected
   ✅ PASS - Correctly ignored natural Quranic repetition

📝 Test: Surah 6:10 = 21:41 (Meccan Doublet)
   Transcript: "وَلَقَدِ اسْتُهْزِئَ بِرُسُلٍ مِّن قَبْلِكَ فَحَاقَ بِالَّذِينَ سَخِرُوا مِنْهُم..."
   Verse Locations: 6:10, 21:41
   Expected: ❌ Should NOT detect repeat
   Reason: Exact duplicate across different surahs. App must return both locations in search results.
   Result: 0 repeat(s) detected
   ✅ PASS - Correctly ignored natural Quranic repetition

📝 Test: Surah 7:22 = 20:121 (Garden Narrative)
   Transcript: "فَأَزَلَّهُمَا الشَّيْطَانُ عَنْهَا فَأَخْرَجَهُمَا مِمَّا كَانَا فِيهِ"
   Verse Locations: 7:22, 20:121
   Expected: ❌ Should NOT detect repeat
   Reason: Exact match in Adam/Eve garden narrative. Different surahs, same text.
   Result: 0 repeat(s) detected
   ✅ PASS - Correctly ignored natural Quranic repetition

📝 Test: Surah 11:96 = 40:23 (Prophet Moses Reference)
   Transcript: "وَلَقَدْ أَرْسَلْنَا مُوسَىٰ بِآيَاتِنَا وَسُلْطَانٍ مُّبِينٍ"
   Verse Locations: 11:96, 40:23
   Expected: ❌ Should NOT detect repeat
   Reason: Identical verse about Moses and clear authority.
   Result: 0 repeat(s) detected
   ✅ PASS - Correctly ignored natural Quranic repetition

📝 Test: Surah 11:110 = 41:45 (Book of Moses)
   Transcript: "وَلَقَدْ آتَيْنَا مُوسَى الْكِتَابَ فَاخْتُلِفَ فِيهِ"
   Verse Locations: 11:110, 41:45
   Expected: ❌ Should NOT detect repeat
   Reason: Exact duplicate about giving Moses the Book and disagreement in both surahs.
   Result: 0 repeat(s) detected
   ✅ PASS - Correctly ignored natural Quranic repetition

📝 Test: Surah 16:43 = 21:7 (Messengers Question)
   Transcript: "وَمَا أَرْسَلْنَا قَبْلَكَ إِلَّا رِجَالًا نُّوحِي إِلَيْهِمْ فَاسْأَلُوا أَهْلَ..."
   Verse Locations: 16:43, 21:7
   Expected: ❌ Should NOT detect repeat
   Reason: Identical verse about previous messengers and asking the people of knowledge.
   Result: 0 repeat(s) detected
   ✅ PASS - Correctly ignored natural Quranic repetition

📝 Test: Surah 17:48 = 25:9
   Transcript: "انظُرْ كَيْفَ ضَرَبُوا لَكَ الْأَمْثَالَ فَضَلُّوا فَلَا يَسْتَطِيعُونَ سَبِيلًا"
   Verse Locations: 17:48, 25:9
   Expected: ❌ Should NOT detect repeat
   Reason: Exact duplicate about how they set parables and went astray.
   Result: 0 repeat(s) detected
   ✅ PASS - Correctly ignored natural Quranic repetition

⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ 

📝 Test: 🔴 CRITICAL: Surah 23:5-8 = 70:29-32 (4-VERSE BLOCK)
   Transcript: "وَالَّذِينَ هُمْ لِفُرُوجِهِمْ حَافِظُونَ إِلَّا عَلَىٰ أَزْوَاجِهِمْ أَوْ مَا م..."
   Verse Locations: 23:5, 23:6, 23:7, 23:8, 70:29, 70:30, 70:31, 70:32
   Expected: ❌ Should NOT detect repeat
   Reason: Four consecutive verses appear identically in two surahs. Search must return all 8 locations.
   Result: 0 repeat(s) detected
   ✅ PASS - Correctly ignored natural Quranic repetition
⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ 

⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ 

📝 Test: 🟡 IMPORTANT: Surah 57:1 = 59:1 = 61:1 (TRIPLET)
   Transcript: "سَبَّحَ لِلَّهِ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ وَهُوَ الْعَزِيزُ الْح..."
   Verse Locations: 57:1, 59:1, 61:1
   Expected: ❌ Should NOT detect repeat
   Reason: Opening verse appears in three surahs. Search must map all three.
   Result: 0 repeat(s) detected
   ✅ PASS - Correctly ignored natural Quranic repetition
⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ 

⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ 

📝 Test: 🟡 IMPORTANT: Surah 41:8 = 84:25 = 95:6 (TRIPLET)
   Transcript: "إِنَّ الَّذِينَ آمَنُوا وَعَمِلُوا الصَّالِحَاتِ لَهُمْ أَجْرٌ غَيْرُ مَمْنُونٍ"
   Verse Locations: 41:8, 84:25, 95:6
   Expected: ❌ Should NOT detect repeat
   Reason: Same promise of reward appears three times in different surahs.
   Result: 0 repeat(s) detected
   ✅ PASS - Correctly ignored natural Quranic repetition
⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ 

📝 Test: Surah 27:80-81 = 30:52-53 (2-VERSE BLOCK)
   Transcript: "إِنَّكَ لَا تُسْمِعُ الْمَوْتَىٰ وَلَا تُسْمِعُ الصُّمَّ الدُّعَاءَ إِذَا وَلَّو..."
   Verse Locations: 27:80, 27:81, 30:52, 30:53
   Expected: ❌ Should NOT detect repeat
   Reason: Two consecutive verses repeated identically in another surah.
   Result: 0 repeat(s) detected
   ✅ PASS - Correctly ignored natural Quranic repetition


════════════════════════════════════════════════════════════
📂 CATEGORY: Near-Identical Duplicates (Minor Variations)
════════════════════════════════════════════════════════════

📝 Test: Surah 2:48 vs 2:123
   Transcript: "وَاتَّقُوا يَوْمًا لَّا تَجْزِي نَفْسٌ عَن نَّفْسٍ شَيْئًا"
   Verse Locations: 2:48, 2:123
   Expected: ❌ Should NOT detect repeat
   Reason: Near-identical warning about the Day. Same surah, minor variation.
   Result: 0 repeat(s) detected
   ✅ PASS - Correctly ignored natural Quranic repetition

📝 Test: Surah 2:62 vs 5:69
   Transcript: "إِنَّ الَّذِينَ آمَنُوا وَالَّذِينَ هَادُوا وَالنَّصَارَىٰ وَالصَّابِئِينَ"
   Verse Locations: 2:62, 5:69
   Expected: ❌ Should NOT detect repeat
   Reason: Same list of communities with minor ordering/phrasing variations between the two verses.
   Result: 0 repeat(s) detected
   ✅ PASS - Correctly ignored natural Quranic repetition

📝 Test: Surah 3:51 = 19:36 = 43:64
   Transcript: "إِنَّ اللَّهَ رَبِّي وَرَبُّكُمْ فَاعْبُدُوهُ ۚ هَٰذَا صِرَاطٌ مُّسْتَقِيمٌ"
   Verse Locations: 3:51, 19:36, 43:64
   Expected: ❌ Should NOT detect repeat
   Reason: Same core statement appearing three times with slight context or attribution differences.
   Result: 0 repeat(s) detected
   ✅ PASS - Correctly ignored natural Quranic repetition


════════════════════════════════════════════════════════════
📂 CATEGORY: Intra-Surah Refrains (NOT Cross-Surah Duplicates)
════════════════════════════════════════════════════════════

📝 Test: Ar-Rahman 55:13 refrain (31x)
   Transcript: "فَبِأَيِّ آلَاءِ رَبِّكُمَا تُكَذِّبَانِ فَبِأَيِّ آلَاءِ رَبِّكُمَا تُكَذِّبَان..."
   Verse Locations: 55:13, 55:16, 55:18, 55:21
   Expected: ❌ Should NOT detect repeat
   Reason: Repeated within a single surah by design; must not be treated as user error during recitation.
   Result: 1 repeat(s) detected
     1. phrase: "فباي الا ربكما تكذبان"
   ❌ FAIL - Incorrectly flagged natural Quranic repetition as user error!
   ⚠️  CRITICAL: This is natural Quran text, not a user mistake!

📝 Test: Al-Mursalat 77:15 refrain (10x)
   Transcript: "وَيْلٌ يَوْمَئِذٍ لِّلْمُكَذِّبِينَ وَيْلٌ يَوْمَئِذٍ لِّلْمُكَذِّبِينَ"
   Verse Locations: 77:15, 77:19, 77:24, 77:28
   Expected: ❌ Should NOT detect repeat
   Reason: Repeated refrain within Surah 77 only; natural structure rather than user repetition.
   Result: 0 repeat(s) detected
   ✅ PASS - Correctly ignored natural Quranic repetition


════════════════════════════════════════════════════════════
📂 CATEGORY: Special Formula Cases
════════════════════════════════════════════════════════════

📝 Test: Basmala - formulaic opening
   Transcript: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ"
   Verse Locations: 1:1
   Expected: ❌ Should NOT detect repeat
   Reason: Basmala appears 113 times as an opening; should not be flagged as a duplicate error.
   Result: 0 repeat(s) detected
   ✅ PASS - Correctly ignored natural Quranic repetition

📝 Test: Paradise description pattern (thematic)
   Transcript: "جَنَّاتٌ تَجْرِي مِن تَحْتِهَا الْأَنْهَارُ"
   Verse Locations: 2:25, 3:15, 4:13, 9:72, 47:15, 65:11
   Expected: ❌ Should NOT detect repeat
   Reason: Thematic repetition of paradise description with small variations; not a strict word-for-word duplicate.
   Result: 0 repeat(s) detected
   ✅ PASS - Correctly ignored natural Quranic repetition


════════════════════════════════════════════════════════════
📊 FINAL RESULTS
════════════════════════════════════════════════════════════
✅ Passed: 28
❌ Failed: 2
⚠️  Ambiguous: 1
📈 Total: 31

⚠️  ISSUES FOUND:
   2 test(s) failed

🔧 REQUIRED IMPROVEMENTS:
   1. Context-aware repeat detection
   2. Check if repeated phrase spans multiple verses
   3. Verify against actual Quran structure
   4. Load exact duplicate verses database
   5. Implement multi-verse block matching (e.g., 23:5-8 = 70:29-32)
   6. Implement triplet matching for 3-way duplicates
   7. Detect intra-surah refrains vs cross-surah duplicates
   8. Return all verse locations when duplicate found
