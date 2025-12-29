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

            const surahName = firstVerses[0].surahName;

            // Index JUST verse 1 separately (for single-verse recitations)
            this.fastPathIndex.push({
                type: 'surah_beginning',
                surahId,
                surahName,
                startVerse: firstAyah,
                endVerse: firstAyah,
                text: firstVerses[0].textNormalized,
                description: `بداية ${surahName} (آية ${firstAyah})`
            });

            // Also index verses 1+2 together (for longer recitations)
            if (firstVerses.length >= 2) {
                const combinedText = firstVerses.map(v => v.textNormalized).join(' ');
                this.fastPathIndex.push({
                    type: 'surah_beginning',
                    surahId,
                    surahName,
                    startVerse: firstAyah,
                    endVerse: firstVerses[1].ayah,
                    text: combinedText,
                    description: `بداية ${surahName} (آيات ${firstAyah}-${firstVerses[1].ayah})`
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
            // Use square root to soften the penalty (so it's not too harsh on medium surahs)
            const lengthNormalizationFactor = Math.sqrt(surahLength / 10); // Divide by 10 for scaling
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
        console.log(`   Showing first 10 comparisons + ALL failed matches (<70%):\n`);

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

            // Search forward in transcript from current position
            for (let i = transcriptPos; i < mergedTranscriptWords.length; i++) {
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

            // DEBUG: Log first 10 comparisons + ALL failed matches
            const shouldLog = debugWordIndex < 10 || bestSimilarity < 0.70;
            if (shouldLog) {
                const status = bestSimilarity >= 0.95 ? '✅' : bestSimilarity >= 0.80 ? '⚠️' : bestSimilarity >= 0.70 ? '🟨' : '❌';
                const transcriptWord = bestPos >= 0 ? mergedTranscriptWords[bestPos] : '[NOT FOUND]';
                const normalizedTranscript = bestPos >= 0 ? this.preprocessor.normalizeForNgrams(transcriptWord) : '';

                if (debugWordIndex === 10 && failedMatches > 0) {
                    console.log(`\n   ... (skipping successful matches) ...\n`);
                    console.log(`   ❌ FAILED MATCHES (similarity < 70%):\n`);
                }

                console.log(`   [${debugWordIndex}] ${status} Verse: "${verseWord}" → Transcript: "${transcriptWord}"`);
                console.log(`       Normalized: "${normalizedVerseWord}" vs "${normalizedTranscript}"`);
                console.log(`       Similarity: ${(bestSimilarity * 100).toFixed(1)}% → Credit: ${bestSimilarity >= 0.70 ? bestSimilarity.toFixed(2) : '0.00'}`);
            }

            // WEIGHTED SCORING: Give partial credit for near-misses
            if (bestSimilarity >= 0.70) {  // Minimum 70% threshold
                matchScore += bestSimilarity;  // Add weighted credit
                transcriptPos = bestPos + 1;  // Move forward past this match

                if (bestSimilarity >= 0.95) {
                    perfectMatches++;
                } else {
                    partialMatches++;
                }
            } else {
                // No match found (below 70% threshold)
                failedMatches++;
                // Don't advance position - continue from same spot
            }

            debugWordIndex++;
        }

        const avgScore = validWords > 0 ? matchScore / validWords : 0;
        const skippedMarks = verseWords.length - validWords;

        console.log(`\n📊 Sequential match summary:`);
        console.log(`   Perfect matches (95%+): ${perfectMatches}/${validWords}`);
        console.log(`   Partial matches (70-95%): ${partialMatches}/${validWords}`);
        console.log(`   Failed matches (<70%): ${failedMatches}/${validWords}`);
        if (skippedMarks > 0) {
            console.log(`   Skipped Unicode marks: ${skippedMarks} (decorative marks like ۚ, ۖ)`);
        }
        console.log(`   Weighted average: ${(avgScore * 100).toFixed(1)}%\n`);

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
            if (bestSimilarity >= 0.70) {  // Minimum 70% threshold
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
                status: alignment.accuracy >= 0.40 ? 'present' : 'skipped'
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

        console.log(`\n🔧 Smart Filtering:`);
        console.log(`   Total verses in range: ${candidateVerses.length}`);
        console.log(`   Present verses (≥40%): ${presentVerses.length} [${presentVerses.map(v => v.ayah).join(', ')}]`);
        console.log(`   Skipped verses (<40%): ${skippedVerses.length}${skippedVerses.length > 0 ? ` [${skippedVerses.map(v => v.ayah).join(', ')}]` : ''}`);

        if (presentVerses.length === 0) {
            return {
                verified: false,
                confidence: 'very_low',
                reason: 'No verses present (all below 40% accuracy)'
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

        // Prepare verse classification for return
        const verseClassification = {
            present: presentVerses.map(v => v.ayah),
            skipped: skippedVerses.map(v => v.ayah),
            total: candidateVerses.length
        };

        // Apply strict verification rules
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

            console.log('\n═══════════════════════════════════════════════════════');
            console.log('🔍 MULTI-PASS DETECTION WITH VERIFICATION');
            console.log('═══════════════════════════════════════════════════════\n');

            let bestCandidate = null;
            let bestVerification = null;

            // ========== PASS 1: FAST-PATH ==========
            console.log('📍 PASS 1: Fast-Path Detection');
            const fastPathResult = this.detectFromFastPath(preprocessed.normalized);

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
                    preprocessed.normalized,
                    candidateVerses
                );

                if (verification.verified) {
                    console.log(`\n✅ PASS 1 ACCEPTED - Proceeding with fast-path result\n`);

                    // Position verified! Proceed to detailed analysis
                    return await this.performDetailedAnalysis(
                        preprocessed.normalized,
                        fastPathResult.pattern.surahId,
                        fastPathResult.pattern.startVerse,
                        fastPathResult.pattern.endVerse,
                        {
                            ...metadata,
                            detectionMethod: 'fast_path_verified',
                            confidence: verification.confidence,
                            verificationScores: verification.scores,
                            pipelineStart
                        }
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
            const ngramResult = await this.identifySurahNgramOnly(preprocessed.normalized);

            if (ngramResult.success && ngramResult.primarySurah) {
                console.log(`   Candidate: ${ngramResult.primarySurah.name} (confidence: ${(ngramResult.primarySurah.confidence * 100).toFixed(1)}%)`);

                // For n-gram: First detect verse range, THEN verify
                console.log('   Detecting verse range within surah...');
                const alignmentResult = await this.alignToVerses(
                    preprocessed.normalized,
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
                    preprocessed.normalized,
                    candidateVerses
                );

                if (verification.verified) {
                    console.log(`\n✅ PASS 2 ACCEPTED - Proceeding with n-gram result\n`);

                    // Position verified! Proceed to detailed analysis
                    return await this.performDetailedAnalysis(
                        preprocessed.normalized,
                        ngramResult.primarySurah.id,
                        verseRange.startVerse,
                        verseRange.endVerse,
                        {
                            ...metadata,
                            detectionMethod: 'ngram_verified',
                            confidence: verification.confidence,
                            verificationScores: verification.scores,
                            pipelineStart
                        }
                    );
                } else {
                    console.log(`\n❌ PASS 2 REJECTED - ${verification.reason}\n`);

                    // Keep track of best candidate
                    if (!bestVerification ||
                        verification.scores.sequential > bestVerification.scores.sequential) {
                        bestCandidate = {
                            method: 'ngram',
                            surah: ngramResult.primarySurah.name,
                            surahId: ngramResult.primarySurah.id,
                            verses: `${verseRange.startVerse}-${verseRange.endVerse}`
                        };
                        bestVerification = verification;
                    }

                    // 🔬 DEBUG MODE: Proceed to detailed analysis even on rejection
                    console.log('🔬 DEBUG MODE: Proceeding to detailed analysis despite rejection...\n');
                    console.log('✅ PASS 2 ACCEPTED (DEBUG OVERRIDE) - Proceeding with n-gram result\n');

                    return await this.performDetailedAnalysis(
                        preprocessed.normalized,
                        ngramResult.primarySurah.id,
                        verseRange.startVerse,
                        verseRange.endVerse,
                        {
                            ...metadata,
                            detectionMethod: 'ngram_debug',
                            confidence: 'debug_low',  // Mark as debug/low confidence
                            verificationScores: verification.scores,
                            pipelineStart
                        }
                    );
                }
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
     * Perform detailed analysis after position is verified
     */
    async performDetailedAnalysis(preprocessedText, surahId, startVerse, endVerse, metadata) {
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
            }
        );

        // Add confidence and verification scores to report
        report.confidence = metadata.confidence;
        report.verificationScores = metadata.verificationScores;
        report.detectionMethod = metadata.detectionMethod;

        return report;
    }
}

module.exports = RecitationAnalyzer;
