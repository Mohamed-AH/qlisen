const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('📁 Created uploads directory:', uploadsDir);
}

// Configure storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        // Create unique filename with timestamp and original extension
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `audio-${uniqueSuffix}${ext}`);
    }
});

// File filter to accept only audio files
const fileFilter = (req, file, cb) => {
    // Allowed audio MIME types
    const allowedMimes = [
        'audio/mpeg',      // MP3
        'audio/mp3',       // MP3 (alternative)
        'audio/wav',       // WAV
        'audio/wave',      // WAV (alternative)
        'audio/x-wav',     // WAV (alternative)
        'audio/ogg',       // OGG
        'audio/webm',      // WebM
        'audio/m4a',       // M4A
        'audio/mp4',       // MP4 audio
        'audio/x-m4a',     // M4A (alternative)
        'audio/flac',      // FLAC
        'video/mp4',       // MP4 (sometimes audio is video/mp4)
        'application/octet-stream' // Generic binary (accept for now)
    ];

    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`Invalid file type: ${file.mimetype}. Only audio files are allowed.`), false);
    }
};

// Multer upload configuration
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 25 * 1024 * 1024 // 25MB limit (Whisper API max)
    }
});

// Error handling middleware for multer
const handleUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        // Multer-specific errors
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                error: 'File too large. Maximum size is 25MB.'
            });
        }
        return res.status(400).json({
            success: false,
            error: `Upload error: ${err.message}`
        });
    } else if (err) {
        // Other errors
        return res.status(400).json({
            success: false,
            error: err.message
        });
    }
    next();
};

module.exports = {
    upload,
    handleUploadError,
    uploadsDir
};
