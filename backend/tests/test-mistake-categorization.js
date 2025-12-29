const path = require('path');
const RecitationAnalyzer = require('../services/recitationAnalyzer');
const quranService = require('../services/quranService');

async function testMistakeCategorization() {
    console.log('🧪 Testing Mistake Categorization System\n');
    console.log('═'.repeat(60));

    const dataPath = path.join(__dirname, '..', '..', 'data');
    await quranService.init(dataPath);

    const analyzer = new RecitationAnalyzer(quranService);

    // Test scenarios with different types of mistakes
    const testCases = [
        {
            name: 'Perfect recitation - Al-Ikhlas',
            transcript: 'قُلْ هُوَ اللَّهُ أَحَدٌ اللَّهُ الصَّمَدُ',
            expected: {
                totalMistakes: 0,
                categories: {}
            }
        },
        {
            name: 'Minor pronunciation errors - Al-Ikhlas with extra character',
            transcript: 'قُلْ هُوَ اللَّهُك أَحَدٌ',
            expected: {
                hasCategory: 'pronunciation',
                description: 'Should detect insertion/pronunciation error'
            }
        },
        {
            name: 'Word order issue - Al-Ikhlas jumbled',
            transcript: 'قُلْ اللَّهُ هُوَ أَحَدٌ',
            expected: {
                hasCategory: 'word_order',
                description: 'Should detect word order issue'
            }
        },
        {
            name: 'Mixed mistakes - Multiple error types',
            transcript: 'قُلْ اللَّهُ هُوَ أَحَدٌ الصَّمَدُ لَمْ يَلِدْ',
            expected: {
                description: 'Should categorize different mistake types'
            }
        }
    ];

    for (const testCase of testCases) {
        console.log(`\n📝 Test: ${testCase.name}`);
        console.log('─'.repeat(60));

        try {
            const result = await analyzer.analyzeFull(testCase.transcript, { duration: 1000 });

            if (!result.success) {
                console.log('   ❌ Analysis failed:', result.error);
                continue;
            }

            console.log('\n📊 Mistake Summary:');
            if (result.mistakeSummary) {
                console.log(`   Total mistakes: ${result.mistakeSummary.total}`);

                console.log('\n   By Category:');
                for (const [category, data] of Object.entries(result.mistakeSummary.byCategory)) {
                    if (data.count > 0) {
                        console.log(`     ${category}: ${data.count} (${data.severity}) - ${data.description}`);
                    }
                }

                console.log('\n   By Severity:');
                for (const [severity, count] of Object.entries(result.mistakeSummary.bySeverity)) {
                    if (count > 0) {
                        console.log(`     ${severity}: ${count}`);
                    }
                }
            } else {
                console.log('   ⚠️  No mistakeSummary in result');
            }

            if (result.mistakesByCategory && Object.keys(result.mistakesByCategory).length > 0) {
                console.log('\n📋 Mistakes by Category:');
                for (const [category, mistakes] of Object.entries(result.mistakesByCategory)) {
                    console.log(`\n   ${category.toUpperCase()} (${mistakes.length}):`);
                    mistakes.forEach((m, idx) => {
                        console.log(`     ${idx + 1}. Verse ${m.ayah || 'N/A'}: ${m.message || m.suggestion || 'No message'}`);
                        if (m.type) console.log(`        Type: ${m.type}, Severity: ${m.severity || 'N/A'}`);
                    });
                }
            }

            // Verify expectations
            if (testCase.expected.totalMistakes !== undefined) {
                const matches = result.mistakeSummary.total === testCase.expected.totalMistakes;
                console.log(`\n   ${matches ? '✅' : '❌'} Expected ${testCase.expected.totalMistakes} mistakes, got ${result.mistakeSummary.total}`);
            }

            if (testCase.expected.hasCategory) {
                const hasCategory = result.mistakeSummary.byCategory[testCase.expected.hasCategory].count > 0;
                console.log(`\n   ${hasCategory ? '✅' : '❌'} Expected category: ${testCase.expected.hasCategory}`);
                console.log(`      ${testCase.expected.description}`);
            }

        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
            console.error(error.stack);
        }
    }

    console.log('\n' + '═'.repeat(60));
    console.log('✅ Mistake Categorization Test Complete\n');
}

// Run the test
testMistakeCategorization().catch(console.error);
