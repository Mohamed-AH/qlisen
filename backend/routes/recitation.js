/**
 * Recitation Checker API Routes
 *
 * To integrate with Hafiz backend:
 * 1. Copy this file to backend/routes/
 * 2. Add to server.js: const recitationRoutes = require('./routes/recitation');
 * 3. Add route: app.use('/api/recitation', recitationRoutes);
 * 4. Ensure quranService is initialized in server.js
 */

const express = require('express');
const router = express.Router();
const quranService = require('../services/quranService');
const RecitationAnalyzer = require('../services/recitationAnalyzer');

// Note: authenticateJWT middleware should be imported from your auth middleware
// For integration: const { authenticateJWT } = require('../middleware/auth');

// Mock middleware for standalone testing (remove when integrating)
const authenticateJWT = (req, res, next) => {
    // In production, this will check JWT token
    // For now, allow all requests for testing
    req.user = { _id: 'test-user-id' };
    next();
};

/**
 * POST /api/recitation/detect-position
 * Detect Quran position from Arabic transcript
 */
router.post('/detect-position', authenticateJWT, async (req, res) => {
    try {
        const { transcript, lastKnownPosition } = req.body;

        if (!transcript) {
            return res.status(400).json({
                success: false,
                error: 'Transcript is required'
            });
        }

        // Log incoming transcript for debugging
        console.log('\n🎤 DETECTION REQUEST:');
        console.log('   Transcript:', transcript);
        console.log('   Length:', transcript.length, 'chars');
        console.log('   Words:', transcript.split(/\s+/).length);

        const position = await quranService.detectPosition(
            transcript,
            lastKnownPosition
        );

        // Log detection result
        if (position.detected) {
            console.log('✅ DETECTED:', position.position.surahName,
                       'Ayah', position.position.ayahStart,
                       'Confidence:', (position.confidence * 100).toFixed(1) + '%');
        } else {
            console.log('❌ NOT DETECTED');
        }

        res.json({
            success: true,
            ...position
        });
    } catch (error) {
        console.error('Error detecting position:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/recitation/pages
 * Get Quran pages for comparison
 */
router.get('/pages', authenticateJWT, async (req, res) => {
    try {
        const { start, count } = req.query;

        if (!start) {
            return res.status(400).json({
                success: false,
                error: 'Start page number is required'
            });
        }

        const startPage = parseInt(start);
        const pageCount = parseInt(count) || 3;

        if (startPage < 1 || startPage > 604) {
            return res.status(400).json({
                success: false,
                error: 'Invalid page number (must be 1-604)'
            });
        }

        const pages = await quranService.getPages(startPage, pageCount);

        res.json({
            success: true,
            pages
        });
    } catch (error) {
        console.error('Error getting pages:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/recitation/metadata
 * Get Quran metadata (surahs, pages info)
 */
router.get('/metadata', authenticateJWT, async (req, res) => {
    try {
        const metadata = quranService.getMetadata();

        res.json({
            success: true,
            ...metadata
        });
    } catch (error) {
        console.error('Error getting metadata:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/recitation/surah/:surahNumber
 * Get verses for a specific surah
 */
router.get('/surah/:surahNumber', authenticateJWT, async (req, res) => {
    try {
        const surahNumber = parseInt(req.params.surahNumber);
        const { startAyah, endAyah } = req.query;

        if (surahNumber < 1 || surahNumber > 114) {
            return res.status(400).json({
                success: false,
                error: 'Invalid surah number (must be 1-114)'
            });
        }

        const surahInfo = quranService.getSurah(surahNumber);
        const verses = quranService.getSurahVerses(
            surahNumber,
            startAyah ? parseInt(startAyah) : null,
            endAyah ? parseInt(endAyah) : null
        );

        res.json({
            success: true,
            surah: surahInfo,
            verses
        });
    } catch (error) {
        console.error('Error getting surah:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/recitation/sessions
 * Save a recitation session
 *
 * Note: This requires the RecitationSession model
 * Import: const RecitationSession = require('../models/RecitationSession');
 */
router.post('/sessions', authenticateJWT, async (req, res) => {
    try {
        // TODO: Uncomment when RecitationSession model is created
        /*
        const session = await RecitationSession.create({
            userId: req.user._id,
            ...req.body
        });

        res.json({
            success: true,
            sessionId: session._id,
            savedAt: session.createdAt
        });
        */

        // Temporary response for testing
        res.json({
            success: true,
            message: 'Session saving not yet implemented',
            sessionId: 'temp-' + Date.now(),
            savedAt: new Date()
        });
    } catch (error) {
        console.error('Error saving session:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/recitation/sessions
 * Get user's recitation sessions
 */
router.get('/sessions', authenticateJWT, async (req, res) => {
    try {
        const { limit = 10, fromDate } = req.query;

        // TODO: Uncomment when RecitationSession model is created
        /*
        const query = { userId: req.user._id };
        if (fromDate) {
            query.createdAt = { $gte: new Date(fromDate) };
        }

        const sessions = await RecitationSession
            .find(query)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit));

        const stats = await RecitationSession.aggregate([
            { $match: { userId: req.user._id } },
            {
                $group: {
                    _id: null,
                    totalSessions: { $sum: 1 },
                    totalAyahs: { $sum: '$coverage.ayahsRecited' },
                    avgAccuracy: { $avg: '$accuracy.percentAccuracy' }
                }
            }
        ]);

        res.json({
            success: true,
            sessions,
            statistics: stats[0] || {}
        });
        */

        // Temporary response for testing
        res.json({
            success: true,
            sessions: [],
            statistics: {
                totalSessions: 0,
                totalAyahs: 0,
                avgAccuracy: 0
            },
            message: 'Session retrieval not yet implemented'
        });
    } catch (error) {
        console.error('Error getting sessions:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/recitation/sessions/:id
 * Get a specific session by ID
 */
router.get('/sessions/:id', authenticateJWT, async (req, res) => {
    try {
        // TODO: Implement when RecitationSession model is created
        res.json({
            success: false,
            message: 'Session retrieval not yet implemented'
        });
    } catch (error) {
        console.error('Error getting session:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/recitation/stats
 * Get user's recitation statistics
 */
router.get('/stats', authenticateJWT, async (req, res) => {
    try {
        // TODO: Implement advanced statistics when sessions are saved
        res.json({
            success: true,
            stats: {
                totalSessions: 0,
                totalAyahsRecited: 0,
                totalDuration: 0,
                averageAccuracy: 0,
                uniqueSurahsRecited: 0,
                lastSession: null
            },
            message: 'Statistics not yet implemented'
        });
    } catch (error) {
        console.error('Error getting stats:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/recitation/analyze-full
 * Comprehensive post-processing analysis of complete recitation
 * NEW: Replaces real-time detection with full-transcript analysis
 */
router.post('/analyze-full', authenticateJWT, async (req, res) => {
    try {
        const { transcript, sessionId, duration, wordCount } = req.body;

        if (!transcript || transcript.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Transcript is required'
            });
        }

        console.log('\n📊 FULL ANALYSIS REQUEST:');
        console.log('   Session ID:', sessionId || 'N/A');
        console.log('   Transcript length:', transcript.length, 'characters');
        console.log('   Word count:', wordCount || transcript.split(/\s+/).length);
        console.log('   Duration:', duration || 'N/A', 'ms');

        // Create analyzer instance
        const analyzer = new RecitationAnalyzer(quranService);

        // Run full analysis pipeline
        const startTime = Date.now();
        const report = await analyzer.analyzeFull(transcript, {
            sessionId,
            duration,
            wordCount
        });
        const analysisTime = Date.now() - startTime;

        if (report.success) {
            console.log('✅ ANALYSIS COMPLETE:');
            console.log('   Surah:', report.summary.primarySurah.name);
            console.log('   Accuracy:', (report.summary.overallAccuracy * 100).toFixed(1) + '%');
            console.log('   Verses recited:', report.summary.versesRecited, '/', report.summary.versesInRange);
            console.log('   Verses skipped:', report.summary.versesSkipped.length);
            console.log('   Processing time:', analysisTime, 'ms');
        } else {
            console.log('❌ ANALYSIS FAILED:', report.error);
        }

        res.json(report);

    } catch (error) {
        console.error('Error in full analysis:', error);
        res.status(500).json({
            success: false,
            error: 'analysis_failed',
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

module.exports = router;
