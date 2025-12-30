const path = require('path');
const RecitationAnalyzer = require('../services/recitationAnalyzer');
const quranService = require('../services/quranService');

/**
 * Diagnose why mid-surah passages are failing n-gram detection
 */
async function diagnoseMidSurahFailures() {
    console.log('🔬 MID-SURAH N-GRAM FAILURE DIAGNOSTIC\n');
    console.log('═'.repeat(80));

    const dataPath = path.join(__dirname, '..', '..', 'data');
    await quranService.init(dataPath);
    const analyzer = new RecitationAnalyzer(quranService);

    // The 11 failing mid-surah tests from stress test
    const failingTests = [
        { name: 'An-Nur 31', expectedSurah: 'النور', expectedId: 24, text: 'وَلَا يُبْدِينَ زِينَتَهُنَّ إِلَّا لِبُعُولَتِهِنَّ أَوْ آبَائِهِنَّ أَوْ آبَاءِ بُعُولَتِهِنَّ أَوْ أَبْنَائِهِنَّ أَوْ أَبْنَاءِ بُعُولَتِهِنَّ أَوْ إِخْوَانِهِنَّ أَوْ بَنِي إِخْوَانِهِنَّ أَوْ بَنِي أَخَوَاتِهِنَّ أَوْ نِسَائِهِنَّ أَوْ مَا مَلَكَتْ أَيْمَانُهُنَّ أَوِ التَّابِعِينَ غَيْرِ أُولِي الْإِرْبَةِ مِنَ الرِّجَالِ أَوِ الطِّفْلِ الَّذِينَ لَمْ يَظْهَرُوا عَلَىٰ عَوْرَاتِ النِّسَاءِ' },
        { name: 'Al-Imran 102-104', expectedSurah: 'آل عمران', expectedId: 3, text: 'يَا أَيُّهَا الَّذِينَ آمَنُوا اتَّقُوا اللَّهَ حَقَّ تُقَاتِهِ وَلَا تَمُوتُنَّ إِلَّا وَأَنتُم مُّسْلِمُونَ وَاعْتَصِمُوا بِحَبْلِ اللَّهِ جَمِيعًا وَلَا تَفَرَّقُوا وَاذْكُرُوا نِعْمَتَ اللَّهِ عَلَيْكُمْ إِذْ كُنتُمْ أَعْدَاءً فَأَلَّفَ بَيْنَ قُلُوبِكُمْ فَأَصْبَحْتُم بِنِعْمَتِهِ إِخْوَانًا' },
        { name: 'An-Nisa 11-12', expectedSurah: 'النساء', expectedId: 4, text: 'يُوصِيكُمُ اللَّهُ فِي أَوْلَادِكُمْ لِلذَّكَرِ مِثْلُ حَظِّ الْأُنثَيَيْنِ فَإِن كُنَّ نِسَاءً فَوْقَ اثْنَتَيْنِ فَلَهُنَّ ثُلُثَا مَا تَرَكَ وَإِن كَانَتْ وَاحِدَةً فَلَهَا النِّصْفُ وَلِأَبَوَيْهِ لِكُلِّ وَاحِدٍ مِّنْهُمَا السُّدُسُ مِمَّا تَرَكَ إِن كَانَ لَهُ وَلَدٌ فَإِن لَّمْ يَكُن لَّهُ وَلَدٌ وَوَرِثَهُ أَبَوَاهُ فَلِأُمِّهِ الثُّلُثُ' },
        { name: 'Al-Baqarah 282 (start)', expectedSurah: 'البقرة', expectedId: 2, text: 'يَا أَيُّهَا الَّذِينَ آمَنُوا إِذَا تَدَايَنتُم بِدَيْنٍ إِلَىٰ أَجَلٍ مُّسَمًّى فَاكْتُبُوهُ وَلْيَكْتُب بَّيْنَكُمْ كَاتِبٌ بِالْعَدْلِ وَلَا يَأْبَ كَاتِبٌ أَن يَكْتُبَ كَمَا عَلَّمَهُ اللَّهُ فَلْيَكْتُبْ وَلْيُمْلِلِ الَّذِي عَلَيْهِ الْحَقُّ وَلْيَتَّقِ اللَّهَ رَبَّهُ وَلَا يَبْخَسْ مِنْهُ شَيْئًا' },
        { name: 'Al-Imran 190-192', expectedSurah: 'آل عمران', expectedId: 3, text: 'إِنَّ فِي خَلْقِ السَّمَاوَاتِ وَالْأَرْضِ وَاخْتِلَافِ اللَّيْلِ وَالنَّهَارِ لَآيَاتٍ لِّأُولِي الْأَلْبَابِ الَّذِينَ يَذْكُرُونَ اللَّهَ قِيَامًا وَقُعُودًا وَعَلَىٰ جُنُوبِهِمْ وَيَتَفَكَّرُونَ فِي خَلْقِ السَّمَاوَاتِ وَالْأَرْضِ' },
        { name: 'Al-Anam 151', expectedSurah: 'الأنعام', expectedId: 6, text: 'قُلْ تَعَالَوْا أَتْلُ مَا حَرَّمَ رَبُّكُمْ عَلَيْكُمْ أَلَّا تُشْرِكُوا بِهِ شَيْئًا وَبِالْوَالِدَيْنِ إِحْسَانًا وَلَا تَقْتُلُوا أَوْلَادَكُم مِّنْ إِمْلَاقٍ نَّحْنُ نَرْزُقُكُمْ وَإِيَّاهُمْ وَلَا تَقْرَبُوا الْفَوَاحِشَ مَا ظَهَرَ مِنْهَا وَمَا بَطَنَ' },
        { name: 'Ar-Rum 21-23', expectedSurah: 'الروم', expectedId: 30, text: 'وَمِنْ آيَاتِهِ أَنْ خَلَقَ لَكُم مِّنْ أَنفُسِكُمْ أَزْوَاجًا لِّتَسْكُنُوا إِلَيْهَا وَجَعَلَ بَيْنَكُم مَّوَدَّةً وَرَحْمَةً إِنَّ فِي ذَٰلِكَ لآيَاتٍ لِّقَوْمٍ يَتَفَكَّرُونَ وَمِنْ آيَاتِهِ خَلْقُ السَّمَاوَاتِ وَالْأَرْضِ' },
        { name: 'Al-Baqarah 282 (middle)', expectedSurah: 'البقرة', expectedId: 2, text: 'وَلَا تَسْأَمُوا أَن تَكْتُبُوهُ صَغِيرًا أَوْ كَبِيرًا إِلَىٰ أَجَلِهِ ذَٰلِكُمْ أَقْسَطُ عِندَ اللَّهِ وَأَقْوَمُ لِلشَّهَادَةِ وَأَدْنَىٰ أَلَّا تَرْتَابُوا إِلَّا أَن تَكُونَ تِجَارَةً حَاضِرَةً تُدِيرُونَهَا بَيْنَكُمْ فَلَيْسَ عَلَيْكُمْ جُنَاحٌ أَلَّا تَكْتُبُوهَا' },
        { name: 'Al-Maidah 3', expectedSurah: 'المائدة', expectedId: 5, text: 'حُرِّمَتْ عَلَيْكُمُ الْمَيْتَةُ وَالدَّمُ وَلَحْمُ الْخِنزِيرِ وَمَا أُهِلَّ لِغَيْرِ اللَّهِ بِهِ وَالْمُنْخَنِقَةُ وَالْمَوْقُوذَةُ وَالْمُتَرَدِّيَةُ وَالنَّطِيحَةُ وَمَا أَكَلَ السَّبُعُ إِلَّا مَا ذَكَّيْتُمْ وَمَا ذُبِحَ عَلَى النُّصُبِ وَأَن تَسْتَقْسِمُوا بِالْأَزْلَامِ' },
        { name: 'Al-Buruj 12-16', expectedSurah: 'البروج', expectedId: 85, text: 'إِنَّ بَطْشَ رَبِّكَ لَشَدِيدٌ إِنَّهُ هُوَ يُبْدِئُ وَيُعِيدُ وَهُوَ الْغَفُورُ الْوَدُودُ ذُو الْعَرْشِ الْمَجِيدُ فَعَّالٌ لِّمَا يُرِيدُ هَلْ أَتَاكَ حَدِيثُ الْجُنُودِ' },
        { name: 'Al-Fath 29', expectedSurah: 'الفتح', expectedId: 48, text: 'مُّحَمَّدٌ رَّسُولُ اللَّهِ وَالَّذِينَ مَعَهُ أَشِدَّاءُ عَلَى الْكُفَّارِ رُحَمَاءُ بَيْنَهُمْ تَرَاهُمْ رُكَّعًا سُجَّدًا يَبْتَغُونَ فَضْلًا مِّنَ اللَّهِ وَرِضْوَانًا سِيمَاهُمْ فِي وُجُوهِهِم مِّنْ أَثَرِ السُّجُودِ' }
    ];

    let passCount = 0;
    let detectedButFailedVerification = 0;
    let ngramTooLow = 0;

    for (const test of failingTests) {
        console.log(`\n${'─'.repeat(80)}`);
        console.log(`📝 TEST: ${test.name}`);
        console.log(`   Expected: ${test.expectedSurah} (ID: ${test.expectedId})`);
        console.log(`─'.repeat(80)\n`);

        const result = await analyzer.analyzeFull(test.text, { duration: 1000 });

        const status = result.success ? '✅ PASS' : '❌ FAIL';
        console.log(`\n${status} | Method: ${result.detectionMethod || 'none'} | Confidence: ${result.confidence || 'none'}`);

        if (result.success) {
            passCount++;
            console.log(`   ✅ Now working after improvements!`);
        } else {
            // Analyze why it failed
            if (result.error === 'position_not_verified') {
                detectedButFailedVerification++;
                console.log(`   🔍 N-gram detected surah but failed verification`);
            } else if (result.error === 'no_matching_surahs') {
                ngramTooLow++;
                console.log(`   📉 N-gram scores too low (all < 5%)`);
            }

            if (result.candidateInfo) {
                console.log(`\n   📋 Best Candidate: ${result.candidateInfo.surah}`);
                const isCorrect = result.candidateInfo.surah === test.expectedSurah;
                console.log(`      Correct surah detected: ${isCorrect ? '✅ YES' : '❌ NO'}`);
            }

            if (result.verificationScores) {
                console.log(`\n   🔍 Verification Failed:`);
                console.log(`      Sequential: ${(result.verificationScores.sequential * 100).toFixed(1)}%`);
                console.log(`      Coverage: ${(result.verificationScores.coverage * 100).toFixed(1)}%`);
                console.log(`      Ratio: ${result.verificationScores.countRatio?.toFixed(2) || 'N/A'}`);
            }
        }
    }

    console.log('\n' + '═'.repeat(80));
    console.log(`📊 DIAGNOSTIC RESULTS: ${passCount}/11 now passing`);
    console.log('═'.repeat(80));
    console.log(`\n📈 FAILURE BREAKDOWN:`);
    console.log(`   ✅ Now passing: ${passCount}`);
    console.log(`   🔍 Detected but failed verification: ${detectedButFailedVerification}`);
    console.log(`   📉 N-gram too low (< 5%): ${ngramTooLow}`);
    console.log(`   ❌ Other failures: ${11 - passCount - detectedButFailedVerification - ngramTooLow}`);

    console.log(`\n🎯 ROOT CAUSES:`);
    if (detectedButFailedVerification > 0) {
        console.log(`   - ${detectedButFailedVerification} tests: N-gram finds correct surah but verification too strict`);
    }
    if (ngramTooLow > 0) {
        console.log(`   - ${ngramTooLow} tests: N-gram scores too low (distinctiveness problem)`);
    }
}

diagnoseMidSurahFailures().catch(console.error);
