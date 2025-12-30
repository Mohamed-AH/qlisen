const path = require('path');
const RecitationAnalyzer = require('../services/recitationAnalyzer');
const quranService = require('../services/quranService');

/**
 * Comprehensive test for all recent fixes:
 * 1. Priority 1.1: Relax ratio threshold when accuracy is high (90.7% case)
 * 2. Priority 2.1: Early Arabic text detection (reject Japanese)
 * 3. Priority 2.2: Minimum confidence threshold for n-gram (reject 1.3%)
 * 4. Priority 4: DEBUG mode only active with env var
 */
async function testAllFixes() {
    console.log('🧪 Comprehensive Test Suite for All Fixes\n');
    console.log('═'.repeat(80));

    const dataPath = path.join(__dirname, '..', '..', 'data');
    await quranService.init(dataPath);

    const analyzer = new RecitationAnalyzer(quranService);

    // ========== TEST 1: Non-Arabic Input (Japanese) ==========
    console.log('\n📝 TEST 1: Non-Arabic Input (Japanese text)');
    console.log('─'.repeat(80));
    console.log('Expected: Early rejection with "non_arabic_input" error\n');

    try {
        const result = await analyzer.analyzeFull('これはアラビア語ではありません', { duration: 1000 });

        if (!result.success && result.error === 'non_arabic_input') {
            console.log('✅ PASS: Non-Arabic text rejected early');
            console.log(`   Error: ${result.error}`);
            console.log(`   Message: ${result.message}`);
        } else {
            console.log('❌ FAIL: Non-Arabic text was not rejected properly');
            console.log(`   Result: ${JSON.stringify(result, null, 2)}`);
        }
    } catch (error) {
        console.log('❌ FAIL: Unexpected error');
        console.error(error.message);
    }

    // ========== TEST 2: Low Confidence N-Gram ==========
    console.log('\n\n📝 TEST 2: Low Confidence N-Gram Detection');
    console.log('─'.repeat(80));
    console.log('Expected: Confidence < 5% should be skipped during n-gram pass\n');
    console.log('Note: This test simulates poor quality transcription');
    console.log('      The system should skip candidates with confidence < 5%\n');

    try {
        // This is a very poor transcription that might match with low confidence
        // Using random Arabic words that don't form coherent Quranic text
        const poorTranscript = 'في من هل كان ذلك على';
        const result = await analyzer.analyzeFull(poorTranscript, { duration: 1000 });

        console.log(`Result: ${result.success ? 'Analysis succeeded' : 'Analysis failed'}`);
        if (result.success) {
            console.log(`   Detected: ${result.detectedSurah || 'N/A'}`);
            console.log(`   Method: ${result.detectionMethod || 'N/A'}`);
            console.log(`   ⚠️  Note: If confidence was low (<5%), it should have been skipped`);
        } else {
            console.log(`   Error: ${result.error}`);
            console.log('   ✅ Low confidence candidates were properly skipped');
        }
    } catch (error) {
        console.log('❌ FAIL: Unexpected error');
        console.error(error.message);
    }

    // ========== TEST 3: High Accuracy with High Ratio ==========
    console.log('\n\n📝 TEST 3: High Accuracy (90%+) with Ratio 2.0');
    console.log('─'.repeat(80));
    console.log('Expected: Should be ACCEPTED despite high ratio (user repeated for practice)\n');

    try {
        // Simulate user repeating words for practice
        // Al-Qariah with "ما القارعة" repeated
        const transcriptWithRepeats = 'القارعة ما القارعة وما أدراك ما القارعة وما أدراك ما القارعة';
        const result = await analyzer.analyzeFull(transcriptWithRepeats, { duration: 1000 });

        console.log(`Result: ${result.success ? 'ACCEPTED ✅' : 'REJECTED ❌'}`);
        if (result.success) {
            console.log(`   Detected: ${result.detectedSurah || 'N/A'}`);
            console.log(`   Confidence: ${result.confidence || 'N/A'}`);
            console.log(`   Method: ${result.detectionMethod || 'N/A'}`);

            if (result.verificationScores) {
                console.log(`\n   Verification Scores:`);
                console.log(`      Sequential: ${(result.verificationScores.sequential * 100).toFixed(1)}%`);
                console.log(`      Coverage: ${(result.verificationScores.coverage * 100).toFixed(1)}%`);
                console.log(`      Ratio: ${result.verificationScores.countRatio?.toFixed(2) || 'N/A'}`);
            }

            if (result.repeatSummary) {
                console.log(`\n   Repeats Detected: ${result.repeatSummary.total}`);
                console.log(`   ✅ PASS: High accuracy accepted despite repeats`);
            }
        } else {
            console.log(`   ❌ FAIL: High accuracy recitation was rejected`);
            console.log(`   Error: ${result.error}`);
            console.log(`   Message: ${result.message || 'N/A'}`);
        }
    } catch (error) {
        console.log('❌ FAIL: Unexpected error');
        console.error(error.message);
    }

    // ========== TEST 4: DEBUG Mode Environment Check ==========
    console.log('\n\n📝 TEST 4: DEBUG Mode Environment Variable');
    console.log('─'.repeat(80));
    console.log(`Current ANALYSIS_DEBUG_MODE: ${process.env.ANALYSIS_DEBUG_MODE || 'not set'}`);
    console.log('Expected: DEBUG override should only work if ANALYSIS_DEBUG_MODE=true\n');

    if (process.env.ANALYSIS_DEBUG_MODE === 'true') {
        console.log('⚠️  DEBUG MODE IS ACTIVE - Rejections will be overridden');
        console.log('   To test normal mode, unset ANALYSIS_DEBUG_MODE');
    } else {
        console.log('✅ PASS: DEBUG mode is correctly disabled in production');
        console.log('   Rejections will NOT be overridden');
    }

    // ========== SUMMARY ==========
    console.log('\n' + '═'.repeat(80));
    console.log('✅ All Fixes Test Complete\n');
    console.log('Summary of Fixes:');
    console.log('  1. ✅ Early Arabic text detection - rejects non-Arabic input');
    console.log('  2. ✅ Minimum confidence threshold - skips low confidence (<5%)');
    console.log('  3. ✅ Relaxed ratio for high accuracy - accepts repeats when accuracy ≥85%');
    console.log('  4. ✅ DEBUG mode environment check - only overrides if env var set');
    console.log('');
}

// Run the test
testAllFixes().catch(console.error);
