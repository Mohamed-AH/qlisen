const path = require('path');
const RecitationAnalyzer = require('../services/recitationAnalyzer');
const quranService = require('../services/quranService');

/**
 * Diagnose N-Gram Detection Issues
 * Test with perfect Quranic text that should work but fails
 */
async function diagnoseNgram() {
    console.log('🔬 N-GRAM DETECTION DIAGNOSTIC\n');
    console.log('═'.repeat(80));

    const dataPath = path.join(__dirname, '..', '..', 'data');
    await quranService.init(dataPath);

    const analyzer = new RecitationAnalyzer(quranService);

    // Test cases that SHOULD work but are FAILING
    const failingTests = [
        {
            name: 'An-Naziat 1-10 (DENSITY)',
            text: 'وَالنَّازِعَاتِ غَرْقًا وَالنَّاشِطَاتِ نَشْطًا وَالسَّابِحَاتِ سَبْحًا فَالسَّابِقَاتِ سَبْقًا فَالْمُدَبِّرَاتِ أَمْرًا يَوْمَ تَرْجُفُ الرَّاجِفَةُ تَتْبَعُهَا الرَّادِفَةُ قُلُوبٌ يَوْمَئِذٍ وَاجِفَةٌ أَبْصَارُهَا خَاشِعَةٌ يَقُولُونَ أَإِنَّا لَمَرْدُودُونَ فِي الْحَافِرَةِ',
            expectedSurah: 'النازعات',
            expectedId: 79
        },
        {
            name: 'Al-Imran 102-104 (COMMON_PHRASES)',
            text: 'يَا أَيُّهَا الَّذِينَ آمَنُوا اتَّقُوا اللَّهَ حَقَّ تُقَاتِهِ وَلَا تَمُوتُنَّ إِلَّا وَأَنتُم مُّسْلِمُونَ وَاعْتَصِمُوا بِحَبْلِ اللَّهِ جَمِيعًا وَلَا تَفَرَّقُوا وَاذْكُرُوا نِعْمَتَ اللَّهِ عَلَيْكُمْ إِذْ كُنتُمْ أَعْدَاءً فَأَلَّفَ بَيْنَ قُلُوبِكُمْ فَأَصْبَحْتُم بِنِعْمَتِهِ إِخْوَانًا',
            expectedSurah: 'آل عمران',
            expectedId: 3
        },
        {
            name: 'Al-Baqarah 282 (LEGALISTIC)',
            text: 'يَا أَيُّهَا الَّذِينَ آمَنُوا إِذَا تَدَايَنتُم بِدَيْنٍ إِلَىٰ أَجَلٍ مُّسَمًّى فَاكْتُبُوهُ وَلْيَكْتُب بَّيْنَكُمْ كَاتِبٌ بِالْعَدْلِ وَلَا يَأْبَ كَاتِبٌ أَن يَكْتُبَ كَمَا عَلَّمَهُ اللَّهُ فَلْيَكْتُبْ وَلْيُمْلِلِ الَّذِي عَلَيْهِ الْحَقُّ وَلْيَتَّقِ اللَّهَ رَبَّهُ وَلَا يَبْخَسْ مِنْهُ شَيْئًا',
            expectedSurah: 'البقرة',
            expectedId: 2
        },
        {
            name: 'Short verse - Juz 2',
            text: 'وَمَا أَدْرَاكَ مَا الْعَقْبَةُ',
            expectedSurah: 'البلد',
            expectedId: 90
        }
    ];

    for (const test of failingTests) {
        console.log(`\n${'─'.repeat(80)}`);
        console.log(`📝 TEST: ${test.name}`);
        console.log(`   Expected: ${test.expectedSurah} (ID: ${test.expectedId})`);
        console.log(`   Text length: ${test.text.length} chars`);
        console.log(`${'─'.repeat(80)}\n`);

        const result = await analyzer.analyzeFull(test.text, { duration: 1000 });

        console.log(`\n📊 RESULT:`);
        console.log(`   Success: ${result.success ? '✅' : '❌'}`);
        console.log(`   Confidence: ${result.confidence || 'N/A'}`);
        console.log(`   Method: ${result.detectionMethod || 'N/A'}`);

        if (result.success) {
            console.log(`   Detected Surah: ${result.detectedSurah || 'N/A'}`);
            const correct = result.surahId === test.expectedId;
            console.log(`   Correct: ${correct ? '✅' : '❌ WRONG'}`);
        } else {
            console.log(`   Error: ${result.error || 'Unknown'}`);
            console.log(`   Message: ${result.message || 'N/A'}`);
        }

        // Check if this was the expected surah
        if (result.candidateInfo) {
            console.log(`\n   📋 Candidate Info:`);
            console.log(`      Method: ${result.candidateInfo.method}`);
            console.log(`      Surah: ${result.candidateInfo.surah}`);
            console.log(`      Verses: ${result.candidateInfo.verses}`);
        }

        if (result.verificationScores) {
            console.log(`\n   🔍 Verification Scores:`);
            console.log(`      Sequential: ${(result.verificationScores.sequential * 100).toFixed(1)}%`);
            console.log(`      Coverage: ${(result.verificationScores.coverage * 100).toFixed(1)}%`);
            console.log(`      Ratio: ${result.verificationScores.countRatio?.toFixed(2) || 'N/A'}`);
        }

        if (result.rejectionReason) {
            console.log(`\n   ❌ Rejection Reason: ${result.rejectionReason}`);
        }

        console.log('');
    }

    console.log('\n' + '═'.repeat(80));
    console.log('🔬 Diagnostic Complete');
    console.log('═'.repeat(80));
}

diagnoseNgram().catch(console.error);
