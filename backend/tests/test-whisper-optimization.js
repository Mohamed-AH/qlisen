// Load environment variables FIRST (before any other requires)
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const path = require('path');
const WhisperService = require('../services/whisperService');
const fs = require('fs');

/**
 * WHISPER OPTIMIZATION TEST SUITE
 *
 * Tests the optimized Whisper configuration with:
 * - Small model (better accuracy for Classical Arabic)
 * - Quranic initial prompt
 * - Word-level timestamps
 * - Optimized inference parameters (beam_size=10, temperature=0)
 *
 * Measures:
 * - Transcription accuracy
 * - Processing time
 * - Word-level confidence scores
 * - Quality metrics
 */

async function testWhisperOptimization() {
    console.log('🧪 WHISPER OPTIMIZATION TEST SUITE\n');
    console.log('═'.repeat(80));

    // Initialize Whisper service (remote mode)
    const whisperService = new WhisperService();

    // Check if remote Whisper is configured
    console.log('\n🔧 Environment Configuration:');
    console.log(`   USE_REMOTE_WHISPER: ${process.env.USE_REMOTE_WHISPER || 'not set'}`);
    console.log(`   WHISPER_URL: ${process.env.WHISPER_URL || 'not set'}`);
    console.log(`   WHISPER_MODEL: ${process.env.WHISPER_MODEL || 'default (small)'}`);

    if (!process.env.USE_REMOTE_WHISPER || process.env.USE_REMOTE_WHISPER !== 'true') {
        console.log('\n❌ Remote Whisper not configured properly');
        console.log('\n📝 Fix:');
        console.log('   1. Ensure backend/.env file exists');
        console.log('   2. Add these lines to backend/.env:');
        console.log('      USE_REMOTE_WHISPER=true');
        console.log('      WHISPER_URL=http://localhost:5000');
        console.log('\n   3. Make sure Docker Whisper is running:');
        console.log('      cd local-whisper-setup');
        console.log('      ./start.sh');
        process.exit(1);
    }

    if (!process.env.WHISPER_URL) {
        console.log('\n❌ WHISPER_URL not configured');
        console.log('\n📝 Add to backend/.env:');
        console.log('   WHISPER_URL=http://localhost:5000');
        process.exit(1);
    }

    console.log(`\n✅ Testing against: ${process.env.WHISPER_URL}`);
    console.log(`✅ Model: ${process.env.WHISPER_MODEL || 'small (default)'}`);
    console.log('═'.repeat(80));

    // Test cases - Using user's actual audio file
    const testCases = [
        {
            name: 'Test 1: Telegram Audio (User Sample)',
            audioFile: 'test-audio/telegram_audio.ogg',
            description: 'Real Quranic recitation from user',
            expectedWords: ['الله'],  // At least Allah should appear
            minWordCount: 5,  // Flexible - depends on audio length
            minConfidence: 0.70,  // Reasonable threshold
            maxProcessingTime: 15000  // 15 seconds (generous for first test)
        },
        {
            name: 'Test 2: Additional Sample (Optional)',
            audioFile: 'test-audio/sample2.mp3',
            description: 'Second test audio (add if you have more)',
            expectedWords: ['الله'],
            minWordCount: 5,
            minConfidence: 0.70,
            maxProcessingTime: 15000,
            optional: true  // Skip if file doesn't exist
        },
        {
            name: 'Test 3: Third Sample (Optional)',
            audioFile: 'test-audio/sample3.mp3',
            description: 'Third test audio (add if you have more)',
            expectedWords: ['الله'],
            minWordCount: 5,
            minConfidence: 0.70,
            maxProcessingTime: 15000,
            optional: true  // Skip if file doesn't exist
        }
    ];

    let passCount = 0;
    const results = [];

    for (const test of testCases) {
        console.log(`\n🔍 ${test.name}`);
        console.log('─'.repeat(80));
        console.log(`   Description: ${test.description}`);
        console.log(`   Audio file: ${test.audioFile}`);

        // Check if audio file exists
        const audioPath = path.join(__dirname, '..', test.audioFile);
        if (!fs.existsSync(audioPath)) {
            if (test.optional) {
                console.log(`   ⏭️  SKIPPED - Optional test file not found`);
                results.push({
                    name: test.name,
                    status: 'SKIPPED',
                    reason: 'Optional file not provided'
                });
                continue;
            } else {
                console.log(`   ❌ FAILED - Required audio file not found: ${audioPath}`);
                console.log(`   Please copy your audio file to: backend/${test.audioFile}`);
                results.push({
                    name: test.name,
                    status: 'FAILED',
                    reason: 'Required audio file missing'
                });
                continue;
            }
        }

        console.log(`   📁 Using audio file: ${audioPath}`);

        const startTime = Date.now();

        try {
            // Transcribe with optimized settings
            const result = await whisperService.transcribeRemote(audioPath);

            const duration = Date.now() - startTime;

            // Check if successful
            if (!result.success) {
                console.log(`   ❌ FAILED - ${result.error}`);
                results.push({
                    name: test.name,
                    status: 'FAILED',
                    reason: result.error,
                    duration
                });
                continue;
            }

            // Analyze results
            const transcript = result.transcript;
            const words = result.words || [];
            const avgConfidence = result.metadata?.avgConfidence || 0;
            const lowConfidenceCount = result.quality?.lowConfidenceCount || 0;

            console.log(`\n   📝 Transcript (first 100 chars):`);
            console.log(`      ${transcript.substring(0, 100)}${transcript.length > 100 ? '...' : ''}`);
            console.log(`\n   📊 Metrics:`);
            console.log(`      Processing time: ${duration}ms`);
            console.log(`      Word count: ${words.length}`);
            console.log(`      Avg confidence: ${(avgConfidence * 100).toFixed(1)}%`);
            console.log(`      Low confidence words: ${lowConfidenceCount} (${result.quality?.lowConfidencePercentage || 0}%)`);

            // Validation checks
            let passed = true;
            const failures = [];

            // Check 1: Word count
            if (words.length < test.minWordCount) {
                passed = false;
                failures.push(`Word count too low (${words.length} < ${test.minWordCount})`);
            }

            // Check 2: Confidence score
            if (avgConfidence < test.minConfidence) {
                passed = false;
                failures.push(`Avg confidence too low (${(avgConfidence * 100).toFixed(1)}% < ${(test.minConfidence * 100).toFixed(1)}%)`);
            }

            // Check 3: Processing time
            if (duration > test.maxProcessingTime) {
                passed = false;
                failures.push(`Processing too slow (${duration}ms > ${test.maxProcessingTime}ms)`);
            }

            // Check 4: Expected words present
            const transcriptLower = transcript.toLowerCase();
            const missingWords = test.expectedWords.filter(word => !transcriptLower.includes(word));
            if (missingWords.length > 0) {
                passed = false;
                failures.push(`Missing expected words: ${missingWords.join(', ')}`);
            }

            // Check 5: Word timestamps present
            if (words.length === 0) {
                passed = false;
                failures.push('No word-level timestamps returned');
            } else {
                // Verify first word has required fields
                const firstWord = words[0];
                if (!firstWord.word || firstWord.start === undefined || firstWord.end === undefined) {
                    passed = false;
                    failures.push('Word timestamps missing required fields');
                }
            }

            // Check 6: Low confidence detection (if expected)
            if (test.expectLowConfidence && lowConfidenceCount === 0) {
                console.log(`   ⚠️  Warning: Expected low-confidence words for noisy audio, but got none`);
            }

            // Display low-confidence words
            if (lowConfidenceCount > 0) {
                console.log(`\n   ⚠️  Low Confidence Words:`);
                const lowConfWords = result.quality.lowConfidenceWords.slice(0, 5);
                lowConfWords.forEach((w, i) => {
                    console.log(`      ${i + 1}. "${w.word}" at ${w.timestamp} (confidence: ${w.confidence})`);
                });
                if (lowConfidenceCount > 5) {
                    console.log(`      ... and ${lowConfidenceCount - 5} more`);
                }
            }

            // Final verdict
            if (passed) {
                console.log(`\n   ✅ PASSED`);
                passCount++;
                results.push({
                    name: test.name,
                    status: 'PASSED',
                    duration,
                    wordCount: words.length,
                    avgConfidence: avgConfidence,
                    lowConfidenceCount: lowConfidenceCount
                });
            } else {
                console.log(`\n   ❌ FAILED`);
                failures.forEach(f => console.log(`      - ${f}`));
                results.push({
                    name: test.name,
                    status: 'FAILED',
                    failures,
                    duration,
                    wordCount: words.length,
                    avgConfidence: avgConfidence
                });
            }

        } catch (error) {
            console.log(`   ❌ ERROR - ${error.message}`);
            results.push({
                name: test.name,
                status: 'ERROR',
                reason: error.message,
                duration: Date.now() - startTime
            });
        }
    }

    // Summary
    console.log('\n' + '═'.repeat(80));
    console.log(`📊 TEST RESULTS: ${passCount}/${testCases.length} PASSED`);
    console.log('═'.repeat(80));

    results.forEach(r => {
        const icon = r.status === 'PASSED' ? '✅' : r.status === 'SKIPPED' ? '⚠️' : '❌';
        console.log(`${icon} ${r.name}: ${r.status}`);
        if (r.duration) {
            console.log(`   Duration: ${r.duration}ms`);
        }
        if (r.wordCount) {
            console.log(`   Words: ${r.wordCount}, Avg Conf: ${(r.avgConfidence * 100).toFixed(1)}%`);
        }
        if (r.failures) {
            r.failures.forEach(f => console.log(`   - ${f}`));
        }
        if (r.reason) {
            console.log(`   Reason: ${r.reason}`);
        }
    });

    console.log('═'.repeat(80));

    // Instructions for user
    console.log('\n📝 NEXT STEPS:');
    console.log('1. Add your sample audio files to the following paths:');
    testCases.forEach(t => console.log(`   - ${t.audioFile}`));
    console.log('2. Re-run this test: node backend/tests/test-whisper-optimization.js');
    console.log('3. Compare results with base model (if you have baseline metrics)');
    console.log('\n💡 TIP: Use actual Quranic recitation samples for accurate testing');

    return {
        total: testCases.length,
        passed: passCount,
        failed: testCases.length - passCount,
        successRate: (passCount / testCases.length * 100).toFixed(1) + '%'
    };
}

// Run tests
testWhisperOptimization()
    .then(summary => {
        console.log(`\n📊 FINAL SUMMARY:`);
        console.log(`   Total: ${summary.total}`);
        console.log(`   Passed: ${summary.passed}`);
        console.log(`   Failed: ${summary.failed}`);
        console.log(`   Success Rate: ${summary.successRate}`);

        process.exit(summary.failed > 0 ? 1 : 0);
    })
    .catch(error => {
        console.error('❌ Test suite failed:', error);
        process.exit(1);
    });
