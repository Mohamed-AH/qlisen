/**
 * Quick test for word-level error detection
 */

const path = require('path');
const RecitationAnalyzer = require('../services/recitationAnalyzer');
const quranService = require('../services/quranService');

async function testWordLevelErrors() {
    console.log('🧪 Testing Word-Level Error Detection\n');

    const dataPath = path.join(__dirname, '..', '..', 'data');
    await quranService.init(dataPath);
    const analyzer = new RecitationAnalyzer(quranService);

    // Test 1: Correct recitation (baseline)
    console.log('Test 1: Correct Al-Ikhlas verse 1');
    const result1 = await analyzer.analyzeFull('قُلْ هُوَ اللَّهُ أَحَدٌ', { duration: 5000 });
    console.log('Accuracy:', result1.overallAccuracy);
    console.log('Mistakes:', result1.mistakes.length);
    console.log('');

    // Test 2: Jumbled words (middle swap)
    console.log('Test 2: Jumbled - middle words swapped');
    const result2 = await analyzer.analyzeFull('قُلْ اللَّهُ هُوَ أَحَدٌ', { duration: 5000 });
    console.log('Accuracy:', result2.overallAccuracy);
    console.log('Mistakes:');
    result2.mistakes.forEach((m, i) => {
        console.log(`  ${i + 1}. Type: ${m.type}`);
        console.log(`     Message: ${m.message}`);
        if (m.severity) console.log(`     Severity: ${m.severity}`);
    });
    console.log('');

    // Test 3: Completely reversed
    console.log('Test 3: Completely reversed word order');
    const result3 = await analyzer.analyzeFull('أَحَدٌ اللَّهُ هُوَ قُلْ', { duration: 5000 });
    console.log('Success:', result3.success);
    if (result3.success) {
        console.log('Accuracy:', result3.overallAccuracy);
        console.log('Mistakes:', result3.mistakes.length);
        result3.mistakes.slice(0, 3).forEach((m, i) => {
            console.log(`  ${i + 1}. Type: ${m.type}`);
            console.log(`     Message: ${m.message || 'N/A'}`);
        });
    } else {
        console.log('Error:', result3.message);
    }
}

testWordLevelErrors().catch(console.error);
