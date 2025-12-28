/**
 * Recitation Analyzer - Post-Processing System
 * Implements the 4-phase analysis: Surah ID → Alignment → Skip Detection → Report
 */

const TextPreprocessor = require('./textPreprocessor');
const { findSimilarNgrams, levenshteinSimilarity } = require('../utils/fuzzyMatch');

class RecitationAnalyzer {
    constructor(quranService) {
        this.quranService = quranService;
        this.preprocessor = new TextPreprocessor();
        this.fastPathIndex = null;
        // Don't build index in constructor - will be built lazily on first use
    }

    /**
     * Build index of commonly recited passages for instant detection
     */
    buildFastPathIndex() {
        // Skip if already built or if quranData not available yet
        if (this.fastPathIndex !== null || !this.quranService.quranData) {
            return;
        }

        this.fastPathIndex = [];

        // 1. All surah beginnings (first 1-2 verses of each surah)
        const surahStarts = new Map(); // surahId -> first verse ayah number
        for (const verse of this.quranService.quranData) {
            if (!surahStarts.has(verse.surah)) {
                surahStarts.set(verse.surah, verse.ayah);
            }
        }

        for (const [surahId, firstAyah] of surahStarts.entries()) {
            // Get first 2 verses of the surah
            const surahVerses = this.quranService.quranData.filter(v => v.surah === surahId);
            const firstVerses = surahVerses.slice(0, Math.min(2, surahVerses.length));

            const text = firstVerses.map(v => v.textNormalized).join(' ');
            const surahName = firstVerses[0].surahName;

            this.fastPathIndex.push({
                type: 'surah_beginning',
                surahId,
                surahName,
                startVerse: firstAyah,
                endVerse: firstVerses[firstVerses.length - 1].ayah,
                text,
                description: `بداية ${surahName}`
            });
        }

        // 2. Famous commonly recited passages
        const famousPassages = [
            // Ayatul Kursi
            { surahId: 2, startVerse: 255, endVerse: 255, name: 'آية الكرسي' },

            // Last 2 verses of Al-Baqarah
            { surahId: 2, startVerse: 285, endVerse: 286, name: 'آخر آيتين من البقرة' },

            // Last 10 verses of Al-Imran
            { surahId: 3, startVerse: 190, endVerse: 200, name: 'آخر عشر آيات من آل عمران' },

            // Ibadur Rahman from Al-Furqan (verses 63-77)
            { surahId: 25, startVerse: 63, endVerse: 77, name: 'عباد الرحمن' },

            // Al-Mulk first 10 verses (commonly recited before sleep)
            { surahId: 67, startVerse: 1, endVerse: 10, name: 'أول عشر آيات من الملك' },

            // Al-Kahf verses 1-10 (protection from Dajjal)
            { surahId: 18, startVerse: 1, endVerse: 10, name: 'أول عشر آيات من الكهف' },

            // Al-Kahf last 10 verses
            { surahId: 18, startVerse: 101, endVerse: 110, name: 'آخر عشر آيات من الكهف' },
        ];

        for (const passage of famousPassages) {
            const verses = this.quranService.quranData.filter(v =>
                v.surah === passage.surahId &&
                v.ayah >= passage.startVerse &&
                v.ayah <= passage.endVerse
            );

            if (verses.length > 0) {
                const text = verses.map(v => v.textNormalized).join(' ');

                this.fastPathIndex.push({
                    type: 'famous_passage',
                    surahId: passage.surahId,
                    surahName: verses[0].surahName,
                    startVerse: passage.startVerse,
                    endVerse: passage.endVerse,
                    text,
                    description: passage.name
                });
            }
        }

        console.log(`📚 Fast-path index built: ${this.fastPathIndex.length} patterns`);
    }

    /**
     * Fast-path detection for commonly recited passages
     * Checks transcript against surah beginnings and famous passages
     */
    detectFromFastPath(preprocessedText) {
        // Build fast path index if not already built
        this.buildFastPathIndex();

        // If index still null (quranData not available), return no match
        if (!this.fastPathIndex) {
            return { detected: false };
        }

        // Extract first 30 words for comparison (enough for most beginnings)
        const words = preprocessedText.split(/\s+/).filter(w => w.length > 0);
        const firstWords = words.slice(0, Math.min(30, words.length)).join(' ');

        let bestMatch = null;
        let bestSimilarity = 0;
        let topMatches = [];

        // Check against all indexed patterns
        for (const pattern of this.fastPathIndex) {
            // For all patterns, compare transcript beginning with pattern beginning
            // Extract first 30 words from pattern for fair comparison
            const patternWords = pattern.text.split(/\s+/).filter(w => w.length > 0);
            const patternFirstWords = patternWords.slice(0, Math.min(30, patternWords.length)).join(' ');

            // Calculate similarity using first 30 words of both
            const similarity = levenshteinSimilarity(firstWords, patternFirstWords);

            topMatches.push({ pattern: pattern.description, similarity });

            if (similarity > bestSimilarity) {
                bestSimilarity = similarity;
                bestMatch = pattern;
            }
        }

        // Log top 5 matches for debugging
        topMatches.sort((a, b) => b.similarity - a.similarity);
        console.log('🔍 Fast-path top matches:');
        for (let i = 0; i < Math.min(5, topMatches.length); i++) {
            console.log(`   ${i + 1}. ${topMatches[i].pattern}: ${(topMatches[i].similarity * 100).toFixed(1)}%`);
        }

        // Return if strong match found (55% threshold)
        // Lowered to handle speech recognition errors like "وسيأكل" instead of "وسع كرسيه"
        if (bestSimilarity >= 0.55) {
            return {
                detected: true,
                pattern: bestMatch,
                similarity: bestSimilarity,
                method: 'fast_path'
            };
        }

        console.log(`   ❌ Best match ${(bestSimilarity * 100).toFixed(1)}% below 55% threshold`);
        return { detected: false };
    }

    /**
     * Phase 1: Identify which surah(s) were recited
     */
    async identifySurah(preprocessedText) {
        const startTime = Date.now();

        // 🚀 FAST PATH: Check commonly recited passages first
        const fastPathResult = this.detectFromFastPath(preprocessedText);
        if (fastPathResult.detected) {
            const processingTime = Date.now() - startTime;
            console.log(`⚡ Fast-path detection: ${fastPathResult.pattern.description} (${(fastPathResult.similarity * 100).toFixed(1)}% similarity, ${processingTime}ms)`);

            return {
                success: true,
                primarySurah: {
                    id: fastPathResult.pattern.surahId,
                    name: fastPathResult.pattern.surahName,
                    confidence: fastPathResult.similarity,
                    detectionMethod: 'fast_path',
                    passageType: fastPathResult.pattern.type,
                    description: fastPathResult.pattern.description,
                    startVerse: fastPathResult.pattern.startVerse,
                    endVerse: fastPathResult.pattern.endVerse
                },
                additionalSurahs: [],
                ambiguous: false,
                processingTime
            };
        }

        // Fallback to full n-gram search
        const { '2grams': ngrams2, '3grams': ngrams3, '4grams': ngrams4 } =
            this.preprocessor.extractAllNgrams(preprocessedText);

        // Track scores per surah for each strategy
        const surahScores = {
            '2gram': new Map(),
            '3gram': new Map(),
            '4gram': new Map()
        };

        // Strategy 1: Fuzzy 2-grams (most tolerant)
        for (const ngram of ngrams2) {
            const matches = findSimilarNgrams(ngram, this.quranService.ngramIndex, 0.65);
            for (const match of matches) {
                for (const verseInfo of match.verses) {
                    const verse = this.quranService.quranData[verseInfo.verseId];
                    if (!verse) continue;

                    const surahId = verse.surah;
                    const current = surahScores['2gram'].get(surahId) || 0;
                    surahScores['2gram'].set(surahId, current + match.similarity);
                }
            }
        }

        // Strategy 2: Fuzzy 3-grams (balanced)
        for (const ngram of ngrams3) {
            const matches = findSimilarNgrams(ngram, this.quranService.ngramIndex, 0.70);
            for (const match of matches) {
                for (const verseInfo of match.verses) {
                    const verse = this.quranService.quranData[verseInfo.verseId];
                    if (!verse) continue;

                    const surahId = verse.surah;
                    const current = surahScores['3gram'].get(surahId) || 0;
                    surahScores['3gram'].set(surahId, current + match.similarity);
                }
            }
        }

        // Strategy 3: Fuzzy 4-grams (most precise)
        for (const ngram of ngrams4) {
            const matches = findSimilarNgrams(ngram, this.quranService.ngramIndex, 0.75);
            for (const match of matches) {
                for (const verseInfo of match.verses) {
                    const verse = this.quranService.quranData[verseInfo.verseId];
                    if (!verse) continue;

                    const surahId = verse.surah;
                    const current = surahScores['4gram'].get(surahId) || 0;
                    surahScores['4gram'].set(surahId, current + match.similarity);
                }
            }
        }

        // Combine scores with weighted voting
        const finalScores = new Map();
        const weights = { '2gram': 0.5, '3gram': 1.0, '4gram': 1.5 };
        const totalWeight = 3.0;

        for (const [surahId, score] of surahScores['2gram']) {
            const score2 = score / Math.max(ngrams2.length, 1);
            const score3 = (surahScores['3gram'].get(surahId) || 0) / Math.max(ngrams3.length, 1);
            const score4 = (surahScores['4gram'].get(surahId) || 0) / Math.max(ngrams4.length, 1);

            const finalScore = (score2 * weights['2gram'] +
                              score3 * weights['3gram'] +
                              score4 * weights['4gram']) / totalWeight;

            finalScores.set(surahId, finalScore);
        }

        // Sort by score
        const sorted = Array.from(finalScores.entries())
            .sort((a, b) => b[1] - a[1]);

        const processingTime = Date.now() - startTime;

        if (sorted.length === 0) {
            return {
                success: false,
                error: 'surah_not_identified',
                message: 'Could not identify any surah',
                processingTime
            };
        }

        const topScore = sorted[0][1];
        const secondScore = sorted[1]?.[1] || 0;

        // Check for ambiguous detection (multiple surahs)
        const ambiguous = secondScore >= 0.60 && (topScore - secondScore) < 0.15;

        if (topScore < 0.25) {
            return {
                success: false,
                error: 'low_confidence',
                message: 'Surah detection confidence too low',
                topCandidates: sorted.slice(0, 3).map(([surahId, score]) => ({
                    surahId,
                    surahName: this.quranService.quranData.find(v => v.surah === surahId)?.surahName,
                    confidence: score
                })),
                processingTime
            };
        }

        // Get surah info
        const primarySurahId = sorted[0][0];
        const primaryVerse = this.quranService.quranData.find(v => v.surah === primarySurahId);

        return {
            success: true,
            primarySurah: {
                id: primarySurahId,
                name: primaryVerse.surahName,
                nameEn: primaryVerse.surahNameEn,
                confidence: topScore
            },
            ambiguous,
            allDetected: ambiguous ? sorted.slice(0, 2).map(([id, score]) => ({
                surahId: id,
                confidence: score
            })) : null,
            processingTime,
            debugInfo: {
                ngrams2Count: ngrams2.length,
                ngrams3Count: ngrams3.length,
                ngrams4Count: ngrams4.length
            }
        };
    }

    /**
     * Align transcript to specific verses (used for fast-path famous passages)
     */
    async alignToSpecificVerses(preprocessedText, surahId, startVerse, endVerse) {
        const startTime = Date.now();

        // Get only the specific verses in the range
        const allSurahVerses = this.quranService.quranData.filter(v =>
            v.surah === surahId &&
            v.ayah >= startVerse &&
            v.ayah <= endVerse
        );

        const alignments = [];
        const transcriptWords = preprocessedText.split(/\s+/).filter(w => w.length > 0);

        // Align each verse in the range
        for (const verse of allSurahVerses) {
            const verseWords = verse.textNormalized.split(/\s+/);
            const alignment = this.alignWords(transcriptWords, verseWords);

            alignments.push({
                ayah: verse.ayah,
                accuracy: alignment.accuracy,
                wordsMatched: alignment.matched + alignment.fuzzy,
                wordCount: verseWords.length,
                alignment: alignment.details
            });
        }

        // For famous passages, verse range is exactly what was detected
        const verseRange = {
            startVerse,
            endVerse,
            versesInRange: endVerse - startVerse + 1
        };

        const processingTime = Date.now() - startTime;

        return {
            alignments,
            verseRange,
            processingTime
        };
    }

    /**
     * Phase 2: Align transcript to verses (simplified alignment for now)
     */
    async alignToVerses(preprocessedText, surahId) {
        const startTime = Date.now();

        // Get all verses for this surah
        const allSurahVerses = this.quranService.quranData.filter(v => v.surah === surahId);

        const alignments = [];
        const transcriptWords = preprocessedText.split(/\s+/).filter(w => w.length > 0);

        // For each verse, check how well it matches parts of the transcript
        for (const verse of allSurahVerses) {
            const verseWords = verse.textNormalized.split(/\s+/);
            const alignment = this.alignWords(transcriptWords, verseWords);

            alignments.push({
                verseId: verse.id,
                ayah: verse.ayah,
                surah: verse.surah,
                text: verse.text,
                wordCount: verseWords.length,
                wordsMatched: alignment.matched,
                wordsMissing: alignment.missing,
                wordsFuzzy: alignment.fuzzy,
                accuracy: alignment.accuracy,
                alignment: alignment.details
            });
        }

        // Detect the actual verse range that was recited
        const verseRange = this.detectVerseRange(alignments);

        // Filter alignments to only include the detected range
        const filteredAlignments = alignments.filter(a =>
            a.ayah >= verseRange.startVerse && a.ayah <= verseRange.endVerse
        );

        const processingTime = Date.now() - startTime;

        return {
            alignments: filteredAlignments,
            verseRange,
            processingTime
        };
    }

    /**
     * Detect which verses were actually recited (find the continuous range)
     */
    detectVerseRange(alignments) {
        // Find all verses with significant matches (accuracy >= 50%)
        const significantVerses = alignments
            .filter(a => a.accuracy >= 0.50)
            .map(a => ({ ayah: a.ayah, accuracy: a.accuracy }))
            .sort((a, b) => a.ayah - b.ayah);

        if (significantVerses.length === 0) {
            // No significant matches at 50%, try 40%
            const moderateVerses = alignments
                .filter(a => a.accuracy >= 0.40)
                .map(a => ({ ayah: a.ayah, accuracy: a.accuracy }))
                .sort((a, b) => a.ayah - b.ayah);

            if (moderateVerses.length === 0) {
                // Still nothing, use highest accuracy verse
                const sorted = alignments
                    .map(a => ({ ayah: a.ayah, accuracy: a.accuracy }))
                    .sort((a, b) => b.accuracy - a.accuracy);

                return {
                    startVerse: sorted[0]?.ayah || 1,
                    endVerse: sorted[0]?.ayah || 1,
                    versesInRange: 1
                };
            }

            return this.findBestRange(moderateVerses);
        }

        return this.findBestRange(significantVerses);
    }

    /**
     * Find the best continuous range from significant verses
     */
    findBestRange(significantVerses) {
        if (significantVerses.length === 0) {
            return { startVerse: 1, endVerse: 1, versesInRange: 1 };
        }

        // Extract verse numbers
        const verseNumbers = significantVerses.map(v => v.ayah);
        const minVerse = Math.min(...verseNumbers);
        const maxVerse = Math.max(...verseNumbers);
        const rangeSize = maxVerse - minVerse + 1;

        // Calculate density: how many significant verses vs total range
        const density = significantVerses.length / rangeSize;

        // If density is high (>40%), use min-max approach (handles intentional skips)
        // If density is low (<=40%), use continuous range building (handles scattered errors)
        if (density > 0.40) {
            // Dense matches - likely a continuous recitation with some skipped verses
            return {
                startVerse: minVerse,
                endVerse: maxVerse,
                versesInRange: rangeSize
            };
        } else {
            // Sparse matches - likely scattered errors, use continuous range building
            let bestRange = {
                start: significantVerses[0].ayah,
                end: significantVerses[0].ayah,
                count: 1,
                avgAccuracy: significantVerses[0].accuracy
            };

            let currentRange = {
                start: significantVerses[0].ayah,
                end: significantVerses[0].ayah,
                count: 1,
                totalAccuracy: significantVerses[0].accuracy
            };

            for (let i = 1; i < significantVerses.length; i++) {
                const verse = significantVerses[i];
                const prevVerse = significantVerses[i - 1];

                // If within 3 verses of previous, extend current range
                if (verse.ayah - prevVerse.ayah <= 3) {
                    currentRange.end = verse.ayah;
                    currentRange.count = currentRange.end - currentRange.start + 1;
                    currentRange.totalAccuracy += verse.accuracy;
                    const avgAccuracy = currentRange.totalAccuracy / currentRange.count;

                    // Update best if this range has more verses OR similar count but better accuracy
                    if (currentRange.count > bestRange.count ||
                        (currentRange.count === bestRange.count && avgAccuracy > bestRange.avgAccuracy)) {
                        bestRange = {
                            start: currentRange.start,
                            end: currentRange.end,
                            count: currentRange.count,
                            avgAccuracy
                        };
                    }
                } else {
                    // Gap too large, start new range
                    currentRange = {
                        start: verse.ayah,
                        end: verse.ayah,
                        count: 1,
                        totalAccuracy: verse.accuracy
                    };
                }
            }

            return {
                startVerse: bestRange.start,
                endVerse: bestRange.end,
                versesInRange: bestRange.count
            };
        }
    }

    /**
     * Subsequence matching with gaps - more robust for errors
     * Finds verse words in transcript maintaining order but allowing gaps
     */
    alignWords(transcriptWords, verseWords) {
        // Handle edge cases
        if (verseWords.length === 0) {
            return { matched: 0, fuzzy: 0, missing: 0, accuracy: 0, details: [] };
        }

        if (transcriptWords.length === 0) {
            return {
                matched: 0,
                fuzzy: 0,
                missing: verseWords.length,
                accuracy: 0,
                details: verseWords.map((word, i) => ({
                    index: i,
                    expected: word,
                    heard: null,
                    similarity: 0,
                    matched: false,
                    missing: true
                }))
            };
        }

        // Subsequence matching: Find each verse word in transcript (in order, allowing gaps)
        let transcriptPos = 0; // Current position in transcript
        let matched = 0;
        let fuzzy = 0;
        let missing = 0;
        const details = [];

        for (let i = 0; i < verseWords.length; i++) {
            const expected = verseWords[i];
            let bestMatch = null;
            let bestSimilarity = 0;
            let bestPos = -1;

            // Search forward from current position in transcript
            for (let j = transcriptPos; j < transcriptWords.length; j++) {
                const heard = transcriptWords[j];
                const similarity = levenshteinSimilarity(expected, heard);

                if (similarity > bestSimilarity) {
                    bestSimilarity = similarity;
                    bestMatch = heard;
                    bestPos = j;
                }

                // If exact match found, stop searching
                if (similarity === 1.0) {
                    break;
                }
            }

            // Process the best match found
            if (bestSimilarity === 1.0) {
                // Exact match
                matched++;
                details.push({
                    index: i,
                    expected,
                    heard: bestMatch,
                    similarity: bestSimilarity,
                    matched: true,
                    transcriptPos: bestPos
                });
                transcriptPos = bestPos + 1; // Move past this match
            } else if (bestSimilarity >= 0.75) {
                // Fuzzy match
                fuzzy++;
                matched++;
                details.push({
                    index: i,
                    expected,
                    heard: bestMatch,
                    similarity: bestSimilarity,
                    matched: true,
                    fuzzyMatch: true,
                    transcriptPos: bestPos
                });
                transcriptPos = bestPos + 1; // Move past this match
            } else {
                // No good match found
                missing++;
                details.push({
                    index: i,
                    expected,
                    heard: bestMatch,
                    similarity: bestSimilarity,
                    matched: false,
                    missing: true,
                    transcriptPos: bestPos
                });
                // Don't advance transcriptPos - might find next word nearby
            }
        }

        const accuracy = verseWords.length > 0 ? matched / verseWords.length : 0;

        return { matched, fuzzy, missing, accuracy, details };
    }

    /**
     * Phase 3: Detect skipped verses
     */
    detectSkips(alignments) {
        const skipped = [];
        const recited = [];
        const partial = [];

        for (const alignment of alignments) {
            if (alignment.accuracy < 0.25) {
                skipped.push({
                    ayah: alignment.ayah,
                    text: alignment.text,
                    accuracy: alignment.accuracy
                });
            } else if (alignment.accuracy < 0.70) {
                partial.push({
                    ayah: alignment.ayah,
                    accuracy: alignment.accuracy,
                    missingWords: alignment.alignment
                        .filter(w => w.missing)
                        .map(w => w.expected)
                });
            } else {
                recited.push({
                    ayah: alignment.ayah,
                    accuracy: alignment.accuracy
                });
            }
        }

        return {
            skippedVerses: skipped,
            recitedVerses: recited,
            partialVerses: partial
        };
    }

    /**
     * Phase 4: Generate comprehensive report
     */
    generateReport(surahDetection, alignments, skipDetection, verseRange, metadata) {
        // Calculate overall accuracy
        const totalWords = alignments.reduce((sum, a) => sum + a.wordCount, 0);
        const matchedWords = alignments.reduce((sum, a) => sum + a.wordsMatched, 0);
        const overallAccuracy = totalWords > 0 ? matchedWords / totalWords : 0;

        // Generate mistake list
        const mistakes = [];

        // Add skipped verses
        for (const skip of skipDetection.skippedVerses) {
            mistakes.push({
                type: 'skipped_verse',
                ayah: skip.ayah,
                suggestion: `You skipped verse ${skip.ayah}: ${skip.text}`
            });
        }

        // Add partial verses with missing words
        for (const partial of skipDetection.partialVerses) {
            if (partial.missingWords.length > 0) {
                mistakes.push({
                    type: 'missing_words',
                    ayah: partial.ayah,
                    words: partial.missingWords,
                    suggestion: `In verse ${partial.ayah}, you missed: ${partial.missingWords.join(', ')}`
                });
            }
        }

        // Generate recommendations
        const recommendations = [];
        if (skipDetection.skippedVerses.length > 0) {
            recommendations.push(`Review ${skipDetection.skippedVerses.length} skipped verse(s)`);
        }
        if (skipDetection.partialVerses.length > 0) {
            recommendations.push(`Practice ${skipDetection.partialVerses.length} partially recited verse(s)`);
        }
        if (overallAccuracy < 0.70) {
            recommendations.push('Overall accuracy is low - try reciting more slowly and clearly');
        }

        return {
            success: true,
            summary: {
                surahsDetected: 1,
                primarySurah: surahDetection.primarySurah,
                verseRange: {
                    start: verseRange.startVerse,
                    end: verseRange.endVerse,
                    count: verseRange.versesInRange
                },
                versesInRange: verseRange.versesInRange,
                versesRecited: skipDetection.recitedVerses.length,
                versesSkipped: skipDetection.skippedVerses.map(v => v.ayah),
                overallAccuracy: Math.round(overallAccuracy * 100) / 100,
                duration: metadata.duration,
                processingTime: metadata.totalProcessingTime
            },
            verses: alignments.map(a => ({
                ayah: a.ayah,
                status: a.accuracy >= 0.90 ? 'perfect' :
                       a.accuracy >= 0.70 ? 'good' :
                       a.accuracy >= 0.25 ? 'partial' : 'skipped',
                accuracy: Math.round(a.accuracy * 100) / 100,
                wordCount: a.wordCount,
                wordsMatched: a.wordsMatched,
                wordsMissing: a.wordsMissing,
                text: a.text
            })),
            mistakes,
            recommendations
        };
    }

    /**
     * Main analysis pipeline - runs all 4 phases
     */
    async analyzeFull(rawTranscript, metadata = {}) {
        const pipelineStart = Date.now();

        try {
            // Preprocessing
            const preprocessed = this.preprocessor.preprocess(rawTranscript);

            if (preprocessed.wordCount < 5) {
                return {
                    success: false,
                    error: 'insufficient_data',
                    message: 'Transcript too short for analysis (minimum 5 words after cleaning)',
                    wordCount: preprocessed.wordCount
                };
            }

            // Phase 1: Identify Surah
            const surahDetection = await this.identifySurah(preprocessed.normalized);

            if (!surahDetection.success) {
                return surahDetection;
            }

            // Check if fast-path detected a famous passage
            // If so, only align to those specific verses, not the entire surah
            let alignments, verseRange, alignTime;

            if (surahDetection.primarySurah.detectionMethod === 'fast_path' &&
                surahDetection.primarySurah.passageType === 'famous_passage') {

                // Fast-path detected a specific famous passage
                // Only align to those specific verses
                const result = await this.alignToSpecificVerses(
                    preprocessed.normalized,
                    surahDetection.primarySurah.id,
                    surahDetection.primarySurah.startVerse,
                    surahDetection.primarySurah.endVerse
                );

                alignments = result.alignments;
                verseRange = result.verseRange;
                alignTime = result.processingTime;

            } else {
                // Normal flow: align to all verses in the surah
                const result = await this.alignToVerses(
                    preprocessed.normalized,
                    surahDetection.primarySurah.id
                );

                alignments = result.alignments;
                verseRange = result.verseRange;
                alignTime = result.processingTime;
            }

            // Phase 3: Detect skips
            const skipDetection = this.detectSkips(alignments);

            // Phase 4: Generate report
            const totalProcessingTime = Date.now() - pipelineStart;
            const report = this.generateReport(
                surahDetection,
                alignments,
                skipDetection,
                verseRange,
                {
                    ...metadata,
                    totalProcessingTime
                }
            );

            return report;

        } catch (error) {
            console.error('Analysis error:', error);
            return {
                success: false,
                error: 'analysis_failed',
                message: error.message
            };
        }
    }
}

module.exports = RecitationAnalyzer;
