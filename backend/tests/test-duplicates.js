const path = require('path');
const RecitationAnalyzer = require('../services/recitationAnalyzer');
const quranService = require('../services/quranService');

/**
 * DUPLICATE DETECTION TEST SUITE
 *
 * Tests the duplicate registry system to ensure:
 * 1. Duplicates WITHOUT context return REQUIRE_CHOICE
 * 2. Duplicates WITH context auto-resolve correctly
 * 3. Non-duplicates pass through normally
 */

async function testDuplicates() {
    console.log('🔍 DUPLICATE DETECTION TEST SUITE\n');
    console.log('═'.repeat(80));

    const dataPath = path.join(__dirname, '..', '..', 'data');
    await quranService.init(dataPath);
    const analyzer = new RecitationAnalyzer(quranService);

    const tests = [
        // TEST 1: Exact duplicate, no context (should REQUIRE_CHOICE)
        {
            id: 1,
            category: 'EXACT_DUPLICATE_NO_CONTEXT',
            description: '2:134 vs 2:141 - Exact duplicate without surrounding context',
            snippet: 'تلك امه قد خلت ۖ لها ما كسبت ولكم ما كسبتم ۖ ولا تسٔلون عما كانوا۟ يعملون',
            expectedStatus: 'REQUIRE_CHOICE',
            expectedOptions: 2,
            possibleRefs: ['2:134', '2:141']
        },

        // TEST 2: Duplicate WITH context (should auto-resolve)
        {
            id: 2,
            category: 'DUPLICATE_WITH_CONTEXT',
            description: '2:134 with verse 133 before it - Should auto-resolve to 2:134',
            snippet: 'ام كنتم شهدآ اذ حضر يعقوب الموت اذ قال لبنيه ما تعبدون منۢ بعدي قالوا۟ نعبد الهك واله ابآيك ابرهۧم واسمعيل واسحق الها وحدا ونحن لهۥ مسلمون تلك امه قد خلت ۖ لها ما كسبت ولكم ما كسبتم ۖ ولا تسٔلون عما كانوا۟ يعملون',
            expectedStatus: 'SUCCESS',
            expectedMethod: 'duplicate_auto_resolved',
            expectedRef: '2:134'
        },

        // TEST 3: Intra-surah duplicate (2:47 vs 2:122)
        {
            id: 3,
            category: 'INTRA_SURAH_DUPLICATE',
            description: '2:47 vs 2:122 - Same surah, different verses',
            snippet: 'يبنيٓ اسرٓيل اذكروا۟ نعمتي التيٓ انعمت عليكم واني فضلتكم علي العلمين',
            expectedStatus: 'REQUIRE_CHOICE',
            expectedOptions: 2,
            possibleRefs: ['2:47', '2:122']
        },

        // TEST 4: Cross-surah duplicate (9:73 vs 66:9)
        {
            id: 4,
            category: 'CROSS_SURAH_DUPLICATE',
            description: '9:73 vs 66:9 - Different surahs',
            snippet: 'يٓايها النبي جهد الكفار والمنفقين واغلظ عليهم ۚ وماويهم جهنم ۖ وبيس المصير',
            expectedStatus: 'REQUIRE_CHOICE',
            expectedOptions: 2,
            possibleRefs: ['9:73', '66:9']
        },

        // TEST 5: Multi-verse duplicate (23:6-8 vs 70:30-32)
        {
            id: 5,
            category: 'MULTI_VERSE_DUPLICATE',
            description: '23:6-8 vs 70:30-32 - Multi-verse sequence',
            snippet: 'الا عليٓ ازوجهم او ما ملكت ايمنهم فانهم غير ملومين فمن ابتغي ورآ ذلك فاو۟لٓيك هم العادون والذين هم لامنتهم وعهدهم رعون',
            expectedStatus: 'REQUIRE_CHOICE',
            expectedOptions: 2,
            possibleRefs: ['23:6-8', '70:30-32']
        },

        // TEST 6: Non-duplicate (should pass through normally)
        {
            id: 6,
            category: 'NON_DUPLICATE',
            description: '2:255 (Ayat Al-Kursi) - Not a duplicate',
            snippet: 'الله لآ اله الا هو الحي القيوم ۚ لا تاخذهۥ سنه ولا نوم ۚ لهۥ ما في السموت وما في الارض',
            expectedStatus: 'SUCCESS',
            expectedMethod: 'fast_path_verified',  // Should detect via fast-path
            expectedRef: '2:255'
        }
    ];

    let passCount = 0;
    const results = [];

    for (const test of tests) {
        console.log(`\n🔍 TEST ${test.id}: ${test.description}`);
        console.log('─'.repeat(80));

        const startTime = Date.now();
        const result = await analyzer.analyzeFull(test.snippet, { duration: 3000 });
        const duration = Date.now() - startTime;

        console.log(`   Duration: ${duration}ms`);

        let passed = false;
        let reason = '';

        if (test.expectedStatus === 'REQUIRE_CHOICE') {
            // Test expects REQUIRE_CHOICE response
            if (result.status === 'REQUIRE_CHOICE') {
                if (result.options && result.options.length === test.expectedOptions) {
                    passed = true;
                    reason = `✅ REQUIRE_CHOICE with ${result.options.length} options`;
                    console.log(`   ${reason}`);
                    console.log(`   Options: ${result.options.map(o => o.ref).join(', ')}`);
                } else {
                    reason = `❌ Expected ${test.expectedOptions} options, got ${result.options?.length || 0}`;
                    console.log(`   ${reason}`);
                }
            } else {
                reason = `❌ Expected REQUIRE_CHOICE, got ${result.success ? 'SUCCESS' : 'FAIL'}`;
                console.log(`   ${reason}`);
                if (result.surah) {
                    console.log(`   Detected: ${result.surah.name} ${result.verseRange?.startVerse}-${result.verseRange?.endVerse}`);
                }
            }
        } else if (test.expectedStatus === 'SUCCESS') {
            // Test expects successful detection
            if (result.success && result.summary && result.summary.verseRange && result.summary.primarySurah) {
                // Extract surah ID from summary
                const surahId = result.summary.primarySurah.id;
                const verseStart = result.summary.verseRange.start;
                const detectedRef = `${surahId}:${verseStart}`;
                const methodMatch = !test.expectedMethod || result.detectionMethod === test.expectedMethod;

                if (test.expectedRef && detectedRef.startsWith(test.expectedRef) && methodMatch) {
                    passed = true;
                    reason = `✅ Detected ${detectedRef} via ${result.detectionMethod}`;
                    console.log(`   ${reason}`);
                } else if (!test.expectedRef && methodMatch) {
                    passed = true;
                    reason = `✅ Success via ${result.detectionMethod}`;
                    console.log(`   ${reason}`);
                } else {
                    reason = `❌ Expected ${test.expectedRef} via ${test.expectedMethod}, got ${detectedRef} via ${result.detectionMethod}`;
                    console.log(`   ${reason}`);
                }
            } else if (result.success) {
                reason = `❌ Success but missing summary.verseRange data`;
                console.log(`   ${reason}`);
                console.log(`   Has summary: ${!!result.summary}, has verseRange: ${!!result.summary?.verseRange}`);
            } else {
                reason = `❌ Expected SUCCESS, got ${result.error}`;
                console.log(`   ${reason}`);
            }
        }

        if (passed) passCount++;

        results.push({
            id: test.id,
            category: test.category,
            passed,
            reason,
            duration
        });
    }

    console.log('\n' + '═'.repeat(80));
    console.log(`📊 DUPLICATE TEST RESULTS: ${passCount}/${tests.length} PASSED`);
    console.log('═'.repeat(80));

    results.forEach(r => {
        const icon = r.passed ? '✅' : '❌';
        console.log(`${icon} Test ${r.id} [${r.category}]: ${r.reason} (${r.duration}ms)`);
    });

    console.log('═'.repeat(80));

    return {
        total: tests.length,
        passed: passCount,
        failed: tests.length - passCount,
        successRate: (passCount / tests.length * 100).toFixed(1) + '%'
    };
}

// Run tests
testDuplicates()
    .then(summary => {
        console.log(`\n📊 FINAL SUMMARY:`);
        console.log(`   Total: ${summary.total}`);
        console.log(`   Passed: ${summary.passed}`);
        console.log(`   Failed: ${summary.failed}`);
        console.log(`   Success Rate: ${summary.successRate}`);

        process.exit(summary.failed > 0 ? 1 : 0);
    })
    .catch(error => {
        console.error('❌ Test suite failed:', error);
        process.exit(1);
    });
