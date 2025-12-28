const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const WhisperService = require('../services/whisperService');
const RecitationAnalyzer = require('../services/recitationAnalyzer');
const quranService = require('../services/quranService'); // Singleton instance
const QueueService = require('../services/queueService');
const EmailService = require('../services/emailService');
const { upload, handleUploadError } = require('../middleware/audioUpload');

// Initialize services
const recitationAnalyzer = new RecitationAnalyzer(quranService);
const whisperService = new WhisperService();
const queueService = new QueueService();
const emailService = new EmailService();

/**
 * POST /api/transcription/analyze
 * Upload audio file, transcribe with Whisper, and analyze Quran position
 * Supports queuing when Whisper is offline or busy
 */
router.post('/analyze', upload.single('audio'), handleUploadError, async (req, res) => {
    let audioFilePath = null;
    let shouldCleanup = true; // Don't cleanup if added to queue

    try {
        // Check if file was uploaded
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No audio file provided. Please upload an audio file.'
            });
        }

        // Get user email from request body (optional)
        const userEmail = req.body.email || '';

        // Validate email format if provided
        if (userEmail) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(userEmail)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid email address'
                });
            }
        }

        audioFilePath = req.file.path;
        console.log('📥 Received audio file:', req.file.filename);
        console.log('   Size:', (req.file.size / 1024).toFixed(2), 'KB');
        console.log('   Type:', req.file.mimetype);
        console.log('   Email:', userEmail || '(not provided)');

        // Step 1: Try to transcribe immediately
        console.log('\n🎯 Step 1: Attempting transcription...');
        const transcriptionResult = await whisperService.transcribeWithRetry(audioFilePath, 1); // Only 1 attempt

        // Check if should queue
        if (!transcriptionResult.success && transcriptionResult.shouldQueue) {
            console.log('⏳ Whisper offline/busy - adding to queue');

            // Add to queue
            const job = await queueService.addToQueue(audioFilePath, userEmail, {
                fileName: req.file.filename,
                fileSize: req.file.size,
                mimeType: req.file.mimetype
            });

            shouldCleanup = false; // Don't delete file - it's in queue

            return res.json({
                success: true,
                queued: true,
                jobId: job.id,
                message: 'You are in the queue, we will get back to you ASAP',
                queuePosition: queueService.getQueuedCount(),
                estimatedWait: `${queueService.getQueuedCount() * 30} seconds` // Rough estimate
            });
        }

        // If failed for other reasons
        if (!transcriptionResult.success) {
            return res.status(500).json({
                success: false,
                error: `Transcription failed: ${transcriptionResult.error}`,
                step: 'transcription'
            });
        }

        // Transcription successful - proceed with analysis
        const transcript = transcriptionResult.transcript;
        console.log('✅ Transcription successful');
        console.log('   Transcript:', transcript.substring(0, 100) + '...');

        // Step 2: Analyze Quran position
        console.log('\n🎯 Step 2: Analyzing Quran position...');
        const analysisResult = await recitationAnalyzer.analyzeFull(transcript);

        // Handle low confidence (position not verified) - this is NOT an error, it's a valid response
        if (!analysisResult.success && analysisResult.error === 'position_not_verified') {
            console.log('⚠️  Low confidence - position could not be verified');
            console.log('   Best guess:', analysisResult.bestGuess?.surah || 'Unknown');

            // Return 200 (not 500) with suggestions for manual input
            return res.json({
                success: false,
                confidence: analysisResult.confidence,
                error: analysisResult.error,
                message: analysisResult.message,
                bestGuess: analysisResult.bestGuess,
                verificationScores: analysisResult.verificationScores,
                transcript,
                suggestions: analysisResult.suggestions,
                userOptions: analysisResult.userOptions
            });
        }

        // Handle actual analysis errors (not low confidence)
        if (!analysisResult.success) {
            return res.status(500).json({
                success: false,
                error: `Analysis failed: ${analysisResult.error}`,
                transcript,
                step: 'analysis'
            });
        }

        console.log('✅ Analysis completed');
        console.log('   Method:', analysisResult.summary.primarySurah.detectionMethod);
        console.log('   Surah:', analysisResult.summary.primarySurah.name);
        console.log('   Verses:', `${analysisResult.summary.verseRange.start}-${analysisResult.summary.verseRange.end}`);

        // Step 3: Send email (async, don't wait) - only if email provided
        if (userEmail) {
            emailService.sendResultEmail(userEmail, analysisResult, 'immediate-' + Date.now())
                .catch(err => console.error('Email send error:', err));
        } else {
            console.log('⏭️  Skipping email (no email provided)');
        }

        // Return immediate result
        res.json({
            success: true,
            queued: false,
            transcript: transcript,
            transcriptionTime: transcriptionResult.processingTime,
            analysis: {
                surah: analysisResult.summary.primarySurah.name,
                surahId: analysisResult.summary.primarySurah.id,
                surahNameArabic: analysisResult.summary.primarySurah.nameArabic,
                startVerse: analysisResult.summary.verseRange.start,
                endVerse: analysisResult.summary.verseRange.end,
                verseCount: analysisResult.summary.verseRange.count,
                method: analysisResult.summary.primarySurah.detectionMethod,
                accuracy: analysisResult.summary.overallAccuracy,
                verses: analysisResult.verses,
                mistakes: analysisResult.mistakes,
                recommendations: analysisResult.recommendations
            },
            metadata: transcriptionResult.metadata,
            totalProcessingTime: transcriptionResult.processingTime + (analysisResult.summary.processingTime || 0),
            message: 'Analysis complete! Check your email for detailed results.'
        });

    } catch (error) {
        console.error('❌ Error in transcription/analysis:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });

    } finally {
        // Clean up uploaded file (only if not queued)
        if (shouldCleanup && audioFilePath && fs.existsSync(audioFilePath)) {
            try {
                fs.unlinkSync(audioFilePath);
                console.log('🗑️  Cleaned up audio file:', audioFilePath);
            } catch (err) {
                console.error('⚠️  Failed to delete audio file:', err.message);
            }
        }
    }
});

/**
 * POST /api/transcription/transcribe-only
 * Upload audio file and get transcript only (no Quran analysis)
 */
router.post('/transcribe-only', upload.single('audio'), handleUploadError, async (req, res) => {
    let audioFilePath = null;

    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No audio file provided'
            });
        }

        audioFilePath = req.file.path;
        console.log('📥 Transcribing audio:', req.file.filename);

        const result = await whisperService.transcribeWithRetry(audioFilePath);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                error: result.error
            });
        }

        res.json({
            success: true,
            transcript: result.transcript,
            processingTime: result.processingTime,
            metadata: result.metadata
        });

    } catch (error) {
        console.error('❌ Transcription error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });

    } finally {
        if (audioFilePath && fs.existsSync(audioFilePath)) {
            fs.unlinkSync(audioFilePath);
        }
    }
});

/**
 * GET /api/transcription/job/:jobId
 * Check status of a queued job
 */
router.get('/job/:jobId', (req, res) => {
    const { jobId } = req.params;

    const job = queueService.getJob(jobId);

    if (!job) {
        return res.status(404).json({
            success: false,
            error: 'Job not found'
        });
    }

    // Don't expose sensitive info
    const sanitizedJob = {
        id: job.id,
        status: job.status,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        result: job.result,
        error: job.error
    };

    res.json({
        success: true,
        job: sanitizedJob
    });
});

/**
 * GET /api/transcription/queue/stats
 * Get queue statistics
 */
router.get('/queue/stats', (req, res) => {
    const stats = queueService.getStats();

    res.json({
        success: true,
        stats
    });
});

/**
 * GET /api/transcription/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
    const useRemote = process.env.USE_REMOTE_WHISPER === 'true';
    const useLocal = process.env.USE_LOCAL_WHISPER === 'true';
    const hasApiKey = !!process.env.OPENAI_API_KEY;
    const hasWhisperURL = !!process.env.WHISPER_URL;

    let configured = false;
    let mode = 'unknown';

    if (useRemote && hasWhisperURL) {
        configured = true;
        mode = 'remote';
    } else if (useLocal) {
        configured = true;
        mode = 'local';
    } else if (hasApiKey) {
        configured = true;
        mode = 'api';
    }

    res.json({
        success: true,
        whisperConfigured: configured,
        mode,
        message: configured
            ? `Whisper transcription service is ready (${mode} mode)`
            : 'Whisper not configured. Set environment variables.',
        queue: queueService.getStats()
    });
});

/**
 * POST /api/transcription/verify-manual
 * Verify and analyze recitation when user provides surah and verse numbers manually
 * Used when automatic detection fails and user needs to help identify position
 */
router.post('/verify-manual', async (req, res) => {
    try {
        const { transcript, surahId, startVerse, endVerse } = req.body;

        // Validate inputs
        if (!transcript || !surahId) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields',
                message: 'Please provide transcript and surahId'
            });
        }

        // Validate surah ID (1-114)
        const surahNum = parseInt(surahId);
        if (isNaN(surahNum) || surahNum < 1 || surahNum > 114) {
            return res.status(400).json({
                success: false,
                error: 'Invalid surah number',
                message: 'Surah number must be between 1 and 114'
            });
        }

        // Validate verse numbers if provided
        let start = startVerse ? parseInt(startVerse) : null;
        let end = endVerse ? parseInt(endVerse) : null;

        if (start && isNaN(start)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid start verse',
                message: 'Start verse must be a valid number'
            });
        }

        if (end && isNaN(end)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid end verse',
                message: 'End verse must be a valid number'
            });
        }

        if (start && end && start > end) {
            return res.status(400).json({
                success: false,
                error: 'Invalid verse range',
                message: 'Start verse cannot be greater than end verse'
            });
        }

        console.log('\n🔍 Manual position verification requested');
        console.log(`   Surah: ${surahNum}, Verses: ${start || 'auto'}-${end || 'auto'}`);

        // Get candidate verses
        let candidateVerses;
        if (start && end) {
            candidateVerses = quranService.quranData.filter(v =>
                v.surah === surahNum &&
                v.ayah >= start &&
                v.ayah <= end
            );

            if (candidateVerses.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid verse range',
                    message: `Surah ${surahNum} does not have verses ${start}-${end}`
                });
            }
        } else {
            // If no verse range provided, get entire surah
            candidateVerses = quranService.quranData.filter(v => v.surah === surahNum);

            if (candidateVerses.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid surah',
                    message: `Surah ${surahNum} not found`
                });
            }
        }

        const surahName = candidateVerses[0].surahName;
        console.log(`   Verifying against: ${surahName} (${candidateVerses.length} verses)`);

        // Preprocess transcript
        const TextPreprocessor = require('../services/textPreprocessor');
        const preprocessor = new TextPreprocessor();
        const preprocessed = preprocessor.preprocess(transcript);

        if (preprocessed.wordCount < 3) {
            return res.status(400).json({
                success: false,
                error: 'Transcript too short',
                message: 'Transcript must contain at least 3 words'
            });
        }

        // Verify position using strict sequence matching
        const verification = recitationAnalyzer.verifyPositionStrict(
            preprocessed.normalized,
            candidateVerses
        );

        if (verification.verified) {
            console.log(`✅ Manual position VERIFIED (${verification.confidence})`);

            // Position verified! Perform detailed analysis
            const analysisResult = await recitationAnalyzer.performDetailedAnalysis(
                preprocessed.normalized,
                surahNum,
                start,
                end,
                {
                    detectionMethod: 'manual_verified',
                    confidence: verification.confidence,
                    verificationScores: verification.scores,
                    pipelineStart: Date.now()
                }
            );

            return res.json({
                success: true,
                verified: true,
                message: `Position verified: ${surahName} verses ${start || 'auto'}-${end || 'auto'}`,
                analysis: analysisResult
            });

        } else {
            console.log(`❌ Manual position REJECTED - ${verification.reason}`);

            // Position does not match
            return res.status(400).json({
                success: false,
                verified: false,
                error: 'position_mismatch',
                message: `The recording does not match ${surahName} verses ${start || '1'}-${end || 'end'}`,
                verificationScores: verification.scores,
                details: {
                    sequential: `${(verification.scores.sequential * 100).toFixed(1)}% of words matched in sequence`,
                    coverage: `${(verification.scores.coverage * 100).toFixed(1)}% of verse words found in transcript`,
                    countRatio: `Word count ratio: ${verification.scores.countRatio.toFixed(2)}`
                },
                suggestions: [
                    'Verify you selected the correct surah and verses',
                    'The audio quality may be too low',
                    'Try recording again with clearer pronunciation',
                    'Speak at a moderate pace, not too fast or too slow'
                ]
            });
        }

    } catch (error) {
        console.error('Manual verification error:', error);
        return res.status(500).json({
            success: false,
            error: 'Verification failed',
            message: error.message
        });
    }
});

module.exports = router;
