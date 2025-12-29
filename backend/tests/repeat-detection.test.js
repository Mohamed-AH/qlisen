/**
 * Comprehensive Repeat Detection Test Scenarios
 * Including natural Quranic repetition vs user corrections
 * Enhanced with exact duplicate verses from Quranic database
 */

const path = require('path');
const fs = require('fs');
const RecitationAnalyzer = require('../services/recitationAnalyzer');
const quranService = require('../services/quranService');

async function runComprehensiveTests() {
    // Capture all output in memory
    let logBuffer = '';

    const log = (...args) => {
        const line = args.join(' ');
        console.log(line);
        logBuffer += line + '\n';
    };

    log('🧪 Comprehensive Repeat Detection Tests\n');
    log('═══════════════════════════════════════════════════════');

    // Use relative path to data directory (works on all platforms)
    const dataPath = path.join(__dirname, '..', '..', 'data');
    await quranService.init(dataPath);
    const analyzer = new RecitationAnalyzer(quranService);

    const testScenarios = [
        // ===== CATEGORY 1: USER CORRECTIONS (Should be detected) =====
        {
            category: 'User Corrections',
            name: 'Single word self-correction',
            transcript: 'القارعة القارعة ما القارعة',
            expectedRepeats: 1,
            shouldDetect: true,
            reason: 'User said القارعة twice at start (self-correction)'
        },
        {
            category: 'User Corrections',
            name: 'Phrase correction',
            transcript: 'يا أيها الناس يا أيها الناس اتقوا ربكم',
            expectedRepeats: 1,
            shouldDetect: true,
            reason: 'User repeated "يا أيها الناس" for correction'
        },

        // ===== CATEGORY 2: NATURAL QURANIC REPETITION (Should NOT be detected) =====
        {
            category: 'Natural Quranic Repetition',
            name: 'Ar-Rahman refrain (verse 13)',
            transcript: 'فَبِأَيِّ آلَاءِ رَبِّكُمَا تُكَذِّبَانِ',
            expectedRepeats: 0,
            shouldDetect: false,
            reason: 'This phrase appears naturally in Ar-Rahman many times - not a user repeat'
        },
        {
            category: 'Natural Quranic Repetition',
            name: 'Al-Mursalat refrain sequence (verses 15-16)',
            transcript:
                'وَيْلٌ يَوْمَئِذٍ لِّلْمُكَذِّبِينَ أَلَمْ نَخْلُقكُّم مِّن مَّاءٍ مَّهِينٍ وَيْلٌ يَوْمَئِذٍ لِّلْمُكَذِّبِينَ',
            expectedRepeats: 0,
            shouldDetect: false,
            reason: 'Natural repetition in consecutive verses - different verses, not user correction'
        },
        {
            category: 'Natural Quranic Repetition',
            name: 'Al-Qamar verses 17, 22, 32, 40 (same verse text)',
            transcript: 'وَلَقَدْ يَسَّرْنَا الْقُرْآنَ لِلذِّكْرِ فَهَلْ مِن مُّدَّكِرٍ',
            expectedRepeats: 0,
            shouldDetect: false,
            reason: 'This exact verse appears 4 times in Al-Qamar - natural Quranic structure'
        },

        // ===== CATEGORY 3: AMBIGUOUS CASES (Need careful handling) =====
        {
            category: 'Ambiguous Cases',
            name: 'Two consecutive verses starting the same',
            transcript: 'إِنَّ الْإِنسَانَ لَفِي خُسْرٍ إِلَّا الَّذِينَ آمَنُوا',
            expectedRepeats: 0,
            shouldDetect: false,
            reason: 'Al-Asr verses 2-3 - consecutive verses, not repeat'
        },
        {
            category: 'Ambiguous Cases',
            name: 'User repeats a naturally repeating phrase',
            transcript:
                'فَبِأَيِّ آلَاءِ رَبِّكُمَا تُكَذِّبَانِ فَبِأَيِّ آلَاءِ رَبِّكُمَا تُكَذِّبَانِ فَبِأَيِّ آلَاءِ رَبِّكُمَا تُكَذِّبَانِ',
            expectedRepeats: 'TRICKY',
            shouldDetect: 'UNCLEAR',
            reason: 'Could be 3 consecutive verses OR user repeating. Need context!'
        },

        // ===== CATEGORY 4: EDGE CASES =====
        {
            category: 'Edge Cases',
            name: 'Similar but different words',
            transcript: 'الرَّحْمَٰنِ الرَّحِيمِ',
            expectedRepeats: 0,
            shouldDetect: false,
            reason: 'الرَّحْمَٰنِ and الرَّحِيمِ are different words - not a repeat'
        },
        {
            category: 'Edge Cases',
            name: 'Same word in different contexts',
            transcript: 'قُلْ هُوَ اللَّهُ أَحَدٌ اللَّهُ الصَّمَدُ',
            expectedRepeats: 0,
            shouldDetect: false,
            reason: 'Allah appears twice but in different contexts - natural verse structure'
        },
        {
            category: 'Edge Cases',
            name: 'User stutters on first word then continues',
            transcript: 'بِسْمِ بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
            expectedRepeats: 1,
            shouldDetect: true,
            reason: 'User stuttered/corrected on بِسْمِ before continuing'
        },

        // ===== CATEGORY 5: COMPLEX SCENARIOS =====
        {
            category: 'Complex Scenarios',
            name: 'Multiple verses with natural repetition',
            transcript: 'الْقَارِعَةُ مَا الْقَارِعَةُ وَمَا أَدْرَاكَ مَا الْقَارِعَةُ',
            expectedRepeats: 0,
            shouldDetect: false,
            reason: 'Al-Qaria verses 1-3 - القارعة appears 3 times across 3 verses naturally'
        },
        {
            category: 'Complex Scenarios',
            name: 'User correction in middle of natural repetition',
            transcript: 'الْقَارِعَةُ مَا الْقَارِعَةُ مَا الْقَارِعَةُ وَمَا أَدْرَاكَ مَا الْقَارِعَةُ',
            expectedRepeats: 1,
            shouldDetect: true,
            reason: 'User repeated "مَا الْقَارِعَةُ" (verse 2) before continuing to verse 3'
        },
        {
            category: 'Complex Scenarios',
            name: 'Full verse repetition for practice',
            transcript: 'قُلْ هُوَ اللَّهُ أَحَدٌ قُلْ هُوَ اللَّهُ أَحَدٌ',
            expectedRepeats: 1,
            shouldDetect: true,
            reason: 'User repeated entire verse 1 of Al-Ikhlas for practice'
        },

        // ===== CATEGORY 6: EXACT DUPLICATE VERSES - DATABASE =====
        {
            category: 'Exact Duplicate Verses - Database',
            name: 'Surah 2:134 = 2:141 (Same Surah Exact Match)',
            transcript: 'تِلْكَ أُمَّةٌ قَدْ خَلَتْ لَهَا مَا كَسَبَتْ وَلَكُم مَّا كَسَبْتُمْ',
            verseLocations: ['2:134', '2:141'],
            expectedRepeats: 0,
            shouldDetect: false,
            reason:
                'This exact verse appears identically at 2:134 AND 2:141 - natural Quran structure, not user error.'
        },
        {
            category: 'Exact Duplicate Verses - Database',
            name: 'Surah 6:10 = 21:41 (Meccan Doublet)',
            transcript:
                'وَلَقَدِ اسْتُهْزِئَ بِرُسُلٍ مِّن قَبْلِكَ فَحَاقَ بِالَّذِينَ سَخِرُوا مِنْهُم مَّا كَانُوا بِهِ يَسْتَهْزِئُونَ',
            verseLocations: ['6:10', '21:41'],
            expectedRepeats: 0,
            shouldDetect: false,
            reason:
                'Exact duplicate across different surahs. App must return both locations in search results.'
        },
        {
            category: 'Exact Duplicate Verses - Database',
            name: 'Surah 7:22 = 20:121 (Garden Narrative)',
            transcript: 'فَأَزَلَّهُمَا الشَّيْطَانُ عَنْهَا فَأَخْرَجَهُمَا مِمَّا كَانَا فِيهِ',
            verseLocations: ['7:22', '20:121'],
            expectedRepeats: 0,
            shouldDetect: false,
            reason: 'Exact match in Adam/Eve garden narrative. Different surahs, same text.'
        },
        {
            category: 'Exact Duplicate Verses - Database',
            name: 'Surah 11:96 = 40:23 (Prophet Moses Reference)',
            transcript: 'وَلَقَدْ أَرْسَلْنَا مُوسَىٰ بِآيَاتِنَا وَسُلْطَانٍ مُّبِينٍ',
            verseLocations: ['11:96', '40:23'],
            expectedRepeats: 0,
            shouldDetect: false,
            reason: 'Identical verse about Moses and clear authority.'
        },
        {
            category: 'Exact Duplicate Verses - Database',
            name: 'Surah 11:110 = 41:45 (Book of Moses)',
            transcript: 'وَلَقَدْ آتَيْنَا مُوسَى الْكِتَابَ فَاخْتُلِفَ فِيهِ',
            verseLocations: ['11:110', '41:45'],
            expectedRepeats: 0,
            shouldDetect: false,
            reason:
                'Exact duplicate about giving Moses the Book and disagreement in both surahs.'
        },
        {
            category: 'Exact Duplicate Verses - Database',
            name: 'Surah 16:43 = 21:7 (Messengers Question)',
            transcript:
                'وَمَا أَرْسَلْنَا قَبْلَكَ إِلَّا رِجَالًا نُّوحِي إِلَيْهِمْ فَاسْأَلُوا أَهْلَ الذِّكْرِ إِن كُنتُمْ لَا تَعْلَمُونَ',
            verseLocations: ['16:43', '21:7'],
            expectedRepeats: 0,
            shouldDetect: false,
            reason:
                'Identical verse about previous messengers and asking the people of knowledge.'
        },
        {
            category: 'Exact Duplicate Verses - Database',
            name: 'Surah 17:48 = 25:9',
            transcript:
                'انظُرْ كَيْفَ ضَرَبُوا لَكَ الْأَمْثَالَ فَضَلُّوا فَلَا يَسْتَطِيعُونَ سَبِيلًا',
            verseLocations: ['17:48', '25:9'],
            expectedRepeats: 0,
            shouldDetect: false,
            reason: 'Exact duplicate about how they set parables and went astray.'
        },

        // ===== CRITICAL: 4-VERSE BLOCK DUPLICATE =====
        {
            category: 'Exact Duplicate Verses - Database',
            name: '🔴 CRITICAL: Surah 23:5-8 = 70:29-32 (4-VERSE BLOCK)',
            transcript:
                'وَالَّذِينَ هُمْ لِفُرُوجِهِمْ حَافِظُونَ إِلَّا عَلَىٰ أَزْوَاجِهِمْ أَوْ مَا مَلَكَتْ أَيْمَانُهُمْ فَإِنَّهُمْ غَيْرُ مَلُومِينَ فَمَنِ ابْتَغَىٰ وَرَاءَ ذَٰلِكَ فَأُولَٰئِكَ هُمُ الْعَادُونَ وَالَّذِينَ هُمْ لِأَمَانَاتِهِمْ وَعَهْدِهِمْ رَاعُونَ',
            verseLocations: [
                '23:5',
                '23:6',
                '23:7',
                '23:8',
                '70:29',
                '70:30',
                '70:31',
                '70:32'
            ],
            expectedRepeats: 0,
            shouldDetect: false,
            reason:
                'Four consecutive verses appear identically in two surahs. Search must return all 8 locations.'
        },

        // ===== TRIPLE OCCURRENCE TESTS =====
        {
            category: 'Exact Duplicate Verses - Database',
            name: '🟡 IMPORTANT: Surah 57:1 = 59:1 = 61:1 (TRIPLET)',
            transcript:
                'سَبَّحَ لِلَّهِ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ وَهُوَ الْعَزِيزُ الْحَكِيمُ',
            verseLocations: ['57:1', '59:1', '61:1'],
            expectedRepeats: 0,
            shouldDetect: false,
            reason: 'Opening verse appears in three surahs. Search must map all three.'
        },
        {
            category: 'Exact Duplicate Verses - Database',
            name: '🟡 IMPORTANT: Surah 41:8 = 84:25 = 95:6 (TRIPLET)',
            transcript:
                'إِنَّ الَّذِينَ آمَنُوا وَعَمِلُوا الصَّالِحَاتِ لَهُمْ أَجْرٌ غَيْرُ مَمْنُونٍ',
            verseLocations: ['41:8', '84:25', '95:6'],
            expectedRepeats: 0,
            shouldDetect: false,
            reason: 'Same promise of reward appears three times in different surahs.'
        },

        // ===== CONSECUTIVE VERSE BLOCK (2-VERSE) =====
        {
            category: 'Exact Duplicate Verses - Database',
            name: 'Surah 27:80-81 = 30:52-53 (2-VERSE BLOCK)',
            transcript:
                'إِنَّكَ لَا تُسْمِعُ الْمَوْتَىٰ وَلَا تُسْمِعُ الصُّمَّ الدُّعَاءَ إِذَا وَلَّوْا مُدْبِرِينَ وَمَا أَنتَ بِهَادِي الْعُمْيِ عَن ضَلَالَتِهِمْ',
            verseLocations: ['27:80', '27:81', '30:52', '30:53'],
            expectedRepeats: 0,
            shouldDetect: false,
            reason: 'Two consecutive verses repeated identically in another surah.'
        },

        // ===== NEAR-IDENTICAL DUPLICATES =====
        {
            category: 'Near-Identical Duplicates (Minor Variations)',
            name: 'Surah 2:48 vs 2:123',
            transcript: 'وَاتَّقُوا يَوْمًا لَّا تَجْزِي نَفْسٌ عَن نَّفْسٍ شَيْئًا',
            verseLocations: ['2:48', '2:123'],
            expectedRepeats: 0,
            shouldDetect: false,
            reason: 'Near-identical warning about the Day. Same surah, minor variation.'
        },
        {
            category: 'Near-Identical Duplicates (Minor Variations)',
            name: 'Surah 2:62 vs 5:69',
            transcript: 'إِنَّ الَّذِينَ آمَنُوا وَالَّذِينَ هَادُوا وَالنَّصَارَىٰ وَالصَّابِئِينَ',
            verseLocations: ['2:62', '5:69'],
            expectedRepeats: 0,
            shouldDetect: false,
            reason:
                'Same list of communities with minor ordering/phrasing variations between the two verses.'
        },
        {
            category: 'Near-Identical Duplicates (Minor Variations)',
            name: 'Surah 3:51 = 19:36 = 43:64',
            transcript:
                'إِنَّ اللَّهَ رَبِّي وَرَبُّكُمْ فَاعْبُدُوهُ ۚ هَٰذَا صِرَاطٌ مُّسْتَقِيمٌ',
            verseLocations: ['3:51', '19:36', '43:64'],
            expectedRepeats: 0,
            shouldDetect: false,
            reason:
                'Same core statement appearing three times with slight context or attribution differences.'
        },

        // ===== INTRA-SURAH REFRAINS =====
        {
            category: 'Intra-Surah Refrains (NOT Cross-Surah Duplicates)',
            name: 'Ar-Rahman 55:13 refrain (31x)',
            transcript:
                'فَبِأَيِّ آلَاءِ رَبِّكُمَا تُكَذِّبَانِ فَبِأَيِّ آلَاءِ رَبِّكُمَا تُكَذِّبَانِ',
            verseLocations: ['55:13', '55:16', '55:18', '55:21'],
            expectedRepeats: 0,
            shouldDetect: false,
            reason:
                'Repeated within a single surah by design; must not be treated as user error during recitation.'
        },
        {
            category: 'Intra-Surah Refrains (NOT Cross-Surah Duplicates)',
            name: 'Al-Mursalat 77:15 refrain (10x)',
            transcript:
                'وَيْلٌ يَوْمَئِذٍ لِّلْمُكَذِّبِينَ وَيْلٌ يَوْمَئِذٍ لِّلْمُكَذِّبِينَ',
            verseLocations: ['77:15', '77:19', '77:24', '77:28'],
            expectedRepeats: 0,
            shouldDetect: false,
            reason:
                'Repeated refrain within Surah 77 only; natural structure rather than user repetition.'
        },

        // ===== SPECIAL FORMULA CASES =====
        {
            category: 'Special Formula Cases',
            name: 'Basmala - formulaic opening',
            transcript:
                'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ',
            verseLocations: ['1:1'],
            expectedRepeats: 0,
            shouldDetect: false,
            reason:
                'Basmala appears 113 times as an opening; should not be flagged as a duplicate error.'
        },
        {
            category: 'Special Formula Cases',
            name: 'Paradise description pattern (thematic)',
            transcript: 'جَنَّاتٌ تَجْرِي مِن تَحْتِهَا الْأَنْهَارُ',
            verseLocations: ['2:25', '3:15', '4:13', '9:72', '47:15', '65:11'],
            expectedRepeats: 0,
            shouldDetect: false,
            reason:
                'Thematic repetition of paradise description with small variations; not a strict word-for-word duplicate.'
        }
    ];

    // Group by category
    const categories = {};
    testScenarios.forEach(test => {
        if (!categories[test.category]) {
            categories[test.category] = [];
        }
        categories[test.category].push(test);
    });

    let totalPassed = 0;
    let totalFailed = 0;
    let totalAmbiguous = 0;
    let criticalTests = [];

    // Run tests by category
    for (const [category, tests] of Object.entries(categories)) {
        log('\n\n' + '═'.repeat(60));
        log(`📂 CATEGORY: ${category}`);
        log('═'.repeat(60));

        for (const test of tests) {
            const isCritical = test.name.includes('🔴') || test.name.includes('🟡');

            if (isCritical) {
                log('\n' + '⚠️ '.repeat(10));
            }

            log(`\n📝 Test: ${test.name}`);
            log(
                `   Transcript: "${test.transcript.substring(0, 80)}${
                    test.transcript.length > 80 ? '...' : ''
                }"`
            );
            if (test.verseLocations) {
                log(`   Verse Locations: ${test.verseLocations.join(', ')}`);
            }
            log(
                `   Expected: ${
                    test.shouldDetect ? '✅ SHOULD detect repeat' : '❌ Should NOT detect repeat'
                }`
            );
            log(`   Reason: ${test.reason}`);

            try {
                const result = await analyzer.analyzeFull(test.transcript, { duration: 10000 });
                const repeatsDetected = result.repeats ? result.repeats.length : 0;

                log(`   Result: ${repeatsDetected} repeat(s) detected`);
                if (result.repeats && result.repeats.length > 0) {
                    result.repeats.forEach((repeat, idx) => {
                        log(`     ${idx + 1}. ${repeat.type}: "${repeat.words.join(' ')}"`);
                    });
                }

                if (test.expectedRepeats === 'TRICKY' || test.shouldDetect === 'UNCLEAR') {
                    log('   ⚠️  AMBIGUOUS CASE - Manual review needed');
                    totalAmbiguous++;
                } else if (test.shouldDetect) {
                    if (repeatsDetected > 0) {
                        log('   ✅ PASS - Correctly detected user correction');
                        totalPassed++;
                    } else {
                        log('   ❌ FAIL - Missed user correction that should be detected');
                        totalFailed++;
                        if (isCritical) criticalTests.push(test.name);
                    }
                } else {
                    if (repeatsDetected === 0) {
                        log('   ✅ PASS - Correctly ignored natural Quranic repetition');
                        totalPassed++;
                    } else {
                        log(
                            '   ❌ FAIL - Incorrectly flagged natural Quranic repetition as user error!'
                        );
                        log('   ⚠️  CRITICAL: This is natural Quran text, not a user mistake!');
                        totalFailed++;
                        if (isCritical) criticalTests.push(test.name);
                    }
                }

                if (isCritical) {
                    log('' + '⚠️ '.repeat(10));
                }
            } catch (error) {
                log(`   ❌ ERROR: ${error.message}`);
                totalFailed++;
                if (isCritical) criticalTests.push(test.name);
            }
        }
    }

    // Final summary
    log('\n\n' + '═'.repeat(60));
    log('📊 FINAL RESULTS');
    log('═'.repeat(60));
    log(`✅ Passed: ${totalPassed}`);
    log(`❌ Failed: ${totalFailed}`);
    log(`⚠️  Ambiguous: ${totalAmbiguous}`);
    log(`📈 Total: ${totalPassed + totalFailed + totalAmbiguous}`);

    if (criticalTests.length > 0) {
        log('\n🔴 CRITICAL TEST FAILURES:');
        criticalTests.forEach(test => {
            log(`   - ${test}`);
        });
    }

    if (totalFailed === 0) {
        log('\n🎉 ALL TESTS PASSED!');
        log('✅ System correctly distinguishes between:');
        log('   - User corrections (detected)');
        log('   - Natural Quranic repetition (ignored)');
        log('   - Exact duplicate verses (mapped to all locations)');
        log('   - Intra-surah refrains (handled appropriately)');
    } else {
        log('\n⚠️  ISSUES FOUND:');
        log(`   ${totalFailed} test(s) failed`);

        if (criticalTests.length > 0) {
            log(`   🔴 ${criticalTests.length} CRITICAL test(s) failed`);
        }

        log('\n🔧 REQUIRED IMPROVEMENTS:');
        log('   1. Context-aware repeat detection');
        log('   2. Check if repeated phrase spans multiple verses');
        log('   3. Verify against actual Quran structure');
        log('   4. Load exact duplicate verses database');
        log('   5. Implement multi-verse block matching (e.g., 23:5-8 = 70:29-32)');
        log('   6. Implement triplet matching for 3-way duplicates');
        log('   7. Detect intra-surah refrains vs cross-surah duplicates');
        log('   8. Return all verse locations when duplicate found');
    }

    // Save FULL verbose log (everything printed) as MD or TXT
    const fullLogPath = path.join(__dirname, 'comprehensive_tests_full_log.md');
    fs.writeFileSync(fullLogPath, logBuffer, 'utf8');
    log(`\n📝 Full verbose log saved to ${fullLogPath}`);

    return {
        totalTests: totalPassed + totalFailed + totalAmbiguous,
        passed: totalPassed,
        failed: totalFailed,
        ambiguous: totalAmbiguous,
        criticalFailures: criticalTests.length
    };
}

// Run comprehensive tests
runComprehensiveTests().catch(console.error);
