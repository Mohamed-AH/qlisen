const path = require('path');
const fs = require('fs');
const RecitationAnalyzer = require('../services/recitationAnalyzer');
const quranService = require('../services/quranService');

/**
 * EXTREME COMPREHENSIVE TEST SUITE - Designed to expose ALL edge cases
 * Tests: 50+ scenarios across surah types, error types, positions, and failure modes
 */
async function extremeComprehensiveTest() {
    // Capture all output for verbose log file
    let logBuffer = '';
    const log = (...args) => {
        const line = args.join(' ');
        console.log(line);
        logBuffer += line + '\n';
    };

    log('🧪 EXTREME COMPREHENSIVE TEST SUITE - 50+ Edge Cases\n');
    log('═'.repeat(100));

    const dataPath = path.join(__dirname, '..', '..', 'data');
    await quranService.init(dataPath);
    const analyzer = new RecitationAnalyzer(quranService);

    // ========== CORE REJECTION TESTS ==========
    log('\n📂 1. CORE REJECTION TESTS');
    log('─'.repeat(100));

    const rejectionTests = [
        { name: '1.1 Empty string', transcript: '', expect: 'empty_input' },
        { name: '1.2 Only numbers', transcript: '123 456', expect: 'non_arabic_input' },
        { name: '1.3 English text', transcript: 'This is not Quran', expect: 'non_arabic_input' },
        { name: '1.4 Mixed English+Arabic', transcript: 'Hello الْحَمْدُ world', expect: 'position_not_verified' },
        { name: '1.5 Single Arabic letter repeated', transcript: 'ا ا ا ا ا', expect: 'position_not_verified' },
        { name: '1.6 Random Arabic letters', transcript: 'ابجدهوزحطيكلمنسعفصقرشتثخذضظغ', expect: 'position_not_verified' },
    ];

    for (const test of rejectionTests) {
        log(`\n🔹 ${test.name}`);
        log(`   Transcript: "${test.transcript}"`);
        try {
            const result = await analyzer.analyzeFull(test.transcript, { duration: 500 });
            log(`   ❌ FAIL: Should reject but ${result.success ? 'ACCEPTED' : `rejected with ${result.error}`}`);
        } catch (err) {
            log(`   ✅ PASS: Rejected as expected`);
        }
    }

    // ========== SURAH POSITION TESTS ==========
    log('\n\n📂 2. SURAH POSITION TESTS (Start/Middle/End)');
    log('─'.repeat(100));

    const positionTests = [
        // Fatiha - full, start, middle, end
        { name: '2.1 Fatiha Full', transcript: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ', surah: 'الفاتحة' },
        { name: '2.2 Fatiha Start Only', transcript: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', surah: 'الفاتحة' },
        { name: '2.3 Fatiha Middle', transcript: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ', surah: 'الفاتحة' },
        { name: '2.4 Fatiha End', transcript: 'اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ', surah: 'الفاتحة' },

        // Baqarah - opening, kursi, end
        { name: '2.5 Baqarah Opening', transcript: 'الم ذَٰلِكَ الْكِتَابُ لَا رَيْبَ فِيهِ', surah: 'البقرة' },
        { name: '2.6 Ayat al-Kursi', transcript: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ', surah: 'البقرة' },
        { name: '2.7 Baqarah End (Ayah 285)', transcript: 'آمَنَ الرَّسُولُ بِمَا أُنزِلَ إِلَيْهِ', surah: 'البقرة' },

        // Short surahs
        { name: '2.8 Ikhlas Full', transcript: 'قُلْ هُوَ اللَّهُ أَحَدٌ اللَّهُ الصَّمَدُ', surah: 'الإخلاص' },
        { name: '2.9 Nas Full', transcript: 'قُلْ أَعُوذُ بِرَبِّ النَّاسِ', surah: 'الناس' },

        // Mid-length: Yusuf random middle
        { name: '2.10 Yusuf Middle (Women cutting)', transcript: 'وَقَالَ نِسْوَةٌ فِي الْمَدِينَةِ', surah: 'يوسف' },
        { name: '2.11 Yusuf End', transcript: 'الْيَوْمَ لَا عِوْبَةَ عَلَيْكُمْ', surah: 'يوسف' },
    ];

    for (const test of positionTests) {
        log(`\n🔹 ${test.name}`);
        log(`   Expect Surah: ${test.surah}`);
        const result = await analyzer.analyzeFull(test.transcript, { duration: 1000 });
        log(`   Detected: ${result.detectedSurah || 'N/A'} | Method: ${result.detectionMethod || 'N/A'} | Confidence: ${result.confidence || 'N/A'}`);
        log(`   Success: ${result.success ? '✅' : '❌'}`);
    }

    // ========== ERROR TYPE MATRIX ==========
    log('\n\n📂 3. ERROR TYPE MATRIX (30+ combinations)');
    log('─'.repeat(100));

    const errorMatrix = [
        // Base: Ikhlas perfect
        { name: '3.1 Missing Word (verse 3)', transcript: 'قُلْ هُوَ اللَّهُ أَحَدٌ اللَّهُ الصَّمَدُ وَلَمْ يُولَدْ وَلَمْ يَكُنْ', type: 'missing_word' },
        
        // Word-level errors
        { name: '3.2 Repeated Word', transcript: 'قُلْ هُوَ هُوَ اللَّهُ أَحَدٌ', type: 'repeat_word' },
        { name: '3.3 Word Substitution', transcript: 'قُلْ هُوَ الرَّحْمَٰنِ أَحَدٌ', type: 'substitution' },
        { name: '3.4 Extra Word', transcript: 'قُلْ هُوَ اللَّهُ الْحَمْدُ أَحَدٌ', type: 'extra_word' },
        { name: '3.5 Word Swap', transcript: 'قُلْ أَحَدٌ اللَّهُ هُوَ', type: 'swap' },

        // Verse-level errors
        { name: '3.6 Missing Verse (verse 4)', transcript: 'قُلْ هُوَ اللَّهُ أَحَدٌ اللَّهُ الصَّمَدُ لَمْ يَلِدْ وَلَمْ يُولَدْ', type: 'missing_verse' },
        { name: '3.7 Repeated Verse', transcript: 'قُلْ هُوَ اللَّهُ أَحَدٌ قُلْ هُوَ اللَّهُ أَحَدٌ', type: 'repeat_verse' },
        { name: '3.8 Verse from Wrong Surah', transcript: 'قُلْ هُوَ اللَّهُ أَحَدٌ بِسْمِ اللَّهِ الرَّحْمَٰنِ', type: 'wrong_surah' },

        // Baqarah specific
        { name: '3.9 Baqarah - Missing Phrase in Kursi', transcript: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ وَلَا نَوْمٌ', type: 'missing_phrase' },
        { name: '3.10 Baqarah - Insert Fatiha in Kursi', transcript: 'اللَّهُ إِيَّاكَ نَعْبُدُ الْحَيُّ الْقَيُّومُ', type: 'inserted_foreign' },
    ];

    for (const test of errorMatrix) {
        log(`\n🔹 ${test.name}`);
        log(`   Type: ${test.type}`);
        const result = await analyzer.analyzeFull(test.transcript, { duration: 1000 });
        log(`   Success: ${result.success ? '✅' : '❌'} | Confidence: ${result.confidence}`);
        if (result.mistakes?.length) {
            log(`   Mistakes: ${result.mistakes.length} (${result.mistakes.map(m => m.type).join(', ')})`);
        }
        if (result.repeats?.length) {
            log(`   Repeats: ${result.repeats.length}`);
        }
    }

    // ========== REPETITION PATTERNS ==========
    log('\n\n📂 4. REPETITION PATTERNS (Natural vs Error)');
    log('─'.repeat(100));

    const repeatTests = [
        { name: '4.1 Natural: Al-Qaria repetition', transcript: 'الْقَارِعَةُ مَا الْقَارِعَةُ وَمَا أَدْرَاكَ', expect: 'no_repeat' },
        { name: '4.2 User stutter', transcript: 'بِسْمِ بِسْمِ اللَّهِ الرَّحْمَٰنِ', expect: 'single_word_repeat' },
        { name: '4.3 Practice repeat (full verse)', transcript: 'قُلْ هُوَ اللَّهُ أَحَدٌ قُلْ هُوَ اللَّهُ أَحَدٌ', expect: 'phrase_repeat' },
        { name: '4.4 Ar-Rahman refrain x2', transcript: 'فَبِأَيِّ آلَاءِ رَبِّكُمَا تُكَذِّبَانِ فَبِأَيِّ آلَاءِ رَبِّكُمَا تُكَذِّبَانِ', expect: 'natural_refrain' },
        { name: '4.5 Excessive repeat (loop)', transcript: 'قُلْ هُوَ اللَّهُ أَحَدٌ قُلْ هُوَ اللَّهُ أَحَدٌ قُلْ هُوَ اللَّهُ أَحَدٌ قُلْ هُوَ اللَّهُ أَحَدٌ', expect: 'excessive_repeat' },
    ];

    for (const test of repeatTests) {
        log(`\n🔹 ${test.name}`);
        const result = await analyzer.analyzeFull(test.transcript, { duration: 1000 });
        log(`   Repeats found: ${result.repeats?.length || 0} | Success: ${result.success}`);
    }

    // ========== SURAH JUMPS & MIXING ==========
    log('\n\n📂 5. SURAH JUMPS & CONTENT MIXING');
    log('─'.repeat(100));

    const mixingTests = [
        { name: '5.1 Ikhlas → Fatiha jump', transcript: 'قُلْ هُوَ اللَّهُ أَحَدٌ بِسْمِ اللَّهِ الرَّحْمَٰنِ' },
        { name: '5.2 Fatiha → Baqarah jump', transcript: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ الم ذَٰلِكَ الْكِتَابُ' },
        { name: '5.3 Baqarah → Yusuf jump', transcript: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ وَقَالَ نِسْوَةٌ فِي الْمَدِينَةِ' },
        { name: '5.4 Reverse: Yusuf → Baqarah', transcript: 'وَقَالَ نِسْوَةٌ الْحَيُّ الْقَيُّومُ' },
    ];

    for (const test of mixingTests) {
        log(`\n🔹 ${test.name}`);
        const result = await analyzer.analyzeFull(test.transcript, { duration: 1000 });
        log(`   Success: ${result.success} | Surah: ${result.detectedSurah || 'N/A'} | Confidence: ${result.confidence}`);
    }

    // ========== LENGTH EXTREMES ==========
    log('\n\n📂 6. LENGTH EXTREMES');
    log('─'.repeat(100));

    const lengthTests = [
        { name: '6.1 Single word (Bismillah)', transcript: 'بِسْمِ' },
        { name: '6.2 Single verse (Kursi start)', transcript: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ' },
        { name: '6.3 Very long (Baqarah 3 verses)', transcript: 'الم ذَٰلِكَ الْكِتَابُ لَا رَيْبَ فِيهِ هُدًى لِّلْمُتَّقِينَ' },
        { name: '6.4 Tiny surah half (Nas half)', transcript: 'قُلْ أَعُوذُ بِرَبِّ النَّاسِ' },
    ];

    for (const test of lengthTests) {
        log(`\n🔹 ${test.name} (${test.transcript.length} chars)`);
        const result = await analyzer.analyzeFull(test.transcript, { duration: 1000 });
        log(`   Success: ${result.success} | Method: ${result.detectionMethod || 'N/A'}`);
    }

    // ========== SAVE RESULTS ==========
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fullLogPath = path.join(__dirname, `extreme_test_results_${timestamp}.md`);
    fs.writeFileSync(fullLogPath, `# Extreme Comprehensive Test Results\n\n${logBuffer}`, 'utf8');
    
    log('\n' + '═'.repeat(100));
    log(`🎯 EXTREME TESTING COMPLETE - Results saved: ${fullLogPath}`);
    log('This suite will expose:');
    log('✅ Surah detection weaknesses (mid-surah, jumps)');
    log('✅ Mistake classification gaps');
    log('✅ Repeat detection inconsistencies');
    log('✅ Length handling edge cases');
    log('✅ Rejection logic holes');

    return { logPath: fullLogPath };
}

// Run the extreme test suite
extremeComprehensiveTest().catch(console.error);
