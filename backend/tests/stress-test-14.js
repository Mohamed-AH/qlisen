const path = require('path');
const fs = require('fs');
const RecitationAnalyzer = require('../services/recitationAnalyzer');
const quranService = require('../services/quranService');

/**
 * QURAN STRESS TEST - HIGH DIFFICULTY PASSAGES
 * Designed to challenge n-gram collisions and detect hardcoded logic.
 */
async function quranStressTest() {
    let logBuffer = '';
    const log = (...args) => {
        const line = args.join(' ');
        console.log(line);
        logBuffer += line + '\n';
    };

    log('🔥 QURAN STRESS TEST: HIGH-DIFFICULTY & LONG PASSAGES\n');
    log('═'.repeat(120));

    const dataPath = path.join(__dirname, '..', '..', 'data');
    await quranService.init(dataPath);
    const analyzer = new RecitationAnalyzer(quranService);

    const hardTests = [
        // CATEGORY: REPETITIVE LISTS
        { category: 'REPETITIVE', ref: 'Al-Ahzab 35', snippet: 'إِنَّ الْمُسْلِمِينَ وَالْمُسْلِمَاتِ وَالْمُؤْمِنِينَ وَالْمُؤْمِنَاتِ وَالْقَانِتِينَ وَالْقَانِتَاتِ وَالصَّادِقِينَ وَالصَّادِقَاتِ وَالصَّابِرِينَ وَالصَّابِرَاتِ وَالْخَاشِعِينَ وَالْخَاشِعَاتِ وَالْمُتَصَدِّقِينَ وَالْمُتَصَدِّقَاتِ وَالصَّائِمِينَ وَالصَّائِمَاتِ وَالْحَافِظِينَ فُرُوجَهُمْ وَالْحَافِظَاتِ وَالذَّاكِرِينَ اللَّهَ كَثِيرًا وَالذَّاكِرَاتِ أَعَدَّ اللَّهُ لَهُم مَّغْفِرَةً وَأَجْرًا عَظِيمًا' },
        { category: 'REPETITIVE', ref: 'An-Nur 31', snippet: 'وَلَا يُبْدِينَ زِينَتَهُنَّ إِلَّا لِبُعُولَتِهِنَّ أَوْ آبَائِهِنَّ أَوْ آبَاءِ بُعُولَتِهِنَّ أَوْ أَبْنَائِهِنَّ أَوْ أَبْنَاءِ بُعُولَتِهِنَّ أَوْ إِخْوَانِهِنَّ أَوْ بَنِي إِخْوَانِهِنَّ أَوْ بَنِي أَخَواتِهِنَّ أَوْ نِسَائِهِنَّ أَوْ مَا مَلَكَتْ أَيْمَانُهُنَّ' },

        // CATEGORY: HARDCODE_TEST (6 Continuous Ayahs for Sequence Precision)
        { category: 'HARDCODE_TEST', ref: 'Ya-Sin 20-25', snippet: 'وَجَاءَ مِنْ أَقْصَى الْمَدِينَةِ رَجُلٌ يَسْعَىٰ قَالَ يَا قَوْمِ اتَّبِعُوا الْمُرْسَلِينَ اتَّبِعُوا مَن لَّا يَسْأَلُكُمْ أَجْرًا وَهُم مُّهْتَدُونَ وَمَا لِيَ لَا أَعْبُدُ الَّذِي فَطَرَنِي وَإِلَيْهِ تُرْجَعُونَ أَأَتَّخِذُ مِن دُونِهِ آلِهَةً إِن يُرِدْنِ الرَّحْمَٰنُ بِضُرٍّ لَّا تُغْنِ عَنِّي شَفَاعَتُهُمْ شَيْئًا وَلَا يُنقِذُونِ إِنِّي إِذًا لَّفِي ضَلَالٍ مُّبِينٍ إِنِّي آمَنتُ بِرَبِّكُمْ فَاسْمَعُونِ' },
        { category: 'HARDCODE_TEST', ref: 'Al-Inshiqaq 1-10', snippet: 'إِذَا السَّمَاءُ انشَقَّتْ وَأَذِنَتْ لِرَبِّهَا وَحُقَّتْ وَإِذَا الْأَرْضُ مُدَّتْ وَأَلْقَتْ مَا فِيهَا وَتَخَلَّتْ وَأَذِنَتْ لِرَبِّهَا وَحُقَّتْ يَا أَيُّهَا الْإِنسَانُ إِنَّكَ كَادِحٌ إِلَىٰ رَبِّكَ كَدْحًا فَمُلَاقِيهِ فَأَمَّا مَنْ أُوتِيَ كِتَابَهُ بِيَمِينِهِ فَسَوْفَ يُحَاسَبُ حِسَابًا يَسِيرًا وَيَنقَلِبُ إِلَىٰ أَهْلِهِ مَسْرُورًا' },
        { category: 'HARDCODE_TEST', ref: 'Al-Baqarah 67-73', snippet: 'وَإِذْ قَالَ مُوسَىٰ لِقَوْمِهِ إِنَّ اللَّهَ يَأْمُرُكُمْ أَن تَذْبَحُوا بَقَرَةً قَالُوا أَتَتَّخِذُنَا هُزُوًا قَالَ أَعُوذُ بِاللَّهِ أَنْ أَكُونَ مِنَ الْجَاهِلِينَ قَالُوا ادْعُ لَنَا رَبَّكَ يُبَيِّن لَّنَا مَا هِيَ قَالَ إِنَّهُ يَقُولُ إِنَّهَا بَقَرَةٌ لَّا فَارِضٌ وَلَا بِكْرٌ عَوَانٌ بَيْنَ ذَٰلِكَ فَافْعَلُوا مَا تُؤْمَرُونَ' },
        { category: 'HARDCODE_TEST', ref: 'Ash-Shuara 10-16', snippet: 'وَإِذْ نَادَىٰ رَبُّكَ مُوسَىٰ أَنِ ائْتِ الْقَوْمَ الظَّالِمِينَ قَوْمَ فِرْعَوْنَ أَلَا يَتَّقُونَ قَالَ رَبِّ إِنِّي أَخَافُ أَن يُكَذِّبُونِ وَيَضِيقُ صَدْرِي وَلَا يَنطَلِقُ لِسَانِي فَأَرْسِلْ إِلَىٰ هَارُونَ وَلَهُمْ عَلَيَّ ذَنبٌ فَأَخَافُ أَن يَقْتُلُونِ قَالَ كَلَّا فَاذْهَبَا بِآيَاتِنَا إِنَّا مَعَكُم مُّسْتَمِعُونَ' },
        { category: 'HARDCODE_TEST', ref: 'Al-Muminun 1-11', snippet: 'قَدْ أَفْلَحَ الْمُؤْمِنُونَ الَّذِينَ هُمْ فِي صَلَاتِهِمْ خَاشِعُونَ وَالَّذِينَ هُمْ عَنِ اللَّغْوِ مُعْرِضُونَ وَالَّذِينَ هُمْ لِلزَّكَاةِ فَاعِلُونَ وَالَّذِينَ هُمْ لِفُرُوجِهِمْ حَافِظُونَ إِلَّا عَلَىٰ أَزْواجِهِمْ أَوْ مَا مَلَكَتْ أَيْمَانُهُمْ فَإِنَّهُمْ غَيْرُ مَلُومِينَ' },
        { category: 'HARDCODE_TEST', ref: 'Al-Maidah 10-15', snippet: 'وَالَّذِينَ كَفَرُوا وَكَذَّبُوا بِآيَاتِنَا أُولَٰئِكَ أَصْحَابُ الْجَحِيمِ يَا أَيُّهَا الَّذِينَ آمَنُوا اذْكُرُوا نِعْمَتَ اللَّهِ عَلَيْكُمْ إِذْ هَمَّ قَوْمٌ أَن يَبْسُطُوا إِلَيْكُمْ أَيْدِيَهُمْ فَكَفَّ أَيْدِيَهُمْ عَنكُمْ وَاتَّقُوا اللَّهَ' },

        // CATEGORY: PREPOSITION_TRAP
        { category: 'PREPOSITION', ref: 'Al-Baqarah 126', snippet: 'وَإِذْ قَالَ إِبْرَاهِيمُ رَبِّ اجْعَلْ هَٰذَا بَلَدًا آمِنًا وَارْزُقْ أَهْلَهُ مِنَ الثَّمَرَاتِ مَنْ آمَنَ مِنْهُم بِاللَّهِ وَالْيَوْمِ الْآخِرِ' },
        { category: 'PREPOSITION', ref: 'Ibrahim 35', snippet: 'وَإِذْ قَالَ إِبْرَاهِيمُ رَبِّ اجْعَلْ هَٰذَا الْبَلَدَ آمِنًا وَاجْنُبْنِي وَبَنِيَّ أَن نَّكُونَ أَوَّلَ مَنْ أَلْقَى' },

        // CATEGORY: MID_VERSE_ANCHOR
        { category: 'MID_VERSE', ref: 'An-Nahl 68-69', snippet: 'وَأَوْحَىٰ رَبُّكَ إِلَى النَّحْلِ أَنِ اتَّخِذِي مِنَ الْجِبَالِ بُيُوتًا وَمِنَ الشَّجَرِ وَمِمَّا يَعْرِشُونَ ثُمَّ كُلِي مِن كُلِّ الثَّمَرَاتِ فَاسْلُكِي سُبُلَ رَبِّكِ ذُلُلًا' },

        // CATEGORY: STORY_OVERLAP
        { category: 'STORY_OVERLAP', ref: 'Saad 71-76', snippet: 'إِذْ قَالَ رَبُّكَ لِلْمَلَائِكَةِ إِنِّي خَالِقٌ بَشَرًا مِّن طِينٍ فَإِذَا سَوَّيْتُهُ وَنَفَخْتُ فِيهِ مِن رُّوحِي فقعُوا لَهُ سَاجِدِينَ فَسَجَدَ الْمَلَائِكَةُ كُلُّهُمْ أَجْمَعُونَ إِلَّا إِبْلِيسَ' },

        // CATEGORY: ATTRIBUTE CHAINS
        { category: 'ATTRIBUTES', ref: 'Al-Hadid 1-3', snippet: 'سَبَّحَ لِلَّهِ مَا فِي السَّمَاوَاتِ وَالْأَرْضِ وَهُوَ الْعَزِيزُ الْحَكِيمُ لَهُ مُلْكُ السَّمَاوَاتِ وَالْأَرْضِ يُحْيِي وَيُمِيتُ وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ هُوَ الْأَوَّلُ وَالْآخِرُ' },
        { category: 'ATTRIBUTES', ref: 'Al-Buruj 12-16', snippet: 'إِنَّ بَطْشَ رَبِّكَ لَشَدِيدٌ إِنَّهُ هُوَ يُبْدِئُ وَيُعِيدُ وَهُوَ الْغَفُورُ الْوَدُودُ ذُو الْعَرْشِ الْمَجِيدُ فَعَّالٌ لِّمَا يُرِيدُ' }
    ];

    let passCount = 0;

    for (const test of hardTests) {
        log(`\n🔍 TESTING [${test.category}]: ${test.ref}`);
        log('─'.repeat(100));
        log(`   TEXT: "${test.snippet.substring(0, 100)}..."`);

        const startTime = Date.now();
        const result = await analyzer.analyzeFull(test.snippet, { duration: 3000 });
        const duration = Date.now() - startTime;

        log(`   → Result: ${result.success ? '✅' : '❌'}`);
        log(`   → Confidence: ${result.confidence}`);
        log(`   → Duration: ${duration}ms`);
        log(`   → Method: ${result.detectionMethod || 'N/A'}`);

        if (result.success) passCount++;
        else {
            log(`   ❗ DEBUG: Failed to match ${test.ref}. Method: ${result.detectionMethod}`);
        }
    }

    log('\n' + '='.repeat(120));
    log(`📊 STRESS TEST FINAL: ${passCount}/${hardTests.length} SUCCESSFUL`);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    fs.writeFileSync(path.join(__dirname, `stress_test_${timestamp}.md`), logBuffer);

    return { successRate: (passCount / hardTests.length) * 100 };
}

quranStressTest().catch(console.error);
