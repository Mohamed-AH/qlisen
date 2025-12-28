const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const WhisperService = require('../services/whisperService');
const RecitationAnalyzer = require('../services/recitationAnalyzer');
const QuranService = require('../services/quranService');
const { upload, handleUploadError } = require('../middleware/audioUpload');

// Initialize services
const quranService = new QuranService();
const recitationAnalyzer = new RecitationAnalyzer(quranService);
const whisperService = new WhisperService();

/**
 * POST /api/transcription/analyze
 * Upload audio file, transcribe with Whisper, and analyze Quran position
 */
router.post('/analyze', upload.single('audio'), handleUploadError, async (req, res) => {
    let audioFilePath = null;

    try {
        // Check if file was uploaded
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No audio file provided. Please upload an audio file.'
            });
        }

        audioFilePath = req.file.path;
        console.log('📥 Received audio file:', req.file.filename);
        console.log('   Size:', (req.file.size / 1024).toFixed(2), 'KB');
        console.log('   Type:', req.file.mimetype);

        // Step 1: Transcribe audio with Whisper API
        console.log('\n🎯 Step 1: Transcribing audio with Whisper API...');
        const transcriptionResult = await whisperService.transcribeWithRetry(audioFilePath);

        if (!transcriptionResult.success) {
            return res.status(500).json({
                success: false,
                error: `Transcription failed: ${transcriptionResult.error}`,
                step: 'transcription'
            });
        }

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

        // Return combined result
        res.json({
            success: true,
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
            totalProcessingTime: transcriptionResult.processingTime + analysisResult.processingTime
        });

    } catch (error) {
        console.error('❌ Error in transcription/analysis:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });

    } finally {
        // Clean up uploaded file
        if (audioFilePath && fs.existsSync(audioFilePath)) {
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
 * GET /api/transcription/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
    const hasApiKey = !!process.env.OPENAI_API_KEY;

    res.json({
        success: true,
        whisperConfigured: hasApiKey,
        message: hasApiKey
            ? 'Whisper transcription service is ready'
            : 'OPENAI_API_KEY not configured. Set it in .env file.'
    });
});

module.exports = router;
