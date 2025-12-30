const path = require('path');
const RecitationAnalyzer = require('../services/recitationAnalyzer');
const quranService = require('../services/quranService');

/**
 * Quick test to measure improvement from our 3 fixes
 */
async function testImprovements() {
    console.log('🧪 QUICK IMPROVEMENT TEST - Before vs After Fixes\n');
    console.log('═'.repeat(80));

    const dataPath = path.join(__dirname, '..', '..', 'data');
    await quranService.init(dataPath);
    const analyzer = new RecitationAnalyzer(quranService);

    // Tests that were FAILING before fixes (from stress test & juz30)
    const previouslyFailingTests = [
        // DENSITY tests (failed due to low n-gram scores)
        { name: 'An-Naziat 1-10', text: 'وَالنَّازِعَاتِ غَرْقًا وَالنَّاشِطَاتِ نَشْطًا وَالسَّابِحَاتِ سَبْحًا فَالسَّابِقَاتِ سَبْقًا فَالْمُدَبِّرَاتِ أَمْرًا يَوْمَ تَرْجُفُ الرَّاجِفَةُ تَتْبَعُهَا الرَّادِفَةُ قُلُوبٌ يَوْمَئِذٍ وَاجِفَةٌ أَبْصَارُهَا خَاشِعَةٌ يَقُولُونَ أَإِنَّا لَمَرْدُودُونَ فِي الْحَافِرَةِ' },
        { name: 'Al-Mursalat 1-10', text: 'وَالْمُرْسَلَاتِ عُرْفًا فَالْعَاصِفَاتِ عَصْفًا وَالنَّاشِرَاتِ نَشْرًا فَالْفَارِقَاتِ فَرْقًا فَالْمُلْقِيَاتِ ذِكْرًا عُذْرًا أَوْ نُذْرًا إِنَّمَا تُوعَدُونَ لَوَاقِعٌ فَإِذَا النُّجُومُ طُمِسَتْ وَإِذَا السَّمَاءُ فُرِجَتْ وَإِذَا الْجِبَالُ نُسِفَتْ' },
        { name: 'As-Saffat 1-10', text: 'وَالصَّافَّاتِ صَفًّا فَالزَّاجِرَاتِ زَجْرًا فَالتَّالِيَاتِ ذِكْرًا إِنَّ إِلَٰهَكُمْ لَوَاحِدٌ رَّبُّ السَّمَاوَاتِ وَالْأَرْضِ وَمَا بَيْنَهُمَا وَرَبُّ الْمَشَارِقِ إِنَّا زَيَّنَّا السَّمَاءَ الدُّنْيَا بِزِينَةٍ الْكَوَاكِبِ وَحِفْظًا مِّن كُلِّ شَيْطَانٍ مَّارِدٍ' },

        // COMMON_PHRASES tests (failed due to low n-gram scores)
        { name: 'Al-Imran 102-104', text: 'يَا أَيُّهَا الَّذِينَ آمَنُوا اتَّقُوا اللَّهَ حَقَّ تُقَاتِهِ وَلَا تَمُوتُنَّ إِلَّا وَأَنتُم مُّسْلِمُونَ وَاعْتَصِمُوا بِحَبْلِ اللَّهِ جَمِيعًا وَلَا تَفَرَّقُوا وَاذْكُرُوا نِعْمَتَ اللَّهِ عَلَيْكُمْ إِذْ كُنتُمْ أَعْدَاءً فَأَلَّفَ بَيْنَ قُلُوبِكُمْ فَأَصْبَحْتُم بِنِعْمَتِهِ إِخْوَانًا' },
        { name: 'Al-Imran 190-192', text: 'إِنَّ فِي خَلْقِ السَّمَاوَاتِ وَالْأَرْضِ وَاخْتِلَافِ اللَّيْلِ وَالنَّهَارِ لَآيَاتٍ لِّأُولِي الْأَلْبَابِ الَّذِينَ يَذْكُرُونَ اللَّهَ قِيَامًا وَقُعُودًا وَعَلَىٰ جُنُوبِهِمْ وَيَتَفَكَّرُونَ فِي خَلْقِ السَّمَاوَاتِ وَالْأَرْضِ' },
        { name: 'Al-Baqarah 172-173', text: 'يَا أَيُّهَا الَّذِينَ آمَنُوا كُلُوا مِن طَيِّبَاتِ مَا رَزَقْنَاكُمْ وَاشْكُرُوا لِلَّهِ إِن كُنتُمْ إِيَّاهُ تَعْبُدُونَ إِنَّمَا حَرَّمَ عَلَيْكُمُ الْمَيْتَةَ وَالدَّمَ وَلَحْمَ الْخِنزِيرِ وَمَا أُهِلَّ بِهِ لِغَيْرِ اللَّهِ فَمَنِ اضْطُرَّ غَيْرَ بَاغٍ وَلَا عَادٍ فَلَا إِثْمَ عَلَيْهِ إِنَّ اللَّهَ غَفُورٌ رَّحِيمٌ' },

        // Extended recitation tests (failed due to strict ratio)
        { name: 'Fatiha Full (7 verses)', text: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ الرَّحْمَٰنِ الرَّحِيمِ مَالِكِ يَوْمِ الدِّينِ إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ' },
        { name: 'Ikhlas Full (4 verses)', text: 'قُلْ هُوَ اللَّهُ أَحَدٌ اللَّهُ الصَّمَدُ لَمْ يَلِدْ وَلَمْ يُولَدْ وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ' },
        { name: 'Nas Full (6 verses)', text: 'قُلْ أَعُوذُ بِرَبِّ النَّاسِ مَلِكِ النَّاسِ إِلَٰهِ النَّاسِ مِن شَرِّ الْوَسْوَاسِ الْخَنَّاسِ الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ مِنَ الْجِنَّةِ وَالنَّاسِ' },
    ];

    let passCount = 0;
    let failCount = 0;

    for (const test of previouslyFailingTests) {
        const result = await analyzer.analyzeFull(test.text, { duration: 1000 });

        const status = result.success ? '✅ PASS' : '❌ FAIL';
        const method = result.detectionMethod || 'none';
        const confidence = result.confidence || 'none';

        console.log(`${status} | ${test.name.padEnd(35)} | ${method.padEnd(20)} | ${confidence}`);

        if (result.success) passCount++;
        else failCount++;
    }

    const total = passCount + failCount;
    const passRate = (passCount / total * 100).toFixed(1);

    console.log('\n' + '═'.repeat(80));
    console.log(`📊 RESULTS: ${passCount}/${total} passing (${passRate}%)`);
    console.log('═'.repeat(80));
    console.log('\n🎯 EXPECTED IMPROVEMENT:');
    console.log('   Before fixes: ~40% pass rate');
    console.log(`   After fixes:  ${passRate}% pass rate`);
    console.log(`   Gain: +${(parseFloat(passRate) - 40).toFixed(1)}%`);
}

testImprovements().catch(console.error);
