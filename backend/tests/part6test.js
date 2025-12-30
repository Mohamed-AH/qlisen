const path = require('path');
const fs = require('fs');
const RecitationAnalyzer = require('../services/recitationAnalyzer');
const quranService = require('../services/quranService');

/**
 * QURAN DUPLICATE & DOUBLET STRESS TEST (VERBOSE - 5+ VERSE CONTEXT)
 * Purpose: Verify if the search engine returns all occurrences of identical verses 
 * when provided with a long recitation buffer (5+ Ayahs).
 */
async function duplicateStressTest() {
    let logBuffer = '';
    const log = (...args) => {
        const line = args.join(' ');
        console.log(line);
        logBuffer += line + '\n';
    };

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportFileName = `duplicate_test_report_${timestamp}.md`;

    log(`🔥 QURAN DUPLICATE STRESS TEST (5+ VERSE CONTEXT)`);
    log(`📅 Date: ${new Date().toLocaleString()}`);
    log(`═`.repeat(120));

    const dataPath = path.join(__dirname, '..', '..', 'data');
    await quranService.init(dataPath);
    const analyzer = new RecitationAnalyzer(quranService);

    const doubletTests = [
        // 1. LONGEST EXACT DUPLICATE (23:1-11 vs 70:22-35)
        // Focus: 23:5-8 matches 70:29-32 exactly.
        { 
            category: 'LONG_DOUBLET', 
            expectedRefs: ['23:5-8', '70:29-32'],
            snippet: 'قَدْ أَفْلَحَ الْمُؤْمِنُونَ الَّذِينَ هُمْ فِي صَلَاتِهِمْ خَاشِعُونَ وَالَّذِينَ هُمْ عَنِ اللَّغْوِ مُعْرِضُونَ وَالَّذِينَ هُمْ لِلزَّكَاةِ فَاعِلُونَ وَالَّذِينَ هُمْ لِفُرُوجِهِمْ حَافِظُونَ إِلَّا عَلَىٰ أَزْوَاجِهِمْ أَوْ مَا مَلَكَتْ أَيْمَانُهُمْ فَإِنَّهُمْ غَيْرُ مَلُومِينَ فَمَنِ ابْتَغَىٰ وَرَاءَ ذَٰلِكَ فَأُولَٰئِكَ هُمُ الْعَادُونَ وَالَّذِينَ هُمْ لِأَمَانَاتِهِمْ وَعَهْدِهِمْ رَاعُونَ وَالَّذِينَ هُمْ عَلَىٰ صَلَوَاتِهِمْ يُحَافِظُونَ أُولَٰئِكَ هُمُ الْوَارِثُونَ الَّذِينَ يَرِثُونَ الْفِرْدَوْسَ هُمْ فِيهَا خَالِدُونَ' 
        },

        // 2. OPENING FORMULA (57:1-5 vs 59:1-5 vs 61:1-5)
        // Focus: The first verse is a triplet across three Surahs.
        { 
            category: 'TRIPLET_CONTEXT', 
            expectedRefs: ['57:1', '59:1', '61:1'],
            snippet: 'سَبَّحَ لِلَّهِ مَا فِي السَّمَاوَاتِ وَالْأَرْضِ وَهُوَ الْعَزِيزُ الْحَكِيمُ لَهُ مُلْكُ السَّمَاوَاتِ وَالْأَرْضِ يُحْيِي وَيُمِيتُ وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ هُوَ الْأَوَّلُ وَالْآخِرُ وَالظَّاهِرُ وَالْبَاطِنُ وَهُوَ بِكُلِّ شَيْءٍ عَلِيمٌ هُوَ الَّذِي خَلَقَ السَّمَاوَاتِ وَالْأَرْضَ فِي سِتَّةِ أَيَّامٍ ثُمَّ اسْتَوَىٰ عَلَى الْعَرْشِ يَعْلَمُ مَا يَلِجُ فِي الْأَرْضِ وَمَا يَخْرُجُ مِنْهَا' 
        },

        // 3. INTRA-SURAH DUPLICATE (2:130-136 vs 2:138-143)
        // Focus: 2:134 matches 2:141 word-for-word.
        { 
            category: 'INTRA_SURAH', 
            expectedRefs: ['2:134', '2:141'],
            snippet: 'أَمْ كُنتُمْ شُهَدَاءَ إِذْ حَضَرَ يَعْقُوبَ الْمَوْتُ إِذْ قَالَ لِبَنِيهِ مَا تَعْبُدُونَ مِن بَعْدِي قَالُوا نَعْبُدُ إِلَٰهَكَ وَإِلَٰهَ آبَائِكَ إِبْرَاهِيمَ وَإِسْمَاعِيلَ وَإِسْحَاقَ إِلَٰهًا وَاحِدًا وَنَحْنُ لَهُ مُسْلِمُونَ تِلْكَ أُمَّةٌ قَدْ خَلَتْ لَهَا مَا كَسَبَتْ وَلَكُم مَّا كَسَبْتُمْ وَلَا تُسْأَلُونَ عَمَّا كَانُوا يَعْمَلُونَ وَقَالُوا كُونُوا هُودًا أَوْ نَصَارَىٰ تَهْتَدُوا قُلْ بَلْ مِلَّةَ إِبْرَاهِيمَ حَنِيفًا' 
        },

        // 4. THE PROPHETIC WARNING (16:40-45 vs 21:5-10)
        // Focus: 16:43 matches 21:7 identically.
        { 
            category: 'CROSS_SURAH_5V', 
            expectedRefs: ['16:43', '21:7'],
            snippet: 'وَمَا أَرْسَلْنَا مِن قَبْلِكَ إِلَّا رِجَالًا نُّوحِي إِلَيْهِمْ فَاسْأَلُوا أَهْلَ الذِّكْرِ إِن كُنتُمْ لَا تَعْلَمُونَ بِالْبَيِّنَاتِ وَالزُّبُرِ وَأَنزَلْنَا إِلَيْكَ الذِّكْرَ لِتُبَيِّنَ لِلنَّاسِ مَا نُزِّلَ إِلَيْهِمْ وَلَعَلَّهُمْ يَتَفَكَّرُونَ أَفَأَمِنَ الَّذِينَ مَكَرُوا السَّيِّئَاتِ أَن يَخْسِفَ اللَّهُ بِهِمُ الْأَرْضَ أَوْ يَأْتِيَهُمُ الْعَذَابُ مِنْ حَيْثُ لَا يَشْعُرُونَ' 
        },

        // 5. THE MOCKERY OF MESSENGERS (6:7-12 vs 21:38-43)
        // Focus: 6:10 matches 21:41 identically.
        { 
            category: 'MOCKERY_DOUBLET', 
            expectedRefs: ['6:10', '21:41'],
            snippet: 'وَلَوْ جَعَلْنَاهُ مَلَكًا لَّجَعَلْنَاهُ رَجُلًا وَلَلَبَسْنَا عَلَيْهِم مَّا يَلْبِسُونَ وَلَقَدِ اسْتُهْزِئَ بِرُسُلٍ مِّن قَبْلِكَ فَحَاقَ بِالَّذِينَ سَخِرُوا مِنْهُم مَّا كَانُوا بِهِ يَسْتَهْزِئُونَ قُلْ سِيرُوا فِي الْأَرْضِ ثُمَّ انظُرُوا كَيْفَ كَانَ عَاقِبَةُ الْمُكَذِّبِينَ قُل لِّمَن مَّا فِي السَّمَاوَاتِ وَالْأَرْضِ قُل لِّلَّهِ' 
        },

        // 6. THE AR-RAHMAN REFRAIN (55:10-20)
        // Focus: The refrain appears twice in this 10-verse block.
        { 
            category: 'REFRAIN_FLOW', 
            expectedRefs: ['55:13', '55:16', '55:18'],
            snippet: 'وَالْأَرْضَ وَضَعَهَا لِلْأَنَامِ فِيهَا فَاكِهَةٌ وَالنَّخْلُ ذَاتُ الْأَكْمَامِ وَالْحَبُّ ذُو الْعَصْفِ وَالرَّيْحَانُ فَبِأَيِّ آلَاءِ رَبِّكُمَا تُكَذِّبَانِ خَلَقَ الْإِنسَانَ مِن صَلْصَالٍ كَالْفَخَّارِ وَخَلَقَ الْجَانَّ مِن مَّارِجٍ مِّن نَّارٍ فَبِأَيِّ آلَاءِ رَبِّكُمَا تُكَذِّبَانِ رَبُّ الْمَشْرِقَيْنِ وَرَبُّ الْمَغْرِبَيْنِ فَبِأَيِّ آلَاءِ رَبِّكُمَا تُكَذِّبَانِ' 
        }
    ];

    let passCount = 0;
    let tableRows = '';

    for (const test of doubletTests) {
        log(`\n🔍 TESTING [${test.category}]`);
        log(`   Snippet length: ${test.snippet.length} chars (~5-7 verses)`);
        
        const startTime = Date.now();
        // Increased duration for longer buffer processing
        const result = await analyzer.analyzeFull(test.snippet, { duration: 5000 });
        const duration = Date.now() - startTime;

        const matches = result.allMatches || (result.ref ? [result.ref] : []);
        
        // We check if the primary match or any found matches intersect with our duplicates
        const foundRelevant = test.expectedRefs.some(ref => matches.some(m => m.includes(ref)));
        const status = foundRelevant ? '✅ PASS' : '❌ FAIL';

        if (foundRelevant) passCount++;

        log(`   → Status: ${status}`);
        log(`   → Primary Match: ${result.ref}`);
        log(`   → Total Matches Identified: ${matches.length}`);
        log(`   → Locations: ${matches.slice(0, 5).join(', ')}${matches.length > 5 ? '...' : ''}`);
        log(`   → Confidence: ${result.confidence}`);

        tableRows += `| ${test.category} | ${test.expectedRefs.join(', ')} | ${result.ref || 'None'} | ${matches.length} | ${status} | ${duration}ms |\n`;
    }

    const reportHeader = `# Quranic Duplicate Context Test Report\n\n`;
    const summary = `## Summary\n- **Requirement:** 5+ Verse Context\n- **Tests Run:** ${doubletTests.length}\n- **Passed:** ${passCount}\n- **Date:** ${new Date().toISOString()}\n\n`;
    const tableHeader = `## Performance Metrics\n| Category | Targets | Primary Match | Match Count | Status | Time |\n|---|---|---|---|---|---|\n`;
    
    fs.writeFileSync(path.join(__dirname, reportFileName), reportHeader + summary + tableHeader + tableRows);
    
    log(`\n` + `=`.repeat(120));
    log(`📊 FINAL RESULT: ${passCount}/${doubletTests.length} PASSED`);
    log(`📄 Detailed verbose report saved to: ./${reportFileName}`);
}

duplicateStressTest().catch(console.error);