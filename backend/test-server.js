/**
 * Standalone Test Server for Recitation API
 *
 * This is for testing the recitation API before integrating with Hafiz.
 * Run: node backend/test-server.js
 * Test endpoints at: http://localhost:5001/api/recitation/*
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const quranService = require('./services/quranService');
const recitationRoutes = require('./routes/recitation');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Initialize Quran data
async function initializeServer() {
    try {
        console.log('🚀 Starting Recitation API Test Server...\n');

        // Initialize Quran service with data from ../data directory
        const dataPath = path.join(__dirname, '../data');
        await quranService.init(dataPath);

        // Mount routes
        app.use('/api/recitation', recitationRoutes);

        // Health check endpoint
        app.get('/health', (req, res) => {
            res.json({
                status: 'ok',
                service: 'Quran Recitation API',
                quranData: {
                    initialized: quranService.isInitialized,
                    verses: quranService.quranData?.length || 0,
                    surahs: quranService.metadata?.totalSurahs || 0,
                    pages: quranService.metadata?.totalPages || 0
                },
                timestamp: new Date().toISOString()
            });
        });

        // Test endpoint to check position detection
        app.get('/api/test/detect', async (req, res) => {
            try {
                // Test with Al-Fatiha verse 1
                const testTranscript = 'بسم الله الرحمن الرحيم';
                const result = await quranService.detectPosition(testTranscript);

                res.json({
                    success: true,
                    test: 'Position detection',
                    input: testTranscript,
                    result
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // Error handling
        app.use((err, req, res, next) => {
            console.error('Error:', err);
            res.status(500).json({
                success: false,
                error: err.message
            });
        });

        // 404 handler
        app.use((req, res) => {
            res.status(404).json({
                success: false,
                error: 'Endpoint not found'
            });
        });

        // Start server
        app.listen(PORT, () => {
            console.log('\n✅ Server is running!');
            console.log(`📍 URL: http://localhost:${PORT}`);
            console.log('\n📚 Available endpoints:');
            console.log(`   GET  /health - Health check`);
            console.log(`   GET  /api/test/detect - Test position detection`);
            console.log(`   POST /api/recitation/detect-position - Detect Quran position`);
            console.log(`   GET  /api/recitation/pages?start=1&count=3 - Get pages`);
            console.log(`   GET  /api/recitation/metadata - Get Quran metadata`);
            console.log(`   GET  /api/recitation/surah/:surahNumber - Get surah verses`);
            console.log(`   POST /api/recitation/sessions - Save session`);
            console.log(`   GET  /api/recitation/sessions - Get sessions`);
            console.log(`   GET  /api/recitation/stats - Get statistics`);
            console.log('\n💡 Test examples:');
            console.log(`   curl http://localhost:${PORT}/health`);
            console.log(`   curl http://localhost:${PORT}/api/test/detect`);
            console.log(`   curl -X POST http://localhost:${PORT}/api/recitation/detect-position \\`);
            console.log(`        -H "Content-Type: application/json" \\`);
            console.log(`        -d '{"transcript":"بسم الله الرحمن الرحيم"}'`);
            console.log('');
        });

    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n👋 Shutting down server...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n\n👋 Shutting down server...');
    process.exit(0);
});

// Start the server
initializeServer();
