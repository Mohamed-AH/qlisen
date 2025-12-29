/**
 * Test: Word Order Jumbled/Mixed Up Within a Verse
 * Tests if the system can detect when words within a verse are in the wrong order
 */

const path = require('path');
const RecitationAnalyzer = require('../services/recitationAnalyzer');
const quranService = require('../services/quranService');

async function testJumbledWordOrder() {
    console.log('🧪 Testing Jumbled Word Order Detection\n');
    console.log('═══════════════════════════════════════════════════════');

    const dataPath = path.join(__dirname, '..', '..', 'data');
    await quranService.init(dataPath);
    const analyzer = new RecitationAnalyzer(quranService);

    const testScenarios = [
        {
            name: 'Correct order - Al-Ikhlas verse 1',
            transcript: 'قُلْ هُوَ اللَّهُ أَحَدٌ',
            correctOrder: true,
            expectedVerse: 'قل هو الله احد',
            reason: 'Baseline - words in correct order'
        },
        {
            name: 'Jumbled - Al-Ikhlas verse 1 (reversed)',
            transcript: 'أَحَدٌ اللَّهُ هُوَ قُلْ',
            correctOrder: false,
            expectedVerse: 'قل هو الله احد',
            reason: 'All words present but completely reversed order'
        },
        {
            name: 'Jumbled - Al-Ikhlas verse 1 (middle swapped)',
            transcript: 'قُلْ اللَّهُ هُوَ أَحَدٌ',
            correctOrder: false,
            expectedVerse: 'قل هو الله احد',
            reason: 'Words "هو" and "الله" swapped'
        },
        {
            name: 'Correct order - Al-Fatihah verse 2',
            transcript: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ',
            correctOrder: true,
            expectedVerse: 'الحمد لله رب العالمين',
            reason: 'Baseline - words in correct order'
        },
        {
            name: 'Jumbled - Al-Fatihah verse 2 (partial swap)',
            transcript: 'الْحَمْدُ رَبِّ لِلَّهِ الْعَالَمِينَ',
            correctOrder: false,
            expectedVerse: 'الحمد لله رب العالمين',
            reason: 'Words "لله" and "رب" swapped'
        },
        {
            name: 'Jumbled - Al-Fatihah verse 2 (completely mixed)',
            transcript: 'رَبِّ الْعَالَمِينَ الْحَمْدُ لِلَّهِ',
            correctOrder: false,
            expectedVerse: 'الحمد لله رب العالمين',
            reason: 'First half and second half swapped'
        },
        {
            name: 'Correct order - Al-Asr complete',
            transcript: 'وَالْعَصْرِ إِنَّ الْإِنسَانَ لَفِي خُسْرٍ إِلَّا الَّذِينَ آمَنُوا وَعَمِلُوا الصَّالِحَاتِ',
            correctOrder: true,
            expectedVerse: 'والعصر ان الانسان لفي خسر الا الذين امنوا وعملوا الصلحت',
            reason: 'Multiple verses in correct order'
        },
        {
            name: 'Jumbled - Al-Asr with word swap',
            transcript: 'وَالْعَصْرِ الْإِنسَانَ إِنَّ لَفِي خُسْرٍ',
            correctOrder: false,
            expectedVerse: 'والعصر ان الانسان لفي خسر',
            reason: 'Words "إن" and "الإنسان" swapped in verse 2'
        }
    ];

    console.log('\n📝 Running Tests...\n');

    for (const test of testScenarios) {
        console.log('─'.repeat(60));
        console.log(`\n🔍 Test: ${test.name}`);
        console.log(`   Transcript: "${test.transcript}"`);
        console.log(`   Expected: ${test.correctOrder ? '✅ Should work normally' : '⚠️  Should detect issues with jumbled order'}`);
        console.log(`   Reason: ${test.reason}\n`);

        try {
            const result = await analyzer.analyzeFull(test.transcript, { duration: 10000 });

            console.log(`\n📊 Analysis Result:`);
            console.log(`   Success: ${result.success ? '✅' : '❌'}`);

            if (result.success) {
                console.log(`   Surah: ${result.primarySurah.name}`);
                console.log(`   Verses: ${result.verseRange.startVerse}-${result.verseRange.endVerse}`);
                console.log(`   Overall Accuracy: ${(result.overallAccuracy * 100).toFixed(1)}%`);

                // Show verse details
                if (result.verses && result.verses.length > 0) {
                    console.log(`\n   📖 Verse Analysis:`);
                    result.verses.forEach(verse => {
                        console.log(`      Verse ${verse.ayah}: ${(verse.accuracy * 100).toFixed(1)}% accuracy`);
                        console.log(`         Matched: ${verse.matched}/${verse.totalWords} words`);
                        if (verse.mistakes && verse.mistakes.length > 0) {
                            console.log(`         Mistakes: ${verse.mistakes.length}`);
                            verse.mistakes.slice(0, 3).forEach(m => {
                                console.log(`            - ${m.type}: ${m.message || m.expected}`);
                            });
                        }
                    });
                }

                // Overall assessment
                console.log(`\n   💡 Assessment:`);
                if (test.correctOrder) {
                    if (result.overallAccuracy >= 0.90) {
                        console.log(`      ✅ PASS - Correctly identified with high accuracy`);
                    } else {
                        console.log(`      ⚠️  WARNING - Accuracy lower than expected for correct order (${(result.overallAccuracy * 100).toFixed(1)}%)`);
                    }
                } else {
                    // Jumbled words
                    if (result.overallAccuracy < 0.70) {
                        console.log(`      ✅ DETECTED - Low accuracy (${(result.overallAccuracy * 100).toFixed(1)}%) indicates word order issues`);
                    } else if (result.overallAccuracy < 0.90) {
                        console.log(`      ⚠️  PARTIAL - Medium accuracy (${(result.overallAccuracy * 100).toFixed(1)}%) - some issues detected`);
                    } else {
                        console.log(`      ❌ MISSED - High accuracy (${(result.overallAccuracy * 100).toFixed(1)}%) despite jumbled words`);
                        console.log(`         System may not be detecting word order issues properly`);
                    }
                }

            } else {
                console.log(`   Error: ${result.error}`);
                console.log(`   Message: ${result.message}`);

                if (!test.correctOrder) {
                    console.log(`\n   💡 Assessment:`);
                    console.log(`      ⚠️  Failed to analyze jumbled words - may need better error handling`);
                }
            }

        } catch (error) {
            console.log(`\n   ❌ ERROR: ${error.message}`);
        }

        console.log('');
    }

    console.log('\n' + '═'.repeat(60));
    console.log('📋 SUMMARY');
    console.log('═'.repeat(60));
    console.log(`
This test checks how the system handles word order issues within verses.

Expected Behavior:
1. ✅ Correct order → High accuracy (>90%)
2. ⚠️  Jumbled order → Lower accuracy (<70%) due to word mismatches
3. 📊 System should detect issues through alignment accuracy

Current Implementation:
- Word-by-word alignment uses SEQUENTIAL matching
- Jumbled words will cause misalignment → lower accuracy
- System doesn't explicitly detect "word order" issues
- Instead, it reports mismatched words which is correct behavior

Limitations:
- No explicit "word order error" message
- Users see "wrong word" errors instead of "words out of order"
- This is acceptable for now, but could be enhanced in Priority 1.2

Future Enhancement (Priority 1.2 - Misaligned Words):
- Detect when all words are present but in wrong positions
- Generate message: "All words correct, but word order is wrong"
- Check for permutations when accuracy is low but all words exist
`);
}

testJumbledWordOrder().catch(console.error);
