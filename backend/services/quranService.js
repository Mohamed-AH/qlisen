/**
 * Quran Service for Recitation Checker
 * Handles position detection, page retrieval, and verse matching
 *
 * To integrate with Hafiz backend:
 * 1. Copy this file to backend/services/
 * 2. Copy data/ directory to backend/data/
 * 3. Initialize in server.js on startup
 */

const fs = require('fs').promises;
const path = require('path');

class QuranService {
    constructor() {
        this.quranData = null; // Full verses with metadata
        this.metadata = null; // Surah and page information
        this.ngramIndex = null; // Position detection index
        this.isInitialized = false;
    }

    /**
     * Initialize Quran data - call once on server startup
     */
    async init(dataPath = null) {
        try {
            const basePath = dataPath || path.join(__dirname, '../data/quran');

            console.log('🔄 Loading Quran data...');

            // Load all data files
            const [quranData, metadata, ngramIndex] = await Promise.all([
                fs.readFile(path.join(basePath, 'quran-uthmani.json'), 'utf8').then(JSON.parse),
                fs.readFile(path.join(basePath, 'quran-metadata.json'), 'utf8').then(JSON.parse),
                fs.readFile(path.join(basePath, 'ngram-index.json'), 'utf8').then(JSON.parse)
            ]);

            this.quranData = quranData.verses;
            this.metadata = metadata;
            this.ngramIndex = ngramIndex;
            this.isInitialized = true;

            console.log('✅ Quran data loaded successfully');
            console.log(`   📖 Verses: ${this.quranData.length.toLocaleString()}`);
            console.log(`   📚 Surahs: ${this.metadata.totalSurahs}`);
            console.log(`   📄 Pages: ${this.metadata.totalPages}`);
            console.log(`   🔍 N-grams: ${Object.keys(this.ngramIndex).length.toLocaleString()}`);

            return true;
        } catch (error) {
            console.error('❌ Failed to load Quran data:', error.message);
            throw error;
        }
    }

    /**
     * Normalize Arabic text for matching (same as frontend)
     */
    normalizeArabic(text) {
        return text
            .replace(/[ًٌٍَُِّْٰ]/g, '') // Remove diacritics
            .replace(/[إأآٱا]/g, 'ا') // Normalize alef
            .replace(/[ىيئ]/g, 'ي') // Normalize ya
            .replace(/[ةه]/g, 'ه') // Normalize ta marbuta/ha
            .replace(/[وؤ]/g, 'و') // Normalize waw
            .replace(/ء/g, '') // Remove hamza
            .replace(/ٱ/g, '') // Remove alef wasla
            .replace(/ـ/g, '') // Remove tatweel
            .replace(/\u0640/g, '') // Remove kashida
            .trim()
            .replace(/\s+/g, ' '); // Normalize spaces
    }

    /**
     * Detect Quran position from transcript
     * Uses n-gram matching for fast, accurate position detection
     * Now supports detecting verse ranges for continuous recitation
     */
    async detectPosition(transcript, lastKnownPosition = null) {
        if (!this.isInitialized) {
            throw new Error('QuranService not initialized. Call init() first.');
        }

        const normalized = this.normalizeArabic(transcript);
        const words = normalized.split(' ').filter(w => w.length > 0);

        // Need at least 3 words for n-gram matching
        if (words.length < 3) {
            return {
                detected: false,
                confidence: 0,
                message: 'Transcript too short (minimum 3 words required)'
            };
        }

        // Extract 3-grams from transcript
        const ngrams = [];
        for (let i = 0; i < words.length - 2; i++) {
            ngrams.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
        }

        // Find matching verses using n-gram index
        const candidates = new Map(); // verse ID → match score

        for (const ngram of ngrams) {
            const matches = this.ngramIndex[ngram] || [];
            for (const match of matches) {
                const key = match.verseId;
                candidates.set(key, (candidates.get(key) || 0) + 1);
            }
        }

        if (candidates.size === 0) {
            return {
                detected: false,
                confidence: 0,
                message: 'No matching verses found'
            };
        }

        // Sort candidates by verse ID to find consecutive sequences
        const sortedCandidates = Array.from(candidates.entries())
            .sort((a, b) => a[0] - b[0]); // Sort by verse ID

        // Find the best consecutive sequence of verses
        // Track matched verses for skip detection
        let bestSequence = { start: -1, end: -1, totalScore: 0, matchedVerses: new Set() };
        let currentSequence = { start: -1, end: -1, totalScore: 0, matchedVerses: new Set() };

        for (let i = 0; i < sortedCandidates.length; i++) {
            const [verseId, score] = sortedCandidates[i];

            // Start new sequence or continue existing one
            if (currentSequence.start === -1) {
                // Start new sequence
                currentSequence = {
                    start: verseId,
                    end: verseId,
                    totalScore: score,
                    matchedVerses: new Set([verseId])
                };
            } else if (verseId <= currentSequence.end + 5) {
                // Continue sequence (allow gaps up to 5 verses for skip detection)
                currentSequence.end = verseId;
                currentSequence.totalScore += score;
                currentSequence.matchedVerses.add(verseId);
            } else {
                // Sequence broken, check if it's the best so far
                if (currentSequence.totalScore > bestSequence.totalScore) {
                    bestSequence = {
                        start: currentSequence.start,
                        end: currentSequence.end,
                        totalScore: currentSequence.totalScore,
                        matchedVerses: new Set(currentSequence.matchedVerses)
                    };
                }
                // Start new sequence
                currentSequence = {
                    start: verseId,
                    end: verseId,
                    totalScore: score,
                    matchedVerses: new Set([verseId])
                };
            }
        }

        // Check final sequence
        if (currentSequence.totalScore > bestSequence.totalScore) {
            bestSequence = {
                start: currentSequence.start,
                end: currentSequence.end,
                totalScore: currentSequence.totalScore,
                matchedVerses: new Set(currentSequence.matchedVerses)
            };
        }

        // Detect skipped verses within the sequence
        const skippedVerses = [];
        const recitedVerses = [];

        for (let verseId = bestSequence.start; verseId <= bestSequence.end; verseId++) {
            const verse = this.quranData[verseId];
            if (!verse) continue;

            // Only count verses from the same surah
            if (verse.surah === this.quranData[bestSequence.start].surah) {
                if (bestSequence.matchedVerses.has(verseId)) {
                    recitedVerses.push({
                        verseId: verseId,
                        ayah: verse.ayah,
                        surah: verse.surah
                    });
                } else {
                    skippedVerses.push({
                        verseId: verseId,
                        ayah: verse.ayah,
                        surah: verse.surah,
                        surahName: verse.surahName
                    });
                }
            }
        }

        // Use the first verse of the best sequence
        const startVerse = this.quranData[bestSequence.start];
        const endVerse = this.quranData[bestSequence.end];

        if (!startVerse || !endVerse) {
            return {
                detected: false,
                confidence: 0,
                message: 'Could not resolve best match'
            };
        }

        // Calculate confidence - smarter algorithm that accounts for:
        // 1. N-gram match rate (raw accuracy)
        // 2. Number of verses detected (sequence length bonus)
        // 3. Speech recognition tolerance (lower threshold)

        const rawConfidence = bestSequence.totalScore / ngrams.length;
        const versesInSequence = bestSequence.end - bestSequence.start + 1;

        // Boost confidence based on sequence length
        // - Single verse: no boost
        // - 2-3 verses: 1.5x boost
        // - 4+ verses: 2.0x boost (strong indicator of correct detection)
        let sequenceBoost = 1.0;
        if (versesInSequence >= 4) {
            sequenceBoost = 2.0;
        } else if (versesInSequence >= 2) {
            sequenceBoost = 1.5;
        }

        // Apply boost and cap at 1.0
        const confidence = Math.min(rawConfidence * sequenceBoost, 1.0);

        // Get surah info
        const surahInfo = this.metadata.surahs.find(s => s.id === startVerse.surah);

        return {
            detected: true,
            confidence: Math.round(confidence * 100) / 100,
            position: {
                page: startVerse.page,
                juz: startVerse.juz,
                surah: startVerse.surah,
                surahName: startVerse.surahName,
                surahNameEn: surahInfo?.nameEn || startVerse.surahNameEn,
                ayahStart: startVerse.ayah,
                ayahEnd: endVerse.ayah, // Now shows range!
                wordStart: 0,
                wordEnd: endVerse.wordCount - 1
            },
            matchedText: startVerse.text,
            matchedVerseNormalized: startVerse.textNormalized,
            // Recitation analysis
            recitedVerses: recitedVerses.map(v => v.ayah),
            skippedVerses: skippedVerses.map(v => v.ayah),
            hasSkippedVerses: skippedVerses.length > 0,
            // Additional debug info
            sequenceInfo: {
                versesDetected: bestSequence.end - bestSequence.start + 1,
                versesRecited: recitedVerses.length,
                versesSkipped: skippedVerses.length,
                totalMatches: bestSequence.totalScore,
                totalNgrams: ngrams.length
            }
        };
    }

    /**
     * Get Quran pages for comparison
     */
    async getPages(startPage, pageCount = 3) {
        if (!this.isInitialized) {
            throw new Error('QuranService not initialized. Call init() first.');
        }

        const pages = [];
        const endPage = Math.min(startPage + pageCount - 1, this.metadata.totalPages);

        for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
            // Get all verses on this page
            const versesOnPage = this.quranData.filter(v => v.page === pageNum);

            pages.push({
                number: pageNum,
                juz: versesOnPage[0]?.juz || 0,
                verses: versesOnPage.map(v => ({
                    surah: v.surah,
                    surahName: v.surahName,
                    surahNameEn: v.surahNameEn,
                    ayah: v.ayah,
                    text: v.text,
                    textNormalized: v.textNormalized,
                    wordCount: v.wordCount
                }))
            });
        }

        return pages;
    }

    /**
     * Get metadata (surahs, pages info)
     */
    getMetadata() {
        if (!this.isInitialized) {
            throw new Error('QuranService not initialized. Call init() first.');
        }

        return this.metadata;
    }

    /**
     * Get specific surah information
     */
    getSurah(surahNumber) {
        if (!this.isInitialized) {
            throw new Error('QuranService not initialized. Call init() first.');
        }

        return this.metadata.surahs.find(s => s.id === surahNumber);
    }

    /**
     * Get verses for a specific surah
     */
    getSurahVerses(surahNumber, startAyah = null, endAyah = null) {
        if (!this.isInitialized) {
            throw new Error('QuranService not initialized. Call init() first.');
        }

        let verses = this.quranData.filter(v => v.surah === surahNumber);

        if (startAyah !== null) {
            verses = verses.filter(v => v.ayah >= startAyah);
        }

        if (endAyah !== null) {
            verses = verses.filter(v => v.ayah <= endAyah);
        }

        return verses.map(v => ({
            ayah: v.ayah,
            text: v.text,
            textNormalized: v.textNormalized,
            page: v.page,
            juz: v.juz
        }));
    }
}

// Export singleton instance
const quranService = new QuranService();
module.exports = quranService;
