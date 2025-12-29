const path = require('path');
const RecitationAnalyzer = require('../services/recitationAnalyzer');
const quranService = require('../services/quranService');

async function testRepeatDetectionInReport() {
    console.log('🧪 Testing Repeat Detection in Final Report\n');
    console.log('═'.repeat(60));

    const dataPath = path.join(__dirname, '..', '..', 'data');
    await quranService.init(dataPath);

    const analyzer = new RecitationAnalyzer(quranService);

    // Test scenarios with different types of repeats
    const testCases = [
        {
            name: 'No repeats - Clean recitation',
            transcript: 'قُلْ هُوَ اللَّهُ أَحَدٌ',
            expected: {
                hasRepeats: false,
                totalRepeats: 0
            }
        },
        {
            name: 'Immediate repeat - User correction',
            transcript: 'القارعة القارعة ما القارعة',
            expected: {
                hasRepeats: true,
                description: 'User repeated "القارعة" for correction'
            }
        },
        {
            name: 'Multi-word repeat - Section practice',
            transcript: 'ما القارعة وما أدراك ما القارعة وما أدراك ما القارعة',
            expected: {
                hasRepeats: true,
                description: 'Repeated section for practice'
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

            // Check if repeat data is in the report
            console.log('\n📊 Repeat Detection in Report:');

            if (result.repeatSummary) {
                console.log(`   ✅ repeatSummary present`);
                console.log(`      Total repeats: ${result.repeatSummary.total}`);
                console.log(`      User corrections: ${result.repeatSummary.userCorrections}`);
                console.log(`      Natural Quranic repetition: ${result.repeatSummary.naturalQuranicRepetition}`);

                if (result.repeatSummary.byType) {
                    console.log(`\n      By Type:`);
                    for (const [type, count] of Object.entries(result.repeatSummary.byType)) {
                        if (count > 0) {
                            console.log(`        ${type}: ${count}`);
                        }
                    }
                }
            } else {
                console.log('   ⚠️  repeatSummary NOT present in report');
            }

            if (result.repeats !== undefined) {
                console.log(`\n   ✅ repeats array present (${result.repeats.length} items)`);

                if (result.repeats.length > 0) {
                    console.log('\n   Detected Repeats:');
                    result.repeats.forEach((repeat, idx) => {
                        console.log(`\n     ${idx + 1}. Type: ${repeat.type}`);
                        console.log(`        Words: "${repeat.words?.join(' ') || 'N/A'}"`);
                        console.log(`        Count: ${repeat.wordCount || repeat.count || 'N/A'}`);
                        if (repeat.feedback) {
                            console.log(`        Feedback: ${repeat.feedback}`);
                        }
                    });
                }
            } else {
                console.log('\n   ⚠️  repeats array NOT present in report');
            }

            // Verify expectations
            if (testCase.expected.hasRepeats !== undefined) {
                const hasRepeats = result.repeats && result.repeats.length > 0;
                const matches = hasRepeats === testCase.expected.hasRepeats;
                console.log(`\n   ${matches ? '✅' : '❌'} Expected hasRepeats: ${testCase.expected.hasRepeats}, got: ${hasRepeats}`);
            }

            if (testCase.expected.totalRepeats !== undefined) {
                const totalRepeats = result.repeatSummary?.total || 0;
                const matches = totalRepeats === testCase.expected.totalRepeats;
                console.log(`   ${matches ? '✅' : '❌'} Expected ${testCase.expected.totalRepeats} repeats, got ${totalRepeats}`);
            }

        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
            console.error(error.stack);
        }
    }

    console.log('\n' + '═'.repeat(60));
    console.log('✅ Repeat Detection Report Test Complete\n');
}

// Run the test
testRepeatDetectionInReport().catch(console.error);
