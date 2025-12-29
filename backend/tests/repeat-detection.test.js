/**
 * Comprehensive Repeat Detection Test Scenarios
 * Including natural Quranic repetition vs user corrections
 */

const path = require('path');
const RecitationAnalyzer = require('../services/recitationAnalyzer');
const quranService = require('../services/quranService');

async function runComprehensiveTests() {
    console.log('🧪 Comprehensive Repeat Detection Tests\n');
    console.log('═══════════════════════════════════════════════════════');

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
            transcript: 'وَيْلٌ يَوْمَئِذٍ لِّلْمُكَذِّبِينَ أَلَمْ نَخْلُقكُّم مِّن مَّاءٍ مَّهِينٍ وَيْلٌ يَوْمَئِذٍ لِّلْمُكَذِّبِينَ',
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
            transcript: 'فَبِأَيِّ آلَاءِ رَبِّكُمَا تُكَذِّبَانِ فَبِأَيِّ آلَاءِ رَبِّكُمَا تُكَذِّبَانِ فَبِأَيِّ آلَاءِ رَبِّكُمَا تُكَذِّبَانِ',
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
            reason: 'User repeated "مَا الْقَارِعَةُ" (verses 2) before continuing to verse 3'
        },
        {
            category: 'Complex Scenarios',
            name: 'Full verse repetition for practice',
            transcript: 'قُلْ هُوَ اللَّهُ أَحَدٌ قُلْ هُوَ اللَّهُ أَحَدٌ',
            expectedRepeats: 1,
            shouldDetect: true,
            reason: 'User repeated entire verse 1 of Al-Ikhlas for practice'
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

    // Run tests by category
    for (const [category, tests] of Object.entries(categories)) {
        console.log(`\n\n${'═'.repeat(60)}`);
        console.log(`📂 CATEGORY: ${category}`);
        console.log('═'.repeat(60));

        for (const test of tests) {
            console.log(`\n📝 Test: ${test.name}`);
            console.log(`   Transcript: "${test.transcript.substring(0, 80)}${test.transcript.length > 80 ? '...' : ''}"`);
            console.log(`   Expected: ${test.shouldDetect ? '✅ SHOULD detect repeat' : '❌ Should NOT detect repeat'}`);
            console.log(`   Reason: ${test.reason}`);

            try {
                const result = await analyzer.analyzeFull(test.transcript, { duration: 10000 });

                const repeatsDetected = result.repeats ? result.repeats.length : 0;

                console.log(`   Result: ${repeatsDetected} repeat(s) detected`);
                if (result.repeats && result.repeats.length > 0) {
                    result.repeats.forEach((repeat, idx) => {
                        console.log(`     ${idx + 1}. ${repeat.type}: "${repeat.words.join(' ')}"`);
                    });
                }

                // Evaluate
                if (test.expectedRepeats === 'TRICKY' || test.shouldDetect === 'UNCLEAR') {
                    console.log(`   ⚠️  AMBIGUOUS CASE - Manual review needed`);
                    totalAmbiguous++;
                } else if (test.shouldDetect) {
                    // Should detect
                    if (repeatsDetected > 0) {
                        console.log(`   ✅ PASS - Correctly detected user correction`);
                        totalPassed++;
                    } else {
                        console.log(`   ❌ FAIL - Missed user correction that should be detected`);
                        totalFailed++;
                    }
                } else {
                    // Should NOT detect
                    if (repeatsDetected === 0) {
                        console.log(`   ✅ PASS - Correctly ignored natural Quranic repetition`);
                        totalPassed++;
                    } else {
                        console.log(`   ❌ FAIL - Incorrectly flagged natural Quranic repetition as user error!`);
                        console.log(`   ⚠️  CRITICAL: This is natural Quran text, not a user mistake!`);
                        totalFailed++;
                    }
                }

            } catch (error) {
                console.log(`   ❌ ERROR: ${error.message}`);
                totalFailed++;
            }
        }
    }

    // Final summary
    console.log('\n\n' + '═'.repeat(60));
    console.log('📊 FINAL RESULTS');
    console.log('═'.repeat(60));
    console.log(`✅ Passed: ${totalPassed}`);
    console.log(`❌ Failed: ${totalFailed}`);
    console.log(`⚠️  Ambiguous: ${totalAmbiguous}`);
    console.log(`📈 Total: ${totalPassed + totalFailed + totalAmbiguous}`);

    if (totalFailed === 0) {
        console.log('\n🎉 ALL TESTS PASSED!');
        console.log('✅ System correctly distinguishes between:');
        console.log('   - User corrections (detected)');
        console.log('   - Natural Quranic repetition (ignored)');
    } else {
        console.log('\n⚠️  ISSUES FOUND:');
        console.log(`   ${totalFailed} test(s) failed`);
        console.log('\n🔧 REQUIRED IMPROVEMENTS:');
        console.log('   1. Context-aware repeat detection');
        console.log('   2. Check if repeated phrase spans multiple verses');
        console.log('   3. Verify against actual Quran structure');
    }
}

// Run comprehensive tests
runComprehensiveTests().catch(console.error);
