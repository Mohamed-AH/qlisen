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
            // Get first 5 verses of the surah (cover common recitation lengths)
            const surahVerses = this.quranService.quranData.filter(v => v.surah === surahId);
            const surahName = surahVerses[0].surahName;

            // Index multiple verse ranges to cover common recitation patterns
            // Users often recite 1, 1-2, 1-3, or 1-5 verses from the beginning
            const rangesToIndex = [
                { count: 1, desc: 'آية' },      // Verse 1 only
                { count: 2, desc: 'آيات' },     // Verses 1-2
                { count: 3, desc: 'آيات' },     // Verses 1-3
                { count: 5, desc: 'آيات' }      // Verses 1-5
            ];

            for (const range of rangesToIndex) {
                const versesToInclude = surahVerses.slice(0, Math.min(range.count, surahVerses.length));

                // Skip if we don't have enough verses
                if (versesToInclude.length < range.count) {
                    continue;
                }

                const combinedText = versesToInclude.map(v => v.textNormalized).join(' ');
                const endAyah = versesToInclude[versesToInclude.length - 1].ayah;

                const description = range.count === 1
                    ? `بداية ${surahName} (آية ${firstAyah})`
                    : `بداية ${surahName} (${range.desc} ${firstAyah}-${endAyah})`;

                this.fastPathIndex.push({
                    type: 'surah_beginning',
                    surahId,
                    surahName,
                    startVerse: firstAyah,
                    endVerse: endAyah,
                    text: combinedText,
                    description
                });
            }
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

        // FAST-PATH ONLY CHECKS FIRST FEW WORDS (not entire recitation)
        const FAST_PATH_WORD_LIMIT = 15;  // Maximum words to check for fast-path
        const transcriptWords = preprocessedText.split(/\s+/).filter(w => w.length > 0);
        const limitedTranscript = transcriptWords.slice(0, FAST_PATH_WORD_LIMIT).join(' ');

        console.log(`🚀 Fast-path: Checking first ${Math.min(transcriptWords.length, FAST_PATH_WORD_LIMIT)} words only`);

        let bestMatch = null;
        let bestSimilarity = 0;
        let topMatches = [];

        // Check against all indexed patterns
        for (const pattern of this.fastPathIndex) {
            // Count words in pattern
            const patternWords = pattern.text.split(/\s+/).filter(w => w.length > 0);
            const patternWordCount = patternWords.length;

            // Extract same number of words from LIMITED transcript for fair comparison
            const limitedWords = limitedTranscript.split(/\s+/).filter(w => w.length > 0);
            const transcriptSlice = limitedWords.slice(0, patternWordCount).join(' ');

            // Calculate similarity using equal-length strings
            const similarity = levenshteinSimilarity(transcriptSlice, pattern.text);

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
            // 🔍 Special handling for Al-Fatiha verse 1 (Bismillah)
            // Many people say Bismillah before reciting any surah, but Bismillah is only
            // verse 1 of Al-Fatiha. We need to verify this is actually Al-Fatiha.
            if (bestMatch.surahId === 1 && bestMatch.startVerse === 1 && bestMatch.endVerse === 1) {
                console.log('⚠️  Bismillah detected - verifying it\'s actually Al-Fatiha...');

                // Get Al-Fatiha verse 2 text to verify
                const fatihaVerse2 = this.quranService.quranData.find(v => v.surah === 1 && v.ayah === 2);
                if (fatihaVerse2) {
                    // Check if the words AFTER Bismillah match Al-Fatiha verse 2
                    const transcriptWords = preprocessedText.split(/\s+/).filter(w => w.length > 0);
                    const bismillahWords = bestMatch.text.split(/\s+/).filter(w => w.length > 0);

                    // Get next 5-7 words after Bismillah
                    const nextWords = transcriptWords.slice(bismillahWords.length, bismillahWords.length + 7).join(' ');
                    const verse2Words = fatihaVerse2.textNormalized.split(/\s+/).filter(w => w.length > 0).slice(0, 7).join(' ');

                    // Calculate similarity of the next words
                    const nextSimilarity = levenshteinSimilarity(nextWords, verse2Words);

                    console.log(`   Next words similarity with Fatiha verse 2: ${(nextSimilarity * 100).toFixed(1)}%`);

                    // If next words DON'T match Al-Fatiha verse 2, this is probably Bismillah + another surah
                    if (nextSimilarity < 0.50) {
                        console.log('   ❌ Next words don\'t match Al-Fatiha - stripping Bismillah and re-matching');

                        // Strip Bismillah and try matching again
                        const withoutBismillah = transcriptWords.slice(bismillahWords.length).join(' ');

                        // Re-run matching without Bismillah
                        let secondBestMatch = null;
                        let secondBestSimilarity = 0;

                        for (const pattern of this.fastPathIndex) {
                            // Skip Al-Fatiha verse 1 to avoid matching Bismillah again
                            if (pattern.surahId === 1 && pattern.startVerse === 1 && pattern.endVerse === 1) {
                                continue;
                            }

                            const patternWords = pattern.text.split(/\s+/).filter(w => w.length > 0);
                            const patternWordCount = patternWords.length;
                            const transcriptSlice = withoutBismillah.split(/\s+/).filter(w => w.length > 0).slice(0, patternWordCount).join(' ');

                            const similarity = levenshteinSimilarity(transcriptSlice, pattern.text);

                            if (similarity > secondBestSimilarity) {
                                secondBestSimilarity = similarity;
                                secondBestMatch = pattern;
                            }
                        }

                        if (secondBestSimilarity >= 0.55) {
                            console.log(`   ✅ Found better match without Bismillah: ${secondBestMatch.description} (${(secondBestSimilarity * 100).toFixed(1)}%)`);
                            return {
                                detected: true,
                                pattern: secondBestMatch,
                                similarity: secondBestSimilarity,
                                method: 'fast_path',
                                bismillahStripped: true
                            };
                        }
                    } else {
                        console.log('   ✅ Next words match Al-Fatiha verse 2 - this is Al-Fatiha');
                    }
                }
            }

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
     * N-Gram only detection (skips fast-path)
     * Used in PASS 2 of multi-pass verification to avoid re-running fast-path
     */
    async identifySurahNgramOnly(preprocessedText) {
        const startTime = Date.now();

        console.log('🔬 Running n-gram analysis (skipping fast-path)');

        // Extract n-grams
        const { '2grams': ngrams2, '3grams': ngrams3, '4grams': ngrams4 } =
            this.preprocessor.extractAllNgrams(preprocessedText);

        console.log(`📊 N-gram extraction:`);
        console.log(`   2-grams: ${ngrams2.length} (e.g., "${ngrams2.slice(0, 3).join('", "')}")`);
        console.log(`   3-grams: ${ngrams3.length} (e.g., "${ngrams3.slice(0, 3).join('", "')}")`);
        console.log(`   4-grams: ${ngrams4.length} (e.g., "${ngrams4.slice(0, 3).join('", "')}")`);
        console.log('');

        // Track scores per surah for each strategy
        const surahScores = {
            '2gram': new Map(),
            '3gram': new Map(),
            '4gram': new Map()
        };

        // Strategy 1: Fuzzy 2-grams (most tolerant)
        for (const ngram of ngrams2) {
            const matches = findSimilarNgrams(
                ngram,
                this.quranService.ngramIndex,
                0.65,
                this.quranService.firstWordIndex  // Use first-word index for performance
            );
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
            const matches = findSimilarNgrams(
                ngram,
                this.quranService.ngramIndex,
                0.70,
                this.quranService.firstWordIndex  // Use first-word index for performance
            );
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
            const matches = findSimilarNgrams(
                ngram,
                this.quranService.ngramIndex,
                0.75,
                this.quranService.firstWordIndex  // Use first-word index for performance
            );
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
        // IMPORTANT: Normalize by surah length to prevent long surahs (Al-Baqarah) from dominating
        const finalScores = new Map();
        const weights = { '2gram': 0.5, '3gram': 1.0, '4gram': 1.5 };
        const totalWeight = 3.0;

        for (const [surahId, score] of surahScores['2gram']) {
            // Get surah length (number of verses)
            const surahVerses = this.quranService.quranData.filter(v => v.surah === surahId);
            const surahLength = surahVerses.length;

            // Normalize by ngram count AND surah length
            const score2 = score / Math.max(ngrams2.length, 1);
            const score3 = (surahScores['3gram'].get(surahId) || 0) / Math.max(ngrams3.length, 1);
            const score4 = (surahScores['4gram'].get(surahId) || 0) / Math.max(ngrams4.length, 1);

            // Calculate weighted average
            const rawScore = (score2 * weights['2gram'] +
                            score3 * weights['3gram'] +
                            score4 * weights['4gram']) / totalWeight;

            // Normalize by surah length (longer surahs get penalized)
            // Use logarithmic scale to balance long/short surahs better
            // OLD: sqrt(surahLength/10) was too harsh (Baqarah: 5.35x, Naziat: 2.14x)
            // NEW: log(surahLength+1)/2 is more balanced (Baqarah: 2.86x, Naziat: 1.92x)
            const lengthNormalizationFactor = Math.log(surahLength + 1) / 2;
            const finalScore = rawScore / lengthNormalizationFactor;

            finalScores.set(surahId, finalScore);
        }

        if (finalScores.size === 0) {
            return {
                success: false,
                error: 'No matching surahs found',
                message: 'Could not identify any surah from the transcript'
            };
        }

        // Sort by score and get top matches
        const sorted = Array.from(finalScores.entries()).sort((a, b) => b[1] - a[1]);
        const topScore = sorted[0][1];
        const secondScore = sorted.length > 1 ? sorted[1][1] : 0;

        // Log top 10 candidates for debugging
        console.log('📊 N-gram top 10 candidates (with length normalization):');
        for (let i = 0; i < Math.min(10, sorted.length); i++) {
            const [surahId, score] = sorted[i];
            const verse = this.quranService.quranData.find(v => v.surah === surahId);
            console.log(`   ${i + 1}. ${verse.surahName} (${surahId}): ${(score * 100).toFixed(1)}%`);
        }

        // Check if result is ambiguous (top 2 scores are very close)
        const ambiguous = sorted.length > 1 && (topScore - secondScore) < 0.05;

        if (ambiguous) {
            console.log(`⚠️ N-gram result ambiguous: Top 2 scores very close`);
        }

        // Get surah info
        const primarySurahId = sorted[0][0];
        const primaryVerse = this.quranService.quranData.find(v => v.surah === primarySurahId);

        const processingTime = Date.now() - startTime;
        console.log(`✅ N-gram winner: ${primaryVerse.surahName} (${(topScore * 100).toFixed(1)}% confidence, ${processingTime}ms)`);

        return {
            success: true,
            primarySurah: {
                id: primarySurahId,
                name: primaryVerse.surahName,
                nameEn: primaryVerse.surahNameEn,
                confidence: topScore,
                detectionMethod: 'ngram'
            },
            ambiguous,
            processingTime
        };
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
            const matches = findSimilarNgrams(
                ngram,
                this.quranService.ngramIndex,
                0.65,
                this.quranService.firstWordIndex  // Use first-word index for performance
            );
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
            const matches = findSimilarNgrams(
                ngram,
                this.quranService.ngramIndex,
                0.70,
                this.quranService.firstWordIndex  // Use first-word index for performance
            );
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
            const matches = findSimilarNgrams(
                ngram,
                this.quranService.ngramIndex,
                0.75,
                this.quranService.firstWordIndex  // Use first-word index for performance
            );
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
                text: verse.text,
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
     * Detect repeated words/phrases in recitation
     * Common when users correct themselves or practice
     *
     * @param {Array<string>} transcriptWords - Array of words from transcript
     * @returns {Object} { repeats: [...], cleanedWords: [...], stats: {...} }
     */
    detectRepeats(transcriptWords) {
        const repeats = [];
        const cleanedWords = [];
        let i = 0;

        console.log('🔄 Detecting Repeated Sequences');
        console.log('─'.repeat(55));

        while (i < transcriptWords.length) {
            let repeatFound = false;

            // Try to find repeats of different lengths (longest first)
            // Check up to 10-word sequences
            for (let seqLength = Math.min(10, Math.floor((transcriptWords.length - i) / 2)); seqLength >= 2; seqLength--) {
                const currentSeq = transcriptWords.slice(i, i + seqLength);
                const nextSeq = transcriptWords.slice(i + seqLength, i + seqLength * 2);

                // Check if next sequence matches current sequence
                if (currentSeq.length === nextSeq.length &&
                    currentSeq.every((word, idx) => word === nextSeq[idx])) {

                    // Found a repeat!
                    const repeatType = this.classifyRepeat(currentSeq.length);

                    repeats.push({
                        type: repeatType,
                        words: currentSeq,
                        wordCount: currentSeq.length,
                        position: i,
                        repetitions: 2, // Could be extended to detect 3+ repeats
                        feedback: this.getRepeatFeedback(repeatType, currentSeq)
                    });

                    console.log(`   ✓ Found ${repeatType} repeat at position ${i}:`);
                    console.log(`     "${currentSeq.join(' ')}" (${seqLength} words)`);

                    // Add only the first occurrence to cleaned words
                    cleanedWords.push(...currentSeq);

                    // Skip both occurrences
                    i += seqLength * 2;
                    repeatFound = true;
                    break;
                }
            }

            // Check for single word repeat
            if (!repeatFound && i + 1 < transcriptWords.length &&
                transcriptWords[i] === transcriptWords[i + 1]) {

                repeats.push({
                    type: 'single_word',
                    words: [transcriptWords[i]],
                    wordCount: 1,
                    position: i,
                    repetitions: 2,
                    feedback: `✅ Good! You repeated "${transcriptWords[i]}" - shows careful recitation`
                });

                console.log(`   ✓ Found single word repeat: "${transcriptWords[i]}"`);

                // Add only first occurrence
                cleanedWords.push(transcriptWords[i]);
                i += 2;
                repeatFound = true;
            }

            // No repeat found, add word and continue
            if (!repeatFound) {
                cleanedWords.push(transcriptWords[i]);
                i++;
            }
        }

        const stats = {
            originalWordCount: transcriptWords.length,
            cleanedWordCount: cleanedWords.length,
            repeatsDetected: repeats.length,
            wordsRemoved: transcriptWords.length - cleanedWords.length
        };

        if (repeats.length > 0) {
            console.log(`\n📊 Repeat Detection Summary:`);
            console.log(`   Total repeats found: ${repeats.length}`);
            console.log(`   Words removed: ${stats.wordsRemoved}`);
            console.log(`   Original: ${stats.originalWordCount} words → Cleaned: ${stats.cleanedWordCount} words`);
        } else {
            console.log(`   No repeats detected`);
        }
        console.log('');

        return {
            repeats,
            cleanedWords,
            stats
        };
    }

    /**
     * Classify the type of repeat based on sequence length
     */
    classifyRepeat(wordCount) {
        if (wordCount === 1) return 'single_word';
        if (wordCount >= 2 && wordCount <= 3) return 'correction';
        if (wordCount >= 4 && wordCount <= 7) return 'phrase';
        return 'verse_section';
    }

    /**
     * Generate positive feedback for repeats
     */
    getRepeatFeedback(type, words) {
        const phrase = words.join(' ');

        switch(type) {
            case 'single_word':
                return `✅ Good! You repeated "${phrase}" - shows careful recitation`;
            case 'correction':
                return `✅ Self-correction: "${phrase}" - this shows you're paying attention`;
            case 'phrase':
                return `✅ You repeated "${phrase}" - likely practicing this phrase`;
            case 'verse_section':
                return `✅ You repeated a section - this is normal during memorization practice`;
            default:
                return `✅ Repeat detected - this is okay during practice`;
        }
    }

    /**
     * Map transcript word positions to verse numbers based on alignment results
     * Uses alignment data to determine which verse each word belongs to
     *
     * @param {Array} alignments - Alignment results from alignToVerses/alignToSpecificVerses
     * @param {number} transcriptWordCount - Total words in transcript
     * @returns {Array<number>} - Array where index = word position, value = verse number (ayah)
     */
    mapWordsToVerses(alignments, transcriptWordCount) {
        const wordToVerse = new Array(transcriptWordCount).fill(null);

        // Filter to verses that were actually recited (accuracy >= 40%)
        const recitedVerses = alignments.filter(v => v.accuracy >= 0.40);

        if (recitedVerses.length === 0) {
            return wordToVerse; // All nulls if no verses detected
        }

        // Sort by verse number
        recitedVerses.sort((a, b) => a.ayah - b.ayah);

        // Distribute transcript words proportionally across recited verses
        let wordPos = 0;

        for (let i = 0; i < recitedVerses.length; i++) {
            const verse = recitedVerses[i];
            const verseWordCount = verse.wordCount;

            // Estimate how many transcript words belong to this verse
            // Use verse word count as approximation (accounting for potential mistakes)
            const estimatedTranscriptWords = Math.ceil(verseWordCount * 1.2); // Allow 20% extra for mistakes

            // Assign this verse number to the next N transcript words
            const wordsToAssign = Math.min(estimatedTranscriptWords, transcriptWordCount - wordPos);

            for (let j = 0; j < wordsToAssign; j++) {
                if (wordPos < transcriptWordCount) {
                    wordToVerse[wordPos] = verse.ayah;
                    wordPos++;
                }
            }
        }

        // Fill any remaining words with the last verse
        const lastVerse = recitedVerses[recitedVerses.length - 1];
        for (let i = wordPos; i < transcriptWordCount; i++) {
            wordToVerse[i] = lastVerse.ayah;
        }

        return wordToVerse;
    }

    /**
     * Check if a repeated sequence is natural Quranic repetition
     * Verifies if the sequence appears naturally in multiple verses
     *
     * @param {Array<string>} words - The repeated word sequence
     * @param {number} firstVerse - Verse number of first occurrence
     * @param {number} secondVerse - Verse number of second occurrence
     * @param {number} surahId - Surah ID
     * @param {number} firstPos - Position of first occurrence in transcript
     * @param {number} secondPos - Position of second occurrence in transcript
     * @returns {boolean} - True if this is natural Quranic repetition
     */
    isNaturalQuranRepetition(words, firstVerse, secondVerse, surahId, firstPos, secondPos) {
        // If both occurrences are in the same verse, it's NOT natural (user correction)
        if (firstVerse === secondVerse) {
            return false;
        }

        // If occurrences are immediately consecutive or very close together,
        // it's likely a user stutter/correction, not natural verse spanning
        const wordDistance = secondPos - (firstPos + words.length);
        if (wordDistance <= 2) {  // Allow max 2 words between repetitions for natural
            return false;  // Too close together = user correction
        }

        // Get the actual verse texts from Quran
        const verse1Data = this.quranService.quranData.find(v =>
            v.surah === surahId && v.ayah === firstVerse
        );
        const verse2Data = this.quranService.quranData.find(v =>
            v.surah === surahId && v.ayah === secondVerse
        );

        if (!verse1Data || !verse2Data) {
            return false; // Can't verify, assume not natural
        }

        // Join the repeated words into a sequence
        const sequence = words.join(' ');

        // Check if this sequence appears in both verse texts
        const inVerse1 = verse1Data.textNormalized.includes(sequence);
        const inVerse2 = verse2Data.textNormalized.includes(sequence);

        // If the sequence naturally appears in both verses, it's natural Quranic repetition
        return inVerse1 && inVerse2;
    }

    /**
     * Detect repeats with verse boundary awareness
     * Distinguishes between user corrections and natural Quranic repetition
     *
     * @param {Array<string>} transcriptWords - Transcript words
     * @param {Array} alignments - Alignment results (optional, for verse context)
     * @param {number} surahId - Surah ID (optional, for verse verification)
     * @returns {Object} - { repeats, cleanedWords, stats }
     */
    detectRepeatsWithVerseContext(transcriptWords, alignments = null, surahId = null) {
        const repeats = [];
        const cleanedWords = [];
        let i = 0;

        // Build word-to-verse mapping if we have alignment data
        const wordToVerse = alignments ? this.mapWordsToVerses(alignments, transcriptWords.length) : null;

        while (i < transcriptWords.length) {
            let repeatFound = false;

            // Try to find repeats of different lengths (longest first)
            for (let seqLength = Math.min(10, Math.floor((transcriptWords.length - i) / 2)); seqLength >= 2; seqLength--) {
                const currentSeq = transcriptWords.slice(i, i + seqLength);
                const nextSeq = transcriptWords.slice(i + seqLength, i + seqLength * 2);

                if (currentSeq.length === nextSeq.length &&
                    currentSeq.every((word, idx) => word === nextSeq[idx])) {

                    // Found a potential repeat
                    // Check if this is natural Quranic repetition
                    let isNatural = false;

                    if (wordToVerse && surahId) {
                        const firstVerse = wordToVerse[i];
                        const secondVerse = wordToVerse[i + seqLength];

                        if (firstVerse !== null && secondVerse !== null) {
                            isNatural = this.isNaturalQuranRepetition(
                                currentSeq,
                                firstVerse,
                                secondVerse,
                                surahId,
                                i,  // first position
                                i + seqLength  // second position
                            );
                        }
                    }

                    if (!isNatural) {
                        // User correction - record it
                        const repeatType = this.classifyRepeat(currentSeq.length);
                        repeats.push({
                            type: repeatType,
                            words: currentSeq,
                            wordCount: currentSeq.length,
                            position: i,
                            repetitions: 2,
                            feedback: this.getRepeatFeedback(repeatType, currentSeq)
                        });
                    }

                    // Add to cleaned words (keep only one occurrence)
                    cleanedWords.push(...currentSeq);
                    i += seqLength * 2;
                    repeatFound = true;
                    break;
                }
            }

            // Check for single word repeat
            if (!repeatFound && i + 1 < transcriptWords.length &&
                transcriptWords[i] === transcriptWords[i + 1]) {

                // Check if this is natural Quranic repetition
                let isNatural = false;

                if (wordToVerse && surahId) {
                    const firstVerse = wordToVerse[i];
                    const secondVerse = wordToVerse[i + 1];

                    if (firstVerse !== null && secondVerse !== null) {
                        isNatural = this.isNaturalQuranRepetition(
                            [transcriptWords[i]],
                            firstVerse,
                            secondVerse,
                            surahId,
                            i,  // first position
                            i + 1  // second position
                        );
                    }
                }

                if (!isNatural) {
                    // User correction
                    repeats.push({
                        type: 'single_word',
                        words: [transcriptWords[i]],
                        wordCount: 1,
                        position: i,
                        repetitions: 2,
                        feedback: `✅ Good! You repeated "${transcriptWords[i]}" - shows careful recitation`
                    });
                }

                cleanedWords.push(transcriptWords[i]);
                i += 2;
                repeatFound = true;
            }

            if (!repeatFound) {
                cleanedWords.push(transcriptWords[i]);
                i++;
            }
        }

        const stats = {
            originalWordCount: transcriptWords.length,
            cleanedWordCount: cleanedWords.length,
            wordsRemoved: transcriptWords.length - cleanedWords.length,
            repeatsDetected: repeats.length
        };

        return { repeats, cleanedWords, stats };
    }

    /**
     * Phase 2: Align transcript to verses (simplified alignment for now)
     */
    async alignToVerses(preprocessedText, surahId) {
        const startTime = Date.now();

        console.log('🔍 Step 1: Word-by-Word Alignment');
        console.log('─'.repeat(55));

        // Get all verses for this surah
        const allSurahVerses = this.quranService.quranData.filter(v => v.surah === surahId);
        const transcriptWords = preprocessedText.split(/\s+/).filter(w => w.length > 0);

        console.log(`   Surah: ${allSurahVerses[0]?.surahName} (ID: ${surahId})`);
        console.log(`   Total verses in surah: ${allSurahVerses.length}`);
        console.log(`   Transcript words: ${transcriptWords.length}`);
        console.log(`   Analyzing each verse...\n`);

        const alignments = [];
        let debugCount = 0;

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

            // DEBUG: Show first 3 verses and any with accuracy >= 50%
            if (debugCount < 3 || alignment.accuracy >= 0.50) {
                const status = alignment.accuracy >= 0.90 ? '✅' :
                              alignment.accuracy >= 0.70 ? '⚠️' :
                              alignment.accuracy >= 0.50 ? '🟨' : '❌';
                console.log(`   [Verse ${verse.ayah}] ${status} Accuracy: ${(alignment.accuracy * 100).toFixed(1)}% (${alignment.matched}/${verseWords.length} words)`);
                if (debugCount < 3) {
                    console.log(`      Text: ${verse.text.substring(0, 60)}...`);
                }
            }
            debugCount++;
        }
        console.log();

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
        console.log('🔍 Step 2: Detect Verse Range');
        console.log('─'.repeat(55));

        // Find all verses with significant matches (accuracy >= 50%)
        const significantVerses = alignments
            .filter(a => a.accuracy >= 0.50)
            .map(a => ({ ayah: a.ayah, accuracy: a.accuracy }))
            .sort((a, b) => a.ayah - b.ayah);

        console.log(`   Looking for verses with accuracy >= 50%...`);
        console.log(`   Found ${significantVerses.length} significant verses`);

        if (significantVerses.length === 0) {
            console.log(`   ⚠️ No verses >= 50%, trying >= 40%...`);

            // No significant matches at 50%, try 40%
            const moderateVerses = alignments
                .filter(a => a.accuracy >= 0.40)
                .map(a => ({ ayah: a.ayah, accuracy: a.accuracy }))
                .sort((a, b) => a.ayah - b.ayah);

            console.log(`   Found ${moderateVerses.length} moderate verses (40-50%)`);

            if (moderateVerses.length === 0) {
                console.log(`   ⚠️ No verses >= 40%, using highest accuracy verse...`);

                // Still nothing, use highest accuracy verse
                const sorted = alignments
                    .map(a => ({ ayah: a.ayah, accuracy: a.accuracy }))
                    .sort((a, b) => b.accuracy - a.accuracy);

                console.log(`   Best verse: ${sorted[0]?.ayah} (${(sorted[0]?.accuracy * 100).toFixed(1)}%)\n`);

                return {
                    startVerse: sorted[0]?.ayah || 1,
                    endVerse: sorted[0]?.ayah || 1,
                    versesInRange: 1
                };
            }

            console.log(`   Verses: ${moderateVerses.map(v => `${v.ayah} (${(v.accuracy * 100).toFixed(1)}%)`).join(', ')}\n`);
            return this.findBestRange(moderateVerses);
        }

        console.log(`   Verses: ${significantVerses.map(v => `${v.ayah} (${(v.accuracy * 100).toFixed(1)}%)`).join(', ')}\n`);
        return this.findBestRange(significantVerses);
    }

    /**
     * Find the best continuous range from significant verses
     */
    findBestRange(significantVerses) {
        if (significantVerses.length === 0) {
            return { startVerse: 1, endVerse: 1, versesInRange: 1 };
        }

        console.log('🔍 Step 3: Find Best Continuous Range');
        console.log('─'.repeat(55));

        // Extract verse numbers
        const verseNumbers = significantVerses.map(v => v.ayah);
        const minVerse = Math.min(...verseNumbers);
        const maxVerse = Math.max(...verseNumbers);
        const rangeSize = maxVerse - minVerse + 1;

        // Calculate density: how many significant verses vs total range
        const density = significantVerses.length / rangeSize;

        console.log(`   Min verse: ${minVerse}, Max verse: ${maxVerse}`);
        console.log(`   Range size: ${rangeSize} verses`);
        console.log(`   Density: ${(density * 100).toFixed(1)}% (${significantVerses.length}/${rangeSize})`);

        // If density is high (>40%), use min-max approach (handles intentional skips)
        // If density is low (<=40%), use continuous range building (handles scattered errors)
        if (density > 0.40) {
            console.log(`   ✅ High density (>40%) - Using min-max approach`);
            console.log(`   Final range: verses ${minVerse}-${maxVerse} (${rangeSize} verses)\n`);

            // Dense matches - likely a continuous recitation with some skipped verses
            return {
                startVerse: minVerse,
                endVerse: maxVerse,
                versesInRange: rangeSize
            };
        } else {
            console.log(`   ⚠️ Low density (<=40%) - Building continuous range...`);
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

            console.log(`   Final range: verses ${bestRange.start}-${bestRange.end} (${bestRange.count} verses)`);
            console.log(`   Average accuracy: ${(bestRange.avgAccuracy * 100).toFixed(1)}%\n`);

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

            // CRITICAL: Apply aggressive normalization before comparison
            const normalizedExpected = this.preprocessor.normalizeForNgrams(expected);

            // Search forward from current position in transcript
            for (let j = transcriptPos; j < transcriptWords.length; j++) {
                const heard = transcriptWords[j];
                const normalizedHeard = this.preprocessor.normalizeForNgrams(heard);
                const similarity = levenshteinSimilarity(normalizedExpected, normalizedHeard);

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
            } else if (bestSimilarity >= 0.70) {
                // Fuzzy match (lowered from 0.75 to 0.70 for Whisper tolerance)
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
     * Calculate sequential match rate - how many verse words appear IN ORDER in transcript
     * This is the MOST IMPORTANT metric for verifying correct position
     */
    calculateSequentialMatch(transcriptWords, verseWords) {
        // CRITICAL: Merge common word splits BEFORE matching
        // Fixes word boundary mismatches: "يا يها" → "يايها"
        const mergedTranscriptWords = this.preprocessor.mergeCommonSplits(transcriptWords);

        // DEBUG: Log word merging
        if (transcriptWords.length !== mergedTranscriptWords.length) {
            console.log(`🔧 Word merge applied: ${transcriptWords.length} → ${mergedTranscriptWords.length} words`);
            console.log(`   Original first 10: ${transcriptWords.slice(0, 10).join(' ')}`);
            console.log(`   Merged first 10: ${mergedTranscriptWords.slice(0, 10).join(' ')}`);
        }

        let transcriptPos = 0;
        let matchScore = 0;  // Changed from matchedInOrder - now uses weighted scoring
        let debugWordIndex = 0;
        let validWords = 0;  // Count of non-empty verse words
        let perfectMatches = 0;
        let partialMatches = 0;
        let failedMatches = 0;

        console.log(`\n🔍 Word-by-word sequential matching:`);
        console.log(`   Verse words: ${verseWords.length}, Transcript words: ${mergedTranscriptWords.length}`);
        console.log(`   🔬 DEBUG MODE: Showing ALL comparisons\n`);

        for (const verseWord of verseWords) {
            // CRITICAL: Apply aggressive normalization before comparison
            // This handles Whisper transcription differences (يٓايها → يايها)
            const normalizedVerseWord = this.preprocessor.normalizeForNgrams(verseWord);

            // SKIP: Empty Unicode marks (decorative marks like ۚ, ۖ that normalize to "")
            // These are sajdah/pause marks that Whisper correctly doesn't transcribe
            if (normalizedVerseWord.length === 0) {
                debugWordIndex++;
                continue;
            }

            validWords++;  // Count valid words for accurate percentage calculation

            let bestSimilarity = 0;
            let bestPos = -1;

            // WINDOWED SEARCH: Only look ahead 5 words to prevent greedy skipping
            // This prevents matching distant words when nearby words are close enough
            const SEARCH_WINDOW = 5;
            const searchLimit = Math.min(transcriptPos + SEARCH_WINDOW, mergedTranscriptWords.length);

            // Search forward in transcript with limited window
            for (let i = transcriptPos; i < searchLimit; i++) {
                const normalizedTranscriptWord = this.preprocessor.normalizeForNgrams(mergedTranscriptWords[i]);
                const similarity = levenshteinSimilarity(normalizedVerseWord, normalizedTranscriptWord);

                // Track best match found
                if (similarity > bestSimilarity) {
                    bestSimilarity = similarity;
                    bestPos = i;
                }

                // If excellent match (95%+), stop searching
                if (similarity >= 0.95) {
                    break;
                }
            }

            // DEBUG: Log ALL comparisons
            const status = bestSimilarity >= 0.95 ? '✅' :
                          bestSimilarity >= 0.80 ? '⚠️' :
                          bestSimilarity >= 0.65 ? '🟨' :
                          bestSimilarity >= 0.60 ? '🟧' : '❌';
            const transcriptWord = bestPos >= 0 ? mergedTranscriptWords[bestPos] : '[NOT FOUND]';
            const normalizedTranscript = bestPos >= 0 ? this.preprocessor.normalizeForNgrams(transcriptWord) : '';

            const distance = bestPos >= 0 ? bestPos - transcriptPos : -1;
            const windowInfo = distance >= 0 ? ` (distance: +${distance})` : '';

            console.log(`   [${debugWordIndex}] ${status} Verse: "${verseWord}" → Transcript: "${transcriptWord}"${windowInfo}`);
            console.log(`       Normalized: "${normalizedVerseWord}" vs "${normalizedTranscript}"`);
            console.log(`       Similarity: ${(bestSimilarity * 100).toFixed(1)}% → Credit: ${bestSimilarity >= 0.60 ? bestSimilarity.toFixed(2) : '0.00'}`);

            // WEIGHTED SCORING: Give partial credit for near-misses
            // LOWERED THRESHOLD: 60% instead of 70% to accept minor Whisper errors
            if (bestSimilarity >= 0.60) {  // Minimum 60% threshold (was 70%)
                matchScore += bestSimilarity;  // Add weighted credit
                transcriptPos = bestPos + 1;  // Move forward past this match

                if (bestSimilarity >= 0.95) {
                    perfectMatches++;
                } else {
                    partialMatches++;
                }
            } else {
                // No match found (below 60% threshold)
                failedMatches++;
                // Don't advance position - continue from same spot
            }

            debugWordIndex++;
        }

        const avgScore = validWords > 0 ? matchScore / validWords : 0;
        const skippedMarks = verseWords.length - validWords;

        console.log(`\n📊 Sequential match summary:`);
        console.log(`   Perfect matches (95%+): ${perfectMatches}/${validWords}`);
        console.log(`   Partial matches (60-95%): ${partialMatches}/${validWords}`);
        console.log(`   Failed matches (<60%): ${failedMatches}/${validWords}`);
        if (skippedMarks > 0) {
            console.log(`   Skipped Unicode marks: ${skippedMarks} (decorative marks like ۚ, ۖ)`);
        }
        console.log(`   Weighted average: ${(avgScore * 100).toFixed(1)}%`);
        console.log(`   💡 Using windowed search (5-word lookahead) + 60% threshold\n`);

        // Return weighted average based on valid words only
        return validWords > 0 ? matchScore / validWords : 0;
    }

    /**
     * Calculate coverage - what % of verse words exist ANYWHERE in transcript
     */
    calculateCoverage(transcriptWords, verseWords) {
        // CRITICAL: Merge common word splits BEFORE matching
        // Fixes word boundary mismatches: "يا يها" → "يايها"
        const mergedTranscriptWords = this.preprocessor.mergeCommonSplits(transcriptWords);

        let coverageScore = 0;  // Changed to weighted scoring
        let validWords = 0;  // Count of non-empty verse words

        for (const verseWord of verseWords) {
            // CRITICAL: Apply aggressive normalization before comparison
            const normalizedVerseWord = this.preprocessor.normalizeForNgrams(verseWord);

            // SKIP: Empty Unicode marks (decorative marks like ۚ, ۖ that normalize to "")
            // These are sajdah/pause marks that Whisper correctly doesn't transcribe
            if (normalizedVerseWord.length === 0) {
                continue;
            }

            validWords++;  // Count valid words for accurate percentage calculation

            // Find best match anywhere in transcript (order doesn't matter)
            let bestSimilarity = 0;
            for (const tw of mergedTranscriptWords) {
                const normalizedTranscriptWord = this.preprocessor.normalizeForNgrams(tw);
                const similarity = levenshteinSimilarity(normalizedVerseWord, normalizedTranscriptWord);
                if (similarity > bestSimilarity) {
                    bestSimilarity = similarity;
                }
                // Early exit if perfect match found
                if (similarity >= 0.99) break;
            }

            // WEIGHTED SCORING: Give partial credit for near-misses
            // LOWERED THRESHOLD: 60% to match sequential matching
            if (bestSimilarity >= 0.60) {  // Minimum 60% threshold (was 70%)
                coverageScore += bestSimilarity;  // Add weighted credit
            }
        }

        return validWords > 0 ? coverageScore / validWords : 0;
    }

    /**
     * Strict position verification using sequence matching
     * SMART ALIGNMENT: Detects and handles Skip/Misplaced/Repeated scenarios
     * Only verifies against PRESENT verses to avoid misalignment pollution
     */
    verifyPositionStrict(fullTranscript, candidateVerses) {
        if (!candidateVerses || candidateVerses.length === 0) {
            return {
                verified: false,
                confidence: 'very_low',
                reason: 'No candidate verses provided'
            };
        }

        // Extract words from full transcript
        const transcriptWords = fullTranscript.split(/\s+/).filter(w => w.length > 0);

        if (transcriptWords.length === 0) {
            return {
                verified: false,
                confidence: 'very_low',
                reason: 'Empty transcript'
            };
        }

        console.log(`\n🧠 SMART ALIGNMENT: Verse-Level Pre-Analysis`);
        console.log('─'.repeat(55));

        // Detect mid-surah snippets EARLY (before filtering) to use appropriate thresholds
        const firstVerse = candidateVerses.length > 0 ? candidateVerses[0].ayah : 1;
        const isMidSurahSnippet = firstVerse > 1;

        // Use relaxed threshold for mid-surah snippets (20% vs 40%)
        // N-gram already detected the correct surah, so trust it more
        const verseAccuracyThreshold = isMidSurahSnippet ? 0.20 : 0.40;

        // STEP 1: Analyze each verse individually to detect presence
        const verseAnalysis = [];
        for (const verse of candidateVerses) {
            const verseWords = (verse.textNormalized || verse.text).split(/\s+/).filter(w => w.length > 0);
            const alignment = this.alignWords(transcriptWords, verseWords);

            verseAnalysis.push({
                ayah: verse.ayah,
                accuracy: alignment.accuracy,
                wordCount: verseWords.length,
                wordsMatched: alignment.matched,
                words: verseWords,
                status: alignment.accuracy >= verseAccuracyThreshold ? 'present' : 'skipped'
            });
        }

        // Log verse-level analysis
        for (const v of verseAnalysis) {
            const status = v.status === 'present' ? '✅' : '❌ SKIP';
            console.log(`   Verse ${v.ayah}: ${(v.accuracy * 100).toFixed(1)}% (${v.wordsMatched}/${v.wordCount} words) ${status}`);
        }

        // STEP 2: Filter to present verses only (Skip scenario)
        const presentVerses = verseAnalysis.filter(v => v.status === 'present');
        const skippedVerses = verseAnalysis.filter(v => v.status === 'skipped');

        const thresholdPercent = (verseAccuracyThreshold * 100).toFixed(0);
        console.log(`\n🔧 Smart Filtering:`);
        console.log(`   Total verses in range: ${candidateVerses.length}`);
        console.log(`   Present verses (≥${thresholdPercent}%): ${presentVerses.length} [${presentVerses.map(v => v.ayah).join(', ')}]`);
        console.log(`   Skipped verses (<${thresholdPercent}%): ${skippedVerses.length}${skippedVerses.length > 0 ? ` [${skippedVerses.map(v => v.ayah).join(', ')}]` : ''}`);
        if (isMidSurahSnippet) {
            console.log(`   📍 Mid-surah snippet: using relaxed threshold (${thresholdPercent}% vs 40%)`);
        }

        if (presentVerses.length === 0) {
            return {
                verified: false,
                confidence: 'very_low',
                reason: `No verses present (all below ${thresholdPercent}% accuracy)`
            };
        }

        // STEP 3: Build filtered word array (only present verses)
        const expectedWords = [];
        const verseBoundaries = []; // Track which verse each word belongs to
        let totalExpectedWords = 0;

        for (const verse of presentVerses) {
            for (const word of verse.words) {
                expectedWords.push(word);
                verseBoundaries.push(verse.ayah);
            }
            totalExpectedWords += verse.wordCount;
        }

        const totalAllWords = candidateVerses.reduce((sum, v) => {
            const words = (v.textNormalized || v.text).split(/\s+/).filter(w => w.length > 0);
            return sum + words.length;
        }, 0);

        console.log(`   Expected words: ${totalAllWords} → ${expectedWords.length} (filtered)\n`);

        // STEP 4: Calculate metrics on filtered words only
        const sequential = this.calculateSequentialMatch(transcriptWords, expectedWords);
        const coverage = this.calculateCoverage(transcriptWords, expectedWords);
        const countRatio = transcriptWords.length / expectedWords.length;

        // Log verification details
        console.log(`📊 Verification metrics (filtered):`);
        console.log(`   Sequential match: ${(sequential * 100).toFixed(1)}%`);
        console.log(`   Coverage: ${(coverage * 100).toFixed(1)}%`);
        console.log(`   Word count ratio: ${countRatio.toFixed(2)} (transcript: ${transcriptWords.length}, expected: ${expectedWords.length})`);

        if (isMidSurahSnippet) {
            console.log(`   📍 Mid-surah snippet detected (starts at verse ${firstVerse})`);
        }

        // Prepare verse classification for return
        const verseClassification = {
            present: presentVerses.map(v => v.ayah),
            skipped: skippedVerses.map(v => v.ayah),
            total: candidateVerses.length,
            isMidSurah: isMidSurahSnippet
        };

        // Apply verification rules (adjusted for mid-surah snippets)
        // EXCELLENT ACCURACY: If both sequential and coverage are excellent (≥85%),
        // be more lenient with ratio to account for user corrections/repeats
        if (sequential >= 0.85 || coverage >= 0.85) {
            // High ratio (> 3.0) with excellent accuracy = Extended recitation
            // User recited MORE verses than indexed (e.g., verses 1-10 vs indexed 1-2)
            // This is GOOD - don't penalize for reciting additional correct verses
            if (countRatio <= 3.0 || (countRatio > 3.0 && sequential >= 0.85 && coverage >= 0.85)) {
                const bothExcellent = sequential >= 0.85 && coverage >= 0.85;
                const isExtendedRecitation = countRatio > 3.0 && bothExcellent;

                const confidence = bothExcellent && countRatio <= 1.5 ? 'high' :
                                  bothExcellent && !isExtendedRecitation ? 'medium' :
                                  isExtendedRecitation ? 'medium' : 'medium';

                if (isExtendedRecitation) {
                    console.log(`✅ Position VERIFIED (Extended Recitation - ${confidence === 'high' ? 'High' : 'Medium'} Confidence)`);
                    console.log(`   User recited more verses than indexed (ratio: ${countRatio.toFixed(2)})`);
                } else {
                    console.log(`✅ Position VERIFIED (${confidence === 'high' ? 'High' : 'Medium'} Confidence)`);
                }

                return {
                    verified: true,
                    confidence: confidence,
                    scores: { sequential, coverage, countRatio },
                    verseClassification
                };
            }
        }

        // HIGH CONFIDENCE: Sequential ≥85%, ratio 0.8-1.2, coverage ≥80%
        if (sequential >= 0.85 && countRatio >= 0.8 && countRatio <= 1.2 && coverage >= 0.80) {
            console.log(`✅ Position VERIFIED (High Confidence)`);
            return {
                verified: true,
                confidence: 'high',
                scores: { sequential, coverage, countRatio },
                verseClassification
            };
        }

        // MEDIUM CONFIDENCE: Sequential ≥70%, ratio 0.7-1.3, coverage ≥70%
        if (sequential >= 0.70 && countRatio >= 0.7 && countRatio <= 1.3 && coverage >= 0.70) {
            console.log(`⚠️  Position VERIFIED (Medium Confidence)`);
            return {
                verified: true,
                confidence: 'medium',
                scores: { sequential, coverage, countRatio },
                verseClassification
            };
        }

        // MID-SURAH SNIPPET: Relaxed thresholds for mid-surah passages
        // These snippets don't start at verse 1, so normal verification is too strict
        // We trust the n-gram detection more and check if detected verses match well
        if (isMidSurahSnippet && presentVerses.length > 0) {
            // Check if the detected verses have good alignment
            const avgAccuracyOfPresent = presentVerses.reduce((sum, v) => sum + v.accuracy, 0) / presentVerses.length;

            // Accept if:
            // 1. Sequential or coverage ≥ 35% (highly relaxed for mid-surah)
            // 2. Detected verses have ≥ 20% average accuracy (VERY relaxed - trust n-gram)
            // 3. At least 1 verse with decent accuracy
            const goodAlignment = (sequential >= 0.35 || coverage >= 0.35);
            const goodVerseAccuracy = avgAccuracyOfPresent >= 0.20;  // Lowered from 0.30 to 0.20
            const hasVerses = presentVerses.length >= 1;

            // DEBUG: Log mid-surah verification details
            console.log(`   🔍 Mid-Surah Verification Details:`);
            console.log(`      Present verses count: ${presentVerses.length}`);
            console.log(`      Avg verse accuracy: ${(avgAccuracyOfPresent * 100).toFixed(1)}%`);
            console.log(`      Good alignment (seq≥35% OR cov≥35%): ${goodAlignment} (seq=${(sequential*100).toFixed(1)}%, cov=${(coverage*100).toFixed(1)}%)`);
            console.log(`      Good verse accuracy (≥20%): ${goodVerseAccuracy}`);
            console.log(`      Has verses (≥1): ${hasVerses}`);
            console.log(`      FINAL: ${goodAlignment && goodVerseAccuracy && hasVerses ? 'ACCEPT' : 'REJECT'}`);

            if (goodAlignment && goodVerseAccuracy && hasVerses) {
                console.log(`✅ Position VERIFIED (Mid-Surah Snippet - Medium Confidence)`);
                console.log(`   Relaxed thresholds applied for mid-surah passage (starts at verse ${firstVerse})`);
                console.log(`   Detected verses average accuracy: ${(avgAccuracyOfPresent * 100).toFixed(1)}%`);
                return {
                    verified: true,
                    confidence: 'medium',
                    scores: { sequential, coverage, countRatio },
                    verseClassification
                };
            }
        }

        // LOW CONFIDENCE: Reject
        console.log(`❌ Position REJECTED (Low Confidence)`);
        return {
            verified: false,
            confidence: 'low',
            scores: { sequential, coverage, countRatio },
            verseClassification,
            reason: `Sequential: ${(sequential * 100).toFixed(1)}%, Coverage: ${(coverage * 100).toFixed(1)}%, Ratio: ${countRatio.toFixed(2)}`
        };
    }

    /**
     * Phase 3: Detect skipped verses
     */
    detectSkips(alignments) {
        console.log('🔍 Step 4: Detect Skips & Errors');
        console.log('─'.repeat(55));

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

        console.log(`   ✅ Recited verses (≥70%): ${recited.length}`);
        if (recited.length > 0 && recited.length <= 10) {
            console.log(`      Verses: ${recited.map(v => `${v.ayah} (${(v.accuracy * 100).toFixed(1)}%)`).join(', ')}`);
        }

        console.log(`   ⚠️ Partial verses (25-70%): ${partial.length}`);
        if (partial.length > 0 && partial.length <= 10) {
            console.log(`      Verses: ${partial.map(v => `${v.ayah} (${(v.accuracy * 100).toFixed(1)}%)`).join(', ')}`);
        }

        console.log(`   ❌ Skipped verses (<25%): ${skipped.length}`);
        if (skipped.length > 0 && skipped.length <= 10) {
            console.log(`      Verses: ${skipped.map(v => `${v.ayah} (${(v.accuracy * 100).toFixed(1)}%)`).join(', ')}`);
        }
        console.log();

        return {
            skippedVerses: skipped,
            recitedVerses: recited,
            partialVerses: partial
        };
    }

    /**
     * Generate repeat summary statistics
     *
     * @param {Object} repeatDetection - Repeat detection results
     * @returns {Object} - Summary statistics
     */
    generateRepeatSummary(repeatDetection) {
        if (!repeatDetection || !repeatDetection.repeats) {
            return {
                total: 0,
                byType: {
                    immediate: 0,
                    section: 0,
                    verse: 0
                },
                userCorrections: 0,
                naturalQuranicRepetition: 0
            };
        }

        const summary = {
            total: repeatDetection.repeats.length,
            byType: {
                immediate: 0,
                section: 0,
                verse: 0
            },
            userCorrections: repeatDetection.repeats.length,
            naturalQuranicRepetition: 0
        };

        // Count by type
        for (const repeat of repeatDetection.repeats) {
            if (repeat.type && summary.byType[repeat.type] !== undefined) {
                summary.byType[repeat.type]++;
            }
        }

        return summary;
    }

    /**
     * Phase 4: Generate comprehensive report
     */
    generateReport(surahDetection, alignments, skipDetection, verseRange, metadata, preprocessedText = null, repeatDetection = null) {
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

        // Add word-level errors with enhanced feedback
        for (const alignment of alignments) {
            if (alignment.alignment && alignment.accuracy < 0.95) {
                // Get normalized verse words for comparison
                const verseText = alignment.text || '';
                const verseWords = verseText.split(/\s+/).filter(w => w.length > 0);
                const normalizedVerseWords = verseWords.map(w => this.preprocessor.normalizeForNgrams(w));

                // Extract transcript words for this verse
                let transcriptWords = [];

                if (preprocessedText) {
                    // Use the full transcript to get all words in the range
                    const allTranscriptWords = preprocessedText.split(/\s+/).filter(w => w.length > 0);

                    // Find the min and max transcript positions used for this verse
                    const positions = alignment.alignment
                        .filter(d => d.transcriptPos !== undefined)
                        .map(d => d.transcriptPos);

                    if (positions.length > 0) {
                        const minPos = Math.min(...positions);
                        const maxPos = Math.max(...positions);

                        // Extract all words from minPos to maxPos (inclusive)
                        transcriptWords = allTranscriptWords.slice(minPos, maxPos + 1);
                    }
                } else {
                    // Fallback: Extract from alignment details (old behavior)
                    const heardWordsWithPos = alignment.alignment
                        .filter(d => d.heard && d.transcriptPos !== undefined)
                        .map(d => ({ word: d.heard, pos: d.transcriptPos }))
                        .sort((a, b) => a.pos - b.pos);

                    const uniquePositions = new Set();
                    for (const item of heardWordsWithPos) {
                        if (!uniquePositions.has(item.pos)) {
                            uniquePositions.add(item.pos);
                            transcriptWords.push(item.word);
                        }
                    }
                }

                // Enhance word-level errors (use normalized words for comparison)
                const enhancedErrors = this.enhanceWordLevelErrors(
                    alignment.alignment,
                    normalizedVerseWords,
                    transcriptWords
                );

                // Add enhanced errors to mistakes
                enhancedErrors.forEach(error => {
                    mistakes.push({
                        ayah: alignment.ayah,
                        ...error
                    });
                });
            }
        }

        // Add partial verses with missing words (keep this for backward compatibility)
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

        // Generate mistake summary and categorized mistakes
        const mistakeSummary = this.generateMistakeSummary(mistakes);

        // Group mistakes by category for easier consumption
        const mistakesByCategory = {};
        for (const mistake of mistakes) {
            const category = this.categorizeMistake(mistake);
            if (!mistakesByCategory[category]) {
                mistakesByCategory[category] = [];
            }
            mistakesByCategory[category].push(mistake);
        }

        // Generate repeat summary and add positive feedback
        const repeatSummary = this.generateRepeatSummary(repeatDetection);
        const repeats = repeatDetection?.repeats || [];

        // Add positive feedback messages to repeats
        const repeatsWithFeedback = repeats.map(repeat => {
            let feedback = '';
            if (repeat.type === 'immediate') {
                feedback = '✅ Good! You corrected yourself - this shows careful recitation';
            } else if (repeat.type === 'section') {
                feedback = '✅ You repeated a section for practice - excellent learning approach';
            } else if (repeat.type === 'verse') {
                feedback = '✅ You practiced this verse multiple times - repetition aids memorization';
            } else if (repeat.type === 'phrase') {
                const words = repeat.words?.join(' ') || 'this phrase';
                feedback = `✅ You repeated "${words}" - likely practicing this phrase`;
            } else if (repeat.type === 'word') {
                const words = repeat.words?.join(' ') || 'this word';
                feedback = `✅ You repeated "${words}" for emphasis or correction`;
            } else if (repeat.feedback) {
                // If repeat already has feedback, keep it
                feedback = repeat.feedback;
            } else {
                // Default feedback for unknown types
                feedback = '✅ Repetition detected - this shows you are being careful with your recitation';
            }

            return {
                ...repeat,
                feedback
            };
        });

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
            mistakeSummary,
            mistakesByCategory,
            repeats: repeatsWithFeedback,
            repeatSummary,
            recommendations
        };
    }

    /**
     * Helper: Get verses for a candidate position
     */
    getCandidateVerses(surahId, startVerse = null, endVerse = null) {
        if (startVerse && endVerse) {
            // Specific verse range
            return this.quranService.quranData.filter(v =>
                v.surah === surahId &&
                v.ayah >= startVerse &&
                v.ayah <= endVerse
            );
        } else {
            // Entire surah
            return this.quranService.quranData.filter(v => v.surah === surahId);
        }
    }

    /**
     * Main analysis pipeline with VERIFICATION LOOP
     * Tries multiple detection methods and verifies each with strict sequence matching
     */
    async analyzeFull(rawTranscript, metadata = {}) {
        const pipelineStart = Date.now();

        try {
            console.log('\n═══════════════════════════════════════════════════════');
            console.log('📋 PREPROCESSING');
            console.log('═══════════════════════════════════════════════════════');
            console.log(`📥 Raw transcript length: ${rawTranscript.length} chars`);
            console.log(`📥 Raw transcript:\n${rawTranscript.substring(0, 200)}${rawTranscript.length > 200 ? '...' : ''}\n`);

            // Early validation: Check if input contains Arabic text
            if (!this.preprocessor.isArabicText(rawTranscript)) {
                console.log('❌ EARLY VALIDATION FAILED: No Arabic text detected');
                return {
                    success: false,
                    error: 'non_arabic_input',
                    message: 'No Arabic text detected in transcription. Please recite Quran in Arabic.',
                    inputLength: rawTranscript.length
                };
            }
            console.log('✅ Arabic text detected - proceeding with analysis\n');

            // Preprocessing
            const preprocessed = this.preprocessor.preprocess(rawTranscript);

            console.log(`📊 After preprocessing:`);
            console.log(`   Words: ${preprocessed.wordCount}`);
            console.log(`   Removed tokens: ${preprocessed.removedTokens}`);
            console.log(`   Normalized: ${preprocessed.normalized.substring(0, 200)}${preprocessed.normalized.length > 200 ? '...' : ''}`);

            if (preprocessed.wordCount < 3) {
                return {
                    success: false,
                    error: 'insufficient_data',
                    message: 'Transcript too short for analysis (minimum 3 words after cleaning)',
                    wordCount: preprocessed.wordCount
                };
            }

            // Stage 1: Basic repeat detection (for surah detection)
            // This removes obvious repeats to help with surah identification
            console.log('\n═══════════════════════════════════════════════════════');
            console.log('🔄 STAGE 1: Basic Repeat Detection');
            console.log('═══════════════════════════════════════════════════════\n');

            const transcriptWords = preprocessed.normalized.split(/\s+/).filter(w => w.length > 0);
            const basicRepeatDetection = this.detectRepeats(transcriptWords);

            console.log(`   Original words: ${basicRepeatDetection.stats.originalWordCount}`);
            console.log(`   Potential repeats found: ${basicRepeatDetection.stats.repeatsDetected}`);
            console.log(`   Cleaned words: ${basicRepeatDetection.stats.cleanedWordCount}`);

            // Use cleaned text for surah detection and alignment
            const analyzableText = basicRepeatDetection.cleanedWords.join(' ');
            const analyzableWordCount = basicRepeatDetection.cleanedWords.length;

            console.log('\n═══════════════════════════════════════════════════════');
            console.log('🔍 MULTI-PASS DETECTION WITH VERIFICATION');
            console.log('═══════════════════════════════════════════════════════\n');

            let bestCandidate = null;
            let bestVerification = null;

            // ========== PASS 1: FAST-PATH ==========
            console.log('📍 PASS 1: Fast-Path Detection');
            const fastPathResult = this.detectFromFastPath(analyzableText);

            if (fastPathResult.detected) {
                console.log(`   Candidate: ${fastPathResult.pattern.description}`);

                // Get verses for verification (use ENTIRE recitation for verification)
                const candidateVerses = this.getCandidateVerses(
                    fastPathResult.pattern.surahId,
                    fastPathResult.pattern.startVerse,
                    fastPathResult.pattern.endVerse
                );

                // VERIFY using ENTIRE transcript
                const verification = this.verifyPositionStrict(
                    analyzableText,
                    candidateVerses
                );

                if (verification.verified) {
                    console.log(`\n✅ PASS 1 ACCEPTED - Proceeding with fast-path result\n`);

                    // Position verified! Proceed to detailed analysis
                    return await this.performDetailedAnalysis(
                        analyzableText,
                        fastPathResult.pattern.surahId,
                        fastPathResult.pattern.startVerse,
                        fastPathResult.pattern.endVerse,
                        {
                            ...metadata,
                            detectionMethod: 'fast_path_verified',
                            confidence: verification.confidence,
                            verificationScores: verification.scores,
                            pipelineStart
                        },
                        basicRepeatDetection,
                        preprocessed.normalized
                    );
                } else {
                    console.log(`\n❌ PASS 1 REJECTED - ${verification.reason}\n`);
                    bestCandidate = {
                        method: 'fast_path',
                        surah: fastPathResult.pattern.surahName,
                        surahId: fastPathResult.pattern.surahId,
                        verses: `${fastPathResult.pattern.startVerse}-${fastPathResult.pattern.endVerse}`
                    };
                    bestVerification = verification;
                }
            } else {
                console.log(`   No fast-path candidate found\n`);
            }

            // ========== PASS 2: N-GRAM ==========
            console.log('📍 PASS 2: N-Gram Detection');
            const ngramResult = await this.identifySurahNgramOnly(analyzableText);

            if (ngramResult.success && ngramResult.primarySurah) {
                console.log(`   Candidate: ${ngramResult.primarySurah.name} (confidence: ${(ngramResult.primarySurah.confidence * 100).toFixed(1)}%)`);

                // Check minimum confidence threshold (5%)
                // Low confidence results are likely wrong surah identifications
                const MIN_NGRAM_CONFIDENCE = 0.05; // 5%
                if (ngramResult.primarySurah.confidence < MIN_NGRAM_CONFIDENCE) {
                    console.log(`   ❌ Confidence too low (${(ngramResult.primarySurah.confidence * 100).toFixed(1)}% < ${(MIN_NGRAM_CONFIDENCE * 100).toFixed(0)}%) - skipping this candidate\n`);
                } else {
                    // For n-gram: First detect verse range, THEN verify
                    console.log('   Detecting verse range within surah...');
                const alignmentResult = await this.alignToVerses(
                    analyzableText,
                    ngramResult.primarySurah.id
                );

                const verseRange = alignmentResult.verseRange;
                console.log(`   Detected range: verses ${verseRange.startVerse}-${verseRange.endVerse} (${verseRange.versesInRange} verses)`);

                // Get ONLY the detected verses (not entire surah)
                const candidateVerses = this.getCandidateVerses(
                    ngramResult.primarySurah.id,
                    verseRange.startVerse,
                    verseRange.endVerse
                );

                // VERIFY using the detected verse range
                const verification = this.verifyPositionStrict(
                    analyzableText,
                    candidateVerses
                );

                if (verification.verified) {
                    console.log(`\n✅ PASS 2 ACCEPTED - Proceeding with n-gram result\n`);

                    // Position verified! Proceed to detailed analysis
                    return await this.performDetailedAnalysis(
                        analyzableText,
                        ngramResult.primarySurah.id,
                        verseRange.startVerse,
                        verseRange.endVerse,
                        {
                            ...metadata,
                            detectionMethod: 'ngram_verified',
                            confidence: verification.confidence,
                            verificationScores: verification.scores,
                            pipelineStart
                        },
                        basicRepeatDetection,
                        preprocessed.normalized
                    );
                } else {
                    console.log(`\n❌ PASS 2 REJECTED - ${verification.reason}\n`);

                    // Keep track of best candidate (only if scores are available)
                    if (verification.scores && (!bestVerification ||
                        verification.scores.sequential > (bestVerification.scores?.sequential || 0))) {
                        bestCandidate = {
                            method: 'ngram',
                            surah: ngramResult.primarySurah.name,
                            surahId: ngramResult.primarySurah.id,
                            verses: `${verseRange.startVerse}-${verseRange.endVerse}`
                        };
                        bestVerification = verification;
                    }

                    // DEBUG MODE: Only override rejection in development
                    const debugMode = process.env.ANALYSIS_DEBUG_MODE === 'true';

                    if (debugMode) {
                        console.log('🔬 DEBUG MODE: Proceeding to detailed analysis despite rejection...\n');
                        console.log('✅ PASS 2 ACCEPTED (DEBUG OVERRIDE) - Proceeding with n-gram result\n');

                        return await this.performDetailedAnalysis(
                            analyzableText,
                            ngramResult.primarySurah.id,
                            verseRange.startVerse,
                            verseRange.endVerse,
                            {
                                ...metadata,
                                detectionMethod: 'ngram_debug',
                                confidence: 'debug_low',  // Mark as debug/low confidence
                            verificationScores: verification.scores,
                            pipelineStart
                        },
                        basicRepeatDetection,
                        preprocessed.normalized
                    );
                }
                } // Close else block for verification.verified
                } // Close else block for confidence check
            } else {
                console.log(`   No n-gram candidate found\n`);
            }

            // ========== ALL PASSES FAILED ==========
            console.log('═══════════════════════════════════════════════════════');
            console.log('❌ ALL PASSES FAILED VERIFICATION');
            console.log('═══════════════════════════════════════════════════════\n');

            // Return best guess with low confidence
            return {
                success: false,
                confidence: 'low',
                error: 'position_not_verified',
                message: 'Could not confidently identify your recitation position',
                bestGuess: bestCandidate || {
                    method: 'none',
                    surah: 'Unknown',
                    verses: 'Unknown'
                },
                verificationScores: bestVerification?.scores || {
                    sequential: 0,
                    coverage: 0,
                    countRatio: 0
                },
                transcript: rawTranscript.substring(0, 200) + '...',  // Show first 200 chars
                suggestions: [
                    'Try reciting from the beginning of a surah',
                    'Speak more clearly and at a moderate pace',
                    'Ensure good audio quality and minimal background noise',
                    'Verify your microphone is working properly'
                ],
                userOptions: {
                    manualInput: 'Provide surah and verse numbers manually',
                    tryAgain: 'Record again with clearer pronunciation'
                }
            };

        } catch (error) {
            console.error('Analysis error:', error);
            return {
                success: false,
                error: 'analysis_failed',
                message: error.message
            };
        }
    }

    /**
     * Categorize a mistake based on similarity and type
     * Maps low-level error types to user-friendly categories
     *
     * @param {Object} mistake - The mistake object
     * @returns {string} - Category name (pronunciation, partial_match, wrong_word, etc.)
     */
    categorizeMistake(mistake) {
        // Direct type mappings
        if (mistake.type === 'word_order') return 'word_order';
        if (mistake.type === 'skipped_verse') return 'skipped_verse';
        if (mistake.type === 'missing_words') return 'missing_words';

        // Character-level errors map to pronunciation issues
        if (['insertion', 'deletion', 'prefix_addition', 'suffix_addition',
             'prefix_deletion', 'suffix_deletion'].includes(mistake.type)) {
            return 'pronunciation';
        }

        // Substitution with minor severity = partial match
        if (mistake.type === 'substitution' && mistake.severity === 'minor') {
            return 'partial_match';
        }

        // Substitution with medium severity = pronunciation
        if (mistake.type === 'substitution' && mistake.severity === 'medium') {
            return 'pronunciation';
        }

        // Wrong word
        if (mistake.type === 'wrong_word' || mistake.type === 'substitution') {
            return 'wrong_word';
        }

        // Default
        return 'other';
    }

    /**
     * Generate mistake summary statistics grouped by category
     *
     * @param {Array} mistakes - Array of mistake objects
     * @returns {Object} - Summary statistics by category
     */
    generateMistakeSummary(mistakes) {
        const summary = {
            total: mistakes.length,
            byCategory: {
                pronunciation: { count: 0, severity: 'minor', description: 'Minor pronunciation or character errors' },
                partial_match: { count: 0, severity: 'medium', description: 'Partial word matches with some errors' },
                wrong_word: { count: 0, severity: 'major', description: 'Completely wrong words' },
                word_order: { count: 0, severity: 'high', description: 'Correct words but wrong sequence' },
                missing_words: { count: 0, severity: 'medium', description: 'Words missing from recitation' },
                skipped_verse: { count: 0, severity: 'major', description: 'Entire verses skipped' },
                other: { count: 0, severity: 'low', description: 'Other issues' }
            },
            bySeverity: {
                minor: 0,
                medium: 0,
                high: 0,
                major: 0
            }
        };

        for (const mistake of mistakes) {
            const category = this.categorizeMistake(mistake);
            summary.byCategory[category].count++;

            // Count by severity
            if (mistake.severity) {
                summary.bySeverity[mistake.severity]++;
            }
        }

        return summary;
    }

    /**
     * Analyze the difference between two words to provide specific feedback
     * Detects insertions, deletions, substitutions, and transpositions
     *
     * @param {string} expectedWord - The correct word from the verse
     * @param {string} heardWord - The word from the transcript
     * @returns {Object} - Analysis of the difference
     */
    analyzeWordDifference(expectedWord, heardWord) {
        if (!heardWord || !expectedWord) {
            return { type: 'missing', difference: null };
        }

        // Exact match
        if (expectedWord === heardWord) {
            return { type: 'perfect', difference: null };
        }

        // Check for insertion (heard has extra characters)
        if (heardWord.length > expectedWord.length && heardWord.includes(expectedWord)) {
            const extra = heardWord.replace(expectedWord, '');
            return {
                type: 'insertion',
                difference: {
                    extra: extra,
                    message: `Added extra "${extra}" to ${expectedWord}`,
                    severity: 'minor'
                }
            };
        }

        // Check for deletion (heard is missing characters)
        if (expectedWord.length > heardWord.length && expectedWord.includes(heardWord)) {
            const missing = expectedWord.replace(heardWord, '');
            return {
                type: 'deletion',
                difference: {
                    missing: missing,
                    message: `Missing "${missing}" from ${expectedWord}`,
                    severity: 'minor'
                }
            };
        }

        // Check for prefix/suffix differences (very common in Arabic)
        if (heardWord.length === expectedWord.length + 1) {
            // Likely prefix or suffix addition
            if (heardWord.endsWith(expectedWord)) {
                const prefix = heardWord[0];
                return {
                    type: 'prefix_addition',
                    difference: {
                        prefix: prefix,
                        message: `Added prefix "${prefix}" to ${expectedWord}`,
                        severity: 'minor'
                    }
                };
            }
            if (heardWord.startsWith(expectedWord)) {
                const suffix = heardWord[heardWord.length - 1];
                return {
                    type: 'suffix_addition',
                    difference: {
                        suffix: suffix,
                        message: `Added suffix "${suffix}" to ${expectedWord}`,
                        severity: 'minor'
                    }
                };
            }
        }

        if (expectedWord.length === heardWord.length + 1) {
            // Likely prefix or suffix deletion
            if (expectedWord.endsWith(heardWord)) {
                const prefix = expectedWord[0];
                return {
                    type: 'prefix_deletion',
                    difference: {
                        prefix: prefix,
                        message: `Missing prefix "${prefix}" from ${expectedWord}`,
                        severity: 'minor'
                    }
                };
            }
            if (expectedWord.startsWith(heardWord)) {
                const suffix = expectedWord[expectedWord.length - 1];
                return {
                    type: 'suffix_deletion',
                    difference: {
                        suffix: suffix,
                        message: `Missing suffix "${suffix}" from ${expectedWord}`,
                        severity: 'minor'
                    }
                };
            }
        }

        // Check for character substitution (similar length)
        if (Math.abs(expectedWord.length - heardWord.length) <= 2) {
            return {
                type: 'substitution',
                difference: {
                    expected: expectedWord,
                    heard: heardWord,
                    message: `Said "${heardWord}" instead of "${expectedWord}"`,
                    severity: 'medium'
                }
            };
        }

        // Completely different words
        return {
            type: 'wrong_word',
            difference: {
                expected: expectedWord,
                heard: heardWord,
                message: `Wrong word: said "${heardWord}", should be "${expectedWord}"`,
                severity: 'major'
            }
        };
    }

    /**
     * Detect if words are present but in wrong order (jumbled)
     * Compares word sets to see if all words exist but sequence is wrong
     *
     * @param {Array<string>} transcriptWords - Words from transcript
     * @param {Array<string>} verseWords - Expected words from verse
     * @param {number} accuracy - Current alignment accuracy
     * @returns {Object|null} - Word order issue if detected, null otherwise
     */
    detectWordOrderIssue(transcriptWords, verseWords, accuracy) {
        // Only check if accuracy is unexpectedly low but word counts are similar
        if (accuracy >= 0.90 || Math.abs(transcriptWords.length - verseWords.length) > 2) {
            return null;
        }

        // Create word frequency maps (to handle repeated words)
        const transcriptWordSet = new Set(transcriptWords);
        const verseWordSet = new Set(verseWords);

        // Count how many verse words exist in transcript (regardless of order)
        let matchingWords = 0;
        verseWords.forEach(word => {
            if (transcriptWordSet.has(word)) {
                matchingWords++;
            }
        });

        // If most words (>80%) exist but accuracy is low, likely word order issue
        const wordExistenceRatio = matchingWords / verseWords.length;

        if (wordExistenceRatio >= 0.80 && accuracy < 0.90) {
            return {
                type: 'word_order',
                matchingWords: matchingWords,
                totalWords: verseWords.length,
                wordExistenceRatio: wordExistenceRatio,
                sequentialAccuracy: accuracy,
                message: `Most words are correct (${matchingWords}/${verseWords.length}), but they appear to be in the wrong order`,
                suggestion: 'Check the sequence of words in this verse',
                severity: 'high'
            };
        }

        return null;
    }

    /**
     * Enhance word-level error reporting with specific feedback
     * Analyzes alignment details to provide clear, actionable error messages
     *
     * @param {Array} alignmentDetails - Word-by-word alignment details
     * @param {Array<string>} verseWords - Expected words
     * @param {Array<string>} transcriptWords - Heard words
     * @returns {Array} - Enhanced error list with specific messages
     */
    enhanceWordLevelErrors(alignmentDetails, verseWords, transcriptWords) {
        const enhancedErrors = [];

        // First check for word order issue
        const accuracy = alignmentDetails.filter(d => d.matched).length / verseWords.length;
        const wordOrderIssue = this.detectWordOrderIssue(transcriptWords, verseWords, accuracy);

        if (wordOrderIssue) {
            enhancedErrors.push(wordOrderIssue);
            // If it's a word order issue, don't report individual word errors
            // as they would be misleading
            return enhancedErrors;
        }

        // Analyze individual word differences
        alignmentDetails.forEach((detail, index) => {
            if (!detail.matched && detail.expected) {
                const analysis = this.analyzeWordDifference(
                    detail.expected,
                    detail.heard || ''
                );

                if (analysis.difference) {
                    enhancedErrors.push({
                        position: index,
                        expected: detail.expected,
                        heard: detail.heard || null,
                        ...analysis.difference
                    });
                }
            }
        });

        return enhancedErrors;
    }

    /**
     * Detect verse order issues
     * Identifies out-of-order verses, wrong verses, skipped verses, and mixed surahs
     *
     * @param {Array} alignments - Alignment results from verse analysis
     * @param {Object} verseRange - Detected verse range {startVerse, endVerse}
     * @param {number} surahId - Primary surah ID
     * @returns {Array} - Array of verse order issues
     */
    detectVerseOrderIssues(alignments, verseRange, surahId) {
        const issues = [];

        // Filter to verses that were actually recited (accuracy >= 40%)
        const recitedVerses = alignments.filter(v => v.accuracy >= 0.40);

        if (recitedVerses.length === 0) {
            return issues; // No verses detected
        }

        // Sort by verse number for gap detection
        const sortedVerses = [...recitedVerses].sort((a, b) => a.ayah - b.ayah);
        const verseNumbers = sortedVerses.map(v => v.ayah);
        const expectedStart = verseRange.startVerse;
        const expectedEnd = verseRange.endVerse;

        // Check 1: Detect gaps (skipped verses) in the expected range
        for (let i = 0; i < verseNumbers.length - 1; i++) {
            const current = verseNumbers[i];
            const next = verseNumbers[i + 1];

            // Check for gaps (skipped verses)
            const gap = next - current;
            if (gap > 1) {
                const skippedVerses = [];
                for (let v = current + 1; v < next; v++) {
                    // Only report if it's within the expected range
                    if (v >= expectedStart && v <= expectedEnd) {
                        skippedVerses.push(v);
                    }
                }

                if (skippedVerses.length > 0) {
                    issues.push({
                        type: 'skipped_verses',
                        current: current,
                        next: next,
                        skipped: skippedVerses,
                        severity: 'low',
                        message: `Skipped verse(s) ${skippedVerses.join(', ')} between verse ${current} and ${next}`,
                        suggestion: skippedVerses.length === 1
                            ? `Make sure to include verse ${skippedVerses[0]}`
                            : `Make sure to include verses ${skippedVerses.join(', ')}`
                    });
                }
            }
        }

        // Check 3: Wrong verse recited (high accuracy but wrong verse number)
        // This checks if user recited a completely different verse that matches well
        for (const alignment of recitedVerses) {
            // If this verse has high accuracy but is far from expected range
            if (alignment.accuracy >= 0.70) {
                const verseNum = alignment.ayah;
                const distanceFromRange = Math.min(
                    Math.abs(verseNum - expectedStart),
                    Math.abs(verseNum - expectedEnd)
                );

                // If verse is more than 10 verses away from expected range, flag it
                if (distanceFromRange > 10 && verseNum < expectedStart - 5 || verseNum > expectedEnd + 5) {
                    issues.push({
                        type: 'unexpected_verse',
                        verse: verseNum,
                        expectedRange: `${expectedStart}-${expectedEnd}`,
                        accuracy: alignment.accuracy,
                        severity: 'high',
                        message: `Verse ${verseNum} recited, but expected range is ${expectedStart}-${expectedEnd}`,
                        suggestion: `Verify you're reciting the correct section of the surah`
                    });
                }
            }
        }

        // Check 4: Verses from different surah (if surah info available in alignments)
        if (alignments.some(v => v.surah)) {
            for (const alignment of recitedVerses) {
                if (alignment.surah && alignment.surah !== surahId) {
                    const wrongSurahName = this.quranService.quranData.find(v =>
                        v.surah === alignment.surah
                    )?.surahName || 'Unknown';

                    const correctSurahName = this.quranService.quranData.find(v =>
                        v.surah === surahId
                    )?.surahName || 'Unknown';

                    issues.push({
                        type: 'different_surah',
                        verse: alignment.ayah,
                        expectedSurah: {
                            id: surahId,
                            name: correctSurahName
                        },
                        actualSurah: {
                            id: alignment.surah,
                            name: wrongSurahName
                        },
                        severity: 'high',
                        message: `Verse ${alignment.ayah} is from ${wrongSurahName}, but expected ${correctSurahName}`,
                        suggestion: `Focus on one surah at a time to avoid mixing`
                    });
                }
            }
        }

        return issues;
    }

    /**
     * Perform detailed analysis after position is verified
     */
    async performDetailedAnalysis(preprocessedText, surahId, startVerse, endVerse, metadata, basicRepeatDetection, originalTranscript) {
        console.log('═══════════════════════════════════════════════════════');
        console.log('📊 DETAILED ANALYSIS (Position Verified)');
        console.log('═══════════════════════════════════════════════════════\n');

        let alignments, verseRange, alignTime;

        if (startVerse && endVerse) {
            // Specific verse range (from fast-path)
            const result = await this.alignToSpecificVerses(
                preprocessedText,
                surahId,
                startVerse,
                endVerse
            );
            alignments = result.alignments;
            verseRange = result.verseRange;
            alignTime = result.processingTime;
        } else {
            // Full surah (from n-gram) - detect range during alignment
            const result = await this.alignToVerses(preprocessedText, surahId);
            alignments = result.alignments;
            verseRange = result.verseRange;
            alignTime = result.processingTime;
        }

        // Stage 2: Verse-aware repeat verification
        // Re-check the detected repeats using verse context to filter out natural Quranic repetition
        console.log('\n═══════════════════════════════════════════════════════');
        console.log('🔄 STAGE 2: Verse-Aware Repeat Verification');
        console.log('═══════════════════════════════════════════════════════\n');

        console.log(`   Stage 1 found ${basicRepeatDetection.repeats.length} potential repeat(s)`);

        // Run verse-aware detection on ORIGINAL transcript
        const originalWords = originalTranscript.split(/\s+/).filter(w => w.length > 0);
        const verseAwareDetection = this.detectRepeatsWithVerseContext(
            originalWords,
            alignments,
            surahId
        );

        console.log(`   After verse-aware verification: ${verseAwareDetection.repeats.length} actual user correction(s)`);

        if (basicRepeatDetection.repeats.length > verseAwareDetection.repeats.length) {
            const filtered = basicRepeatDetection.repeats.length - verseAwareDetection.repeats.length;
            console.log(`   ✅ Filtered out ${filtered} natural Quranic repetition(s)`);
        }

        if (verseAwareDetection.repeats.length > 0) {
            console.log('\n   User corrections detected:');
            verseAwareDetection.repeats.forEach((repeat, idx) => {
                console.log(`     ${idx + 1}. ${repeat.type}: "${repeat.words.join(' ')}" (${repeat.wordCount} words)`);
            });
        } else {
            console.log('   ✅ No user corrections - all repetitions are natural Quranic structure');
        }

        // Use the verse-aware results as final repeat detection
        const repeatDetection = verseAwareDetection;

        // Phase 2.7: Detect verse order issues
        console.log('\n═══════════════════════════════════════════════════════');
        console.log('📍 VERSE ORDER DETECTION');
        console.log('═══════════════════════════════════════════════════════\n');

        const verseOrderIssues = this.detectVerseOrderIssues(alignments, verseRange, surahId);

        if (verseOrderIssues.length > 0) {
            console.log(`   ⚠️  Found ${verseOrderIssues.length} verse order issue(s):`);
            verseOrderIssues.forEach((issue, idx) => {
                console.log(`     ${idx + 1}. ${issue.type}: ${issue.message}`);
            });
        } else {
            console.log('   ✅ All verses in correct order');
        }

        // Phase 3: Detect skips
        const skipDetection = this.detectSkips(alignments);

        // Phase 4: Generate report
        const totalProcessingTime = Date.now() - metadata.pipelineStart;

        const surahInfo = alignments[0];  // Get surah info from first alignment
        const report = this.generateReport(
            {
                success: true,
                primarySurah: {
                    id: surahId,
                    name: surahInfo ? this.quranService.quranData.find(v => v.surah === surahId)?.surahName : 'Unknown',
                    detectionMethod: metadata.detectionMethod,
                    confidence: metadata.confidence
                }
            },
            alignments,
            skipDetection,
            verseRange,
            {
                ...metadata,
                totalProcessingTime,
                verificationScores: metadata.verificationScores
            },
            preprocessedText,
            repeatDetection
        );

        // Add confidence and verification scores to report
        report.confidence = metadata.confidence;
        report.verificationScores = metadata.verificationScores;
        report.detectionMethod = metadata.detectionMethod;

        // Add repeat detection results (always available now)
        if (repeatDetection.repeats.length > 0) {
            report.repeats = repeatDetection.repeats;
            report.repeatStats = repeatDetection.stats;
        }

        // Add verse order issues if any
        if (verseOrderIssues.length > 0) {
            report.verseOrderIssues = verseOrderIssues;
        }

        return report;
    }
}

module.exports = RecitationAnalyzer;
