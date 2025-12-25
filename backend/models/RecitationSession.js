/**
 * RecitationSession MongoDB Model
 *
 * To integrate with Hafiz backend:
 * 1. Copy this file to backend/models/
 * 2. Import in routes/recitation.js: const RecitationSession = require('../models/RecitationSession');
 * 3. Uncomment session save/retrieve code in routes
 */

const mongoose = require('mongoose');

const recitationSessionSchema = new mongoose.Schema({
    // User who performed the recitation
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // Session timing
    startTime: {
        type: Date,
        required: true
    },
    endTime: {
        type: Date,
        required: true
    },
    duration: {
        type: Number, // in seconds
        required: true
    },

    // Coverage - what was recited
    coverage: {
        surahs: [Number], // Array of surah IDs recited
        ayahsRecited: {
            type: Number,
            default: 0
        },
        pagesRecited: {
            type: Number,
            default: 0
        },
        startPosition: {
            surah: Number,
            ayah: Number,
            page: Number
        },
        endPosition: {
            surah: Number,
            ayah: Number,
            page: Number
        }
    },

    // Accuracy metrics
    accuracy: {
        totalWords: {
            type: Number,
            default: 0
        },
        correctWords: {
            type: Number,
            default: 0
        },
        percentAccuracy: {
            type: Number,
            default: 0
        },
        contemplativeRepeats: {
            type: Number,
            default: 0
        },
        partialMatches: {
            type: Number,
            default: 0
        }
    },

    // Optional: Store the transcript for review (can be large)
    transcript: {
        type: String,
        default: ''
    },

    // Optional: Detailed results for debugging/review
    detailedResults: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    }
}, {
    timestamps: true // Adds createdAt and updatedAt automatically
});

// Indexes for efficient queries
recitationSessionSchema.index({ userId: 1, createdAt: -1 });
recitationSessionSchema.index({ 'coverage.surahs': 1 });
recitationSessionSchema.index({ createdAt: -1 });

// Virtual for session summary
recitationSessionSchema.virtual('summary').get(function() {
    return {
        sessionId: this._id,
        date: this.startTime,
        duration: this.duration,
        ayahsRecited: this.coverage.ayahsRecited,
        accuracy: this.accuracy.percentAccuracy,
        surahs: this.coverage.surahs
    };
});

// Method to calculate accuracy if not already calculated
recitationSessionSchema.methods.calculateAccuracy = function() {
    if (this.accuracy.totalWords > 0) {
        this.accuracy.percentAccuracy = Math.round(
            (this.accuracy.correctWords / this.accuracy.totalWords) * 100 * 10
        ) / 10; // Round to 1 decimal place
    }
    return this.accuracy.percentAccuracy;
};

// Static method to get user statistics
recitationSessionSchema.statics.getUserStats = async function(userId) {
    const stats = await this.aggregate([
        { $match: { userId: mongoose.Types.ObjectId(userId) } },
        {
            $group: {
                _id: null,
                totalSessions: { $sum: 1 },
                totalAyahs: { $sum: '$coverage.ayahsRecited' },
                totalPages: { $sum: '$coverage.pagesRecited' },
                totalDuration: { $sum: '$duration' },
                avgAccuracy: { $avg: '$accuracy.percentAccuracy' },
                uniqueSurahs: { $addToSet: '$coverage.surahs' }
            }
        }
    ]);

    if (stats.length === 0) {
        return {
            totalSessions: 0,
            totalAyahsRecited: 0,
            totalPagesRecited: 0,
            totalDuration: 0,
            averageAccuracy: 0,
            uniqueSurahsRecited: 0
        };
    }

    const result = stats[0];
    return {
        totalSessions: result.totalSessions,
        totalAyahsRecited: result.totalAyahs,
        totalPagesRecited: result.totalPages,
        totalDuration: result.totalDuration,
        averageAccuracy: Math.round(result.avgAccuracy * 10) / 10,
        uniqueSurahsRecited: new Set(result.uniqueSurahs.flat()).size
    };
};

// Static method to get recent sessions
recitationSessionSchema.statics.getRecentSessions = async function(userId, limit = 10) {
    return this.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .select('startTime endTime duration coverage.ayahsRecited coverage.surahs accuracy.percentAccuracy createdAt')
        .lean();
};

const RecitationSession = mongoose.model('RecitationSession', recitationSessionSchema);

module.exports = RecitationSession;
