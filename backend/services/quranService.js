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

        // Find best match (most consecutive n-gram matches)
        let bestVerseId = -1;
        let bestScore = 0;

        for (const [verseId, score] of candidates.entries()) {
            // Prefer sequential matches if we have lastKnownPosition
            if (lastKnownPosition && this.quranData[verseId]) {
                const verse = this.quranData[verseId];
                const isSequential = verse.page >= lastKnownPosition.page;
                const adjustedScore = isSequential ? score * 1.2 : score; // Boost sequential matches

                if (adjustedScore > bestScore) {
                    bestScore = adjustedScore;
                    bestVerseId = verseId;
                }
            } else {
                if (score > bestScore) {
                    bestScore = score;
                    bestVerseId = verseId;
                }
            }
        }

        const verse = this.quranData[bestVerseId];
        if (!verse) {
            return {
                detected: false,
                confidence: 0,
                message: 'Could not resolve best match'
            };
        }

        // Calculate confidence (percentage of n-grams matched)
        const confidence = Math.min(bestScore / ngrams.length, 1.0);

        // Get surah info
        const surahInfo = this.metadata.surahs.find(s => s.id === verse.surah);

        return {
            detected: true,
            confidence: Math.round(confidence * 100) / 100,
            position: {
                page: verse.page,
                juz: verse.juz,
                surah: verse.surah,
                surahName: verse.surahName,
                surahNameEn: surahInfo?.nameEn || verse.surahNameEn,
                ayahStart: verse.ayah,
                ayahEnd: verse.ayah, // Single verse for now
                wordStart: 0,
                wordEnd: verse.wordCount - 1
            },
            matchedText: verse.text,
            matchedVerseNormalized: verse.textNormalized
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
