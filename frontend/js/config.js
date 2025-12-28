/**
 * Application Configuration
 */

const CONFIG = {
    // API Endpoints
    API_BASE_URL: 'http://localhost:5001',
    API_ENDPOINTS: {
        analyze: '/api/transcription/analyze',
        health: '/api/transcription/health',
        job: '/api/transcription/job',
        queueStats: '/api/transcription/queue/stats'
    },

    // Recording Settings
    RECORDING: {
        mimeType: 'audio/webm;codecs=opus', // Fallback to audio/ogg if not supported
        audioBitsPerSecond: 128000,
        maxDuration: 600000 // 10 minutes in milliseconds
    },

    // Default Language
    DEFAULT_LANG: 'ar',

    // LocalStorage Keys
    STORAGE_KEYS: {
        language: 'qlisen_language',
        userEmail: 'qlisen_email'
    }
};

// Check browser support
const BROWSER_SUPPORT = {
    mediaRecorder: typeof MediaRecorder !== 'undefined',
    getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    audioContext: typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined'
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CONFIG, BROWSER_SUPPORT };
}
