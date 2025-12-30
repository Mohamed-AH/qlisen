const path = require('path');
const fs = require('fs');
const RecitationAnalyzer = require('../services/recitationAnalyzer');
const quranService = require('../services/quranService');

/**
 * 30 JUZZ COMPREHENSIVE COVERAGE TEST
 * One test per Juzz (1-30) + error variants = 120 tests
 */
async function juzCoverageTest() {
    let logBuffer = '';
    const log = (...args) => {
        const line = args.join(' ');
        console.log(line);
        logBuffer += line + '\n';
    };

    log('🧪 30 JUZZ COMPREHENSIVE COVERAGE TEST (120 Tests)\n');
    log('═'.repeat(120));

    const dataPath = path.join(__dirname, '..', '..', 'data');
    await quranService.init(dataPath);
    const analyzer = new RecitationAnalyzer(quranService);

    const juzTests = [
        // JUZ 1-10
        { juz: 1, surah: 'الفاتحة', snippet: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ' },
        { juz: 2, surah: 'البقرة', snippet: 'وَمَا أَدْرَاكَ مَا الْعَقْبَةُ' },
        { juz: 3, surah: 'آل عمران', snippet: 'قُلْ هُوَ اللَّهُ أَحَدٌ' },
        { juz: 4, surah: 'النساء', snippet: 'يَا أَيُّهَا النَّاسُ اتَّقُوا رَبَّكُمُ' },
        { juz: 5, surah: 'النساء', snippet: 'وَالْمُطَلَّقَاتُ يَتَرَبَّصْنَ بِأَنْفُسِهِنَّ' },
        { juz: 6, surah: 'المائدة', snippet: 'يَا أَيُّهَا الَّذِينَ آمَنُواْ' },
        { juz: 7, surah: 'الأنعام', snippet: 'وَمَا خَلَقْتُ الْجِنَّ وَالْإِنسَ' },
        { juz: 8, surah: 'الأعراف', snippet: 'وَلَقَدْ أَرْسَلْنَا نُوحًا إِلَىٰ قَوْمِهِ' },
        { juz: 9, surah: 'التوبة', snippet: 'بَرَاءَةٌ مِنَ اللَّهِ وَرَسُلِهِ' },
        { juz: 10, surah: 'هود', snippet: 'وَإِذْ قَالَ مُوسَىٰ لِقَوْمِهِ' },

        // JUZ 11-20
        { juz: 11, surah: 'يوسف', snippet: 'وَقَالَ نِسْوَةٌ فِي الْمَدِينَةِ' },
        { juz: 12, surah: 'الرعد', snippet: 'وَهُوَ الَّذِي مَدَّ الْأَرْضَ' },
        { juz: 13, surah: 'النحل', snippet: 'وَأَوْحَيْنَا إِلَىٰ مُوسَىٰ أَنْ' },
        { juz: 14, surah: 'الكهف', snippet: 'أَمْ حَسِبْتَ أَنَّ أَصْحَابَ الْكَهْفِ' },
        { juz: 15, surah: 'طه', snippet: 'طَهَ مَا أَنْزَلْنَا عَلَيْكَ الْقُرْآنَ' },
        { juz: 16, surah: 'الفرقان', snippet: 'فَبِأَيِّ آلَاءِ رَبِّكُمَا تُكَذِّبَانِ' },
        { juz: 17, surah: 'النمل', snippet: 'وَيْلٌ يَوْمَئِذٍ لِلْمُكَذِّبِينَ' },
        { juz: 18, surah: 'الروم', snippet: 'الْحَمْدُ لِلَّهِ الَّذِي خَلَقَ السَّمَاوَاتِ' },
        { juz: 19, surah: 'سبأ', snippet: 'وَلَقَدْ كَتَبْنَا فِي الزَّبُورِ' },
        { juz: 20, surah: 'يس', snippet: 'يَسِينَ وَالْقُرْآنِ الْحَكِيمِ' },

        // JUZ 21-30
        { juz: 21, surah: 'غافر', snippet: 'سَبَّحَ لِلَّهِ مَا فِي السَّمَاوَاتِ' },
        { juz: 22, surah: 'فصلت', snippet: 'وَمَا أَرْسَلْنَا قَبْلَكَ إِلَّا رِجَالًا' },
        { juz: 23, surah: 'الدخان', snippet: 'حَمْ وَالْكِتَابِ الْمُبِينِ' },
        { juz: 24, surah: 'الحاقة', snippet: 'الْحَاقَّةُ مَا الْحَاقَّةُ' },
        { juz: 25, surah: 'الحجرات', snippet: 'يَا أَيُّهَا الَّذِينَ آمَنُوا لَا تَقْدَمُوا' },
        { juz: 26, surah: 'المعارج', snippet: 'اسْتَفْتَحُوا فَتَوَلَّى الْمُسْتَفْتِحُونَ' },
        { juz: 27, surah: 'الملك', snippet: 'تَبَرَكَ الَّذِي بِيَدِهِ الْمُلْكُ' },
        { juz: 28, surah: 'النبأ', snippet: 'عَمَّ يَتَسَاءَلُونَ عَنِ النَّبَإِ الْعَظِيمِ' },
        { juz: 29, surah: 'الغاشية', snippet: 'هَلْ أَتَاكَ حَدِيثُ الْغَاشِيَةِ' },
        { juz: 30, surah: 'الإنشراح', snippet: 'أَلَمْ نَشْرَحْ لَكَ صَدْرَكَ' },
    ];

    let passCount = 0;
    let failCount = 0;
    let coverageReport = [];

    for (let i = 0; i < juzTests.length; i++) {
        const test = juzTests[i];
        const juzNum = String(test.juz).padStart(2, '0'); // FIXED: Convert to string first
        
        log(`\n📂 JUZZ ${juzNum}: ${test.surah}`);
        log('─'.repeat(80));

        // 1. CORRECT SNIPPET
        log(`\n🔹 1. Correct: "${test.snippet.substring(0, 60)}${test.snippet.length > 60 ? '...' : ''}"`);
        const correctResult = await analyzer.analyzeFull(test.snippet, { duration: 1500 });
        log(`   Success: ${correctResult.success ? '✅' : '❌'} | Confidence: ${correctResult.confidence}`);
        log(`   Method: ${correctResult.detectionMethod || 'N/A'} | Surah: ${correctResult.detectedSurah || 'N/A'}`);
        coverageReport.push({ juz: test.juz, type: 'correct', success: correctResult.success });

        // 2. MISSING WORD (remove 2nd word)
        const words = test.snippet.trim().split(/\s+/);
        const missingWord = words.slice(1).join(' '); // Remove first word
        log(`\n🔹 2. Missing Word: "${missingWord.substring(0, 60)}${missingWord.length > 60 ? '...' : ''}"`);
        const missingResult = await analyzer.analyzeFull(missingWord, { duration: 1000 });
        log(`   Success: ${missingResult.success ? '✅' : '❌'} | Mistakes: ${missingResult.mistakes?.length || 0}`);
        coverageReport.push({ juz: test.juz, type: 'missing_word', success: missingResult.success });

        // 3. REPEATED WORD (repeat 1st word)
        const repeatedWord = `${words[0]} ${words[0]} ${words.slice(1).join(' ')}`;
        log(`\n🔹 3. Repeated Word: "${repeatedWord.substring(0, 60)}${repeatedWord.length > 60 ? '...' : ''}"`);
        const repeatResult = await analyzer.analyzeFull(repeatedWord, { duration: 1000 });
        log(`   Success: ${repeatResult.success ? '✅' : '❌'} | Repeats: ${repeatResult.repeats?.length || 0}`);
        coverageReport.push({ juz: test.juz, type: 'repeated_word', success: repeatResult.success });

        // 4. SURAH JUMP (Fatiha inserted)
        const surahJump = `بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ ${test.snippet}`;
        log(`\n🔹 4. Surah Jump (Fatiha): "${surahJump.substring(0, 60)}${surahJump.length > 60 ? '...' : ''}"`);
        const jumpResult = await analyzer.analyzeFull(surahJump, { duration: 1000 });
        log(`   Success: ${jumpResult.success ? '✅' : '❌'} | Surah: ${jumpResult.detectedSurah || 'N/A'}`);
        coverageReport.push({ juz: test.juz, type: 'surah_jump', success: jumpResult.success });

        // Count results
        passCount += [correctResult, missingResult, repeatResult, jumpResult].filter(r => r.success).length;
        failCount += [correctResult, missingResult, repeatResult, jumpResult].filter(r => !r.success).length;
    }

    // SUMMARY
    log('\n' + '═'.repeat(120));
    log('📊 30 JUZZ COVERAGE SUMMARY');
    log('═'.repeat(120));
    log(`✅ PASSED: ${passCount}/${passCount + failCount} (${((passCount / (passCount + failCount)) * 100).toFixed(1)}%)`);
    log(`❌ FAILED: ${failCount}/${passCount + failCount}`);
    
    const typeStats = coverageReport.reduce((acc, test) => {
        acc[test.type] = (acc[test.type] || 0) + (test.success ? 1 : 0);
        return acc;
    }, {});
    
    log('\n📈 BREAKDOWN BY TEST TYPE:');
    Object.entries(typeStats).forEach(([type, passed]) => {
        const total = coverageReport.filter(t => t.type === type).length;
        log(`   ${type.padEnd(15)}: ${passed}/${total} (${((passed/total)*100).toFixed(0)}%)`);
    });

    // SAVE RESULTS
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fullLogPath = path.join(__dirname, `juz30_coverage_${timestamp}.md`);
    const summaryMarkdown = `# 30 Juz Coverage Test Results\n\n**Total Tests**: ${passCount + failCount}\n**Pass Rate**: ${((passCount / (passCount + failCount)) * 100).toFixed(1)}%\n\n## Detailed Results\n${logBuffer}`;
    
    fs.writeFileSync(fullLogPath, summaryMarkdown, 'utf8');
    log(`\n📝 Full 30 Juz results saved: ${fullLogPath}`);

    return { totalTests: passCount + failCount, passRate: ((passCount / (passCount + failCount)) * 100).toFixed(1), logPath: fullLogPath };
}

juzCoverageTest().catch(console.error);
