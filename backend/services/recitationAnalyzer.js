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
    }

    /**
     * Phase 1: Identify which surah(s) were recited
     */
    async identifySurah(preprocessedText) {
        const startTime = Date.now();
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

        if (topScore < 0.30) {
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
     * Phase 2: Align transcript to verses (simplified alignment for now)
     */
    async alignToVerses(preprocessedText, surahId) {
        const startTime = Date.now();

        // Get all verses for this surah
        const surahVerses = this.quranService.quranData.filter(v => v.surah === surahId);

        const alignments = [];
        const transcriptWords = preprocessedText.split(/\s+/).filter(w => w.length > 0);

        // For each verse, check how well it matches parts of the transcript
        for (const verse of surahVerses) {
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
                accuracy: alignment.matched / verseWords.length,
                alignment: alignment.details
            });
        }

        const processingTime = Date.now() - startTime;

        return {
            alignments,
            processingTime
        };
    }

    /**
     * Simple word-by-word alignment
     */
    alignWords(transcriptWords, verseWords) {
        let matched = 0;
        let fuzzy = 0;
        let missing = 0;
        const details = [];

        // Simple approach: try to find each verse word in transcript
        for (let i = 0; i < verseWords.length; i++) {
            const expected = verseWords[i];
            let found = false;
            let bestMatch = null;
            let bestSimilarity = 0;

            // Look for exact or fuzzy match in transcript
            for (let j = 0; j < transcriptWords.length; j++) {
                const heard = transcriptWords[j];
                const similarity = levenshteinSimilarity(expected, heard);

                if (similarity === 1.0) {
                    // Exact match
                    found = true;
                    matched++;
                    details.push({ index: i, expected, heard, similarity, matched: true });
                    break;
                } else if (similarity >= 0.75 && similarity > bestSimilarity) {
                    // Fuzzy match candidate
                    bestMatch = heard;
                    bestSimilarity = similarity;
                }
            }

            if (!found) {
                if (bestMatch && bestSimilarity >= 0.75) {
                    // Use fuzzy match
                    fuzzy++;
                    matched++; // Count as matched
                    details.push({
                        index: i,
                        expected,
                        heard: bestMatch,
                        similarity: bestSimilarity,
                        matched: true,
                        fuzzyMatch: true
                    });
                } else {
                    // Missing word
                    missing++;
                    details.push({
                        index: i,
                        expected,
                        heard: null,
                        similarity: 0,
                        matched: false,
                        missing: true
                    });
                }
            }
        }

        return { matched, fuzzy, missing, details };
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
    generateReport(surahDetection, alignments, skipDetection, metadata) {
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
                versesInRange: alignments.length,
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

            // Phase 2: Align to verses
            const { alignments, processingTime: alignTime } = await this.alignToVerses(
                preprocessed.normalized,
                surahDetection.primarySurah.id
            );

            // Phase 3: Detect skips
            const skipDetection = this.detectSkips(alignments);

            // Phase 4: Generate report
            const totalProcessingTime = Date.now() - pipelineStart;
            const report = this.generateReport(
                surahDetection,
                alignments,
                skipDetection,
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
