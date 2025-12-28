const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const WhisperService = require('../services/whisperService');
const RecitationAnalyzer = require('../services/recitationAnalyzer');
const QuranService = require('../services/quranService');
const QueueService = require('../services/queueService');
const EmailService = require('../services/emailService');
const { upload, handleUploadError } = require('../middleware/audioUpload');

// Initialize services
const quranService = new QuranService();
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

        // Get user email from request body
        const userEmail = req.body.email;
        if (!userEmail) {
            return res.status(400).json({
                success: false,
                error: 'Email address is required'
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(userEmail)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid email address'
            });
        }

        audioFilePath = req.file.path;
        console.log('📥 Received audio file:', req.file.filename);
        console.log('   Size:', (req.file.size / 1024).toFixed(2), 'KB');
        console.log('   Type:', req.file.mimetype);
        console.log('   Email:', userEmail);

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
        const analysisResult = await recitationAnalyzer.analyzeRecitation(transcript);

        if (!analysisResult.success) {
            return res.status(500).json({
                success: false,
                error: `Analysis failed: ${analysisResult.error}`,
                transcript,
                step: 'analysis'
            });
        }

        console.log('✅ Analysis completed');
        console.log('   Method:', analysisResult.method);
        console.log('   Surah:', analysisResult.surah);
        console.log('   Verses:', `${analysisResult.startVerse}-${analysisResult.endVerse}`);

        // Step 3: Send email (async, don't wait)
        emailService.sendResultEmail(userEmail, analysisResult, 'immediate-' + Date.now())
            .catch(err => console.error('Email send error:', err));

        // Return immediate result
        res.json({
            success: true,
            queued: false,
            transcript: transcript,
            transcriptionTime: transcriptionResult.processingTime,
            analysis: {
                surah: analysisResult.surah,
                surahId: analysisResult.surahId,
                surahNameArabic: analysisResult.surahNameArabic,
                startVerse: analysisResult.startVerse,
                endVerse: analysisResult.endVerse,
                verseCount: analysisResult.verseCount,
                method: analysisResult.method,
                accuracy: analysisResult.accuracy,
                alignments: analysisResult.alignments
            },
            metadata: transcriptionResult.metadata,
            totalProcessingTime: transcriptionResult.processingTime + analysisResult.processingTime,
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

module.exports = router;
