/**
 * Text Preprocessing Utilities
 * Enhanced normalization and garbage token removal for Arabic transcripts
 */

class TextPreprocessor {
    constructor() {
        // Common filler words and speech errors to remove
        this.garbageTokens = new Set([
            // Single letters (except valid Arabic prefixes)
            'Y', 'N', 'R', 'A', 'E', 'I', 'O', 'U',
            // Filler words
            'يعني', 'اه', 'ام', 'ممم', 'اهم', 'يا',
            // Common speech errors
            'مين', 'ايه', 'لي', 'ما',
            // Numbers
            '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩', '٠'
        ]);

        // Valid single-letter Arabic words
        this.validSingleLetters = new Set(['و', 'ب', 'ل', 'ف', 'ك']);

        // Numeral to Arabic word mapping (for speech recognition numerals)
        this.numeralToArabic = new Map([
            // Common numbers in Quran
            ['1', 'واحد'],
            ['2', 'اثنين'],
            ['3', 'ثلاثه'],
            ['4', 'اربعه'],
            ['5', 'خمسه'],
            ['6', 'سته'],
            ['7', 'سبعه'],
            ['8', 'ثمانيه'],
            ['9', 'تسعه'],
            ['10', 'عشره'],
            ['11', 'احد عشر'],
            ['12', 'اثنا عشر'],
            ['19', 'تسعه عشر'],
            ['20', 'عشرين'],
            ['30', 'ثلاثين'],
            ['40', 'اربعين'],
            ['50', 'خمسين'],
            ['60', 'ستين'],
            ['70', 'سبعين'],
            ['80', 'ثمانين'],
            ['90', 'تسعين'],
            ['100', 'مايه'],
            ['300', 'ثلاثمايه'],
            ['1000', 'الف'],
            ['2000', 'الفين'],
            ['3000', 'ثلاثه الاف'],
            ['50000', 'خمسين الف'],
            ['100000', 'مايه الف']
        ]);

        // Common ritual phrases said before/after Quran recitation
        // IMPORTANT: Only include phrases that are NOT in the Quran text
        // "بسم الله الرحمن الرحيم" appears in Al-Fatiha and An-Naml, so we don't remove it
        // "استعيذ بالله من الشيطان الرجيم" appears in Quran, so we don't remove it
        this.ritualPhrases = {
            // Opening phrases (before recitation) - SAFE to remove
            opening: [
                'اعوذ بالله من الشيطان الرجيم',  // NOT in Quran (uses أعوذ, not استعيذ)
                'اعوذ بالله من الشيطان',
            ],
            // Closing phrases (after recitation) - SAFE to remove
            closing: [
                'صدق الله العظيم',   // NOT in Quran
                'صدق الله',
            ]
        };
    }

    /**
     * Convert numerals to Arabic words
     * Speech recognition often outputs "300" instead of "ثلاثمائة"
     */
    convertNumeralsToArabic(text) {
        const words = text.split(/\s+/);
        const convertedWords = words.map(word => {
            // Check if word is a pure numeral
            if (/^\d+$/.test(word)) {
                // Try to find exact match in our mapping
                const arabicWord = this.numeralToArabic.get(word);
                if (arabicWord) {
                    return arabicWord;
                }
            }
            return word;
        });

        return convertedWords.join(' ');
    }

    /**
     * Remove ritual phrases from beginning and end of text
     * People often say "أعوذ بالله" before and "صدق الله العظيم" after
     */
    removeRitualPhrases(text) {
        let cleaned = text;

        // First normalize to match phrases better
        const normalized = this.normalizeArabic(cleaned);

        // Remove opening phrases from the beginning
        for (const phrase of this.ritualPhrases.opening) {
            const normalizedPhrase = this.normalizeArabic(phrase);

            // Check if text starts with this phrase
            if (normalized.startsWith(normalizedPhrase)) {
                // Remove from original text (preserve case)
                const phraseLength = normalizedPhrase.split(/\s+/).length;
                const words = cleaned.split(/\s+/);
                cleaned = words.slice(phraseLength).join(' ').trim();

                // Re-normalize for next iteration
                const newNormalized = this.normalizeArabic(cleaned);
                if (newNormalized !== normalized) {
                    return this.removeRitualPhrases(cleaned); // Recursively check again
                }
            }
        }

        // Remove closing phrases from the end
        const normalizedForClosing = this.normalizeArabic(cleaned);
        for (const phrase of this.ritualPhrases.closing) {
            const normalizedPhrase = this.normalizeArabic(phrase);

            // Check if text ends with this phrase
            if (normalizedForClosing.endsWith(normalizedPhrase)) {
                // Remove from original text
                const phraseLength = normalizedPhrase.split(/\s+/).length;
                const words = cleaned.split(/\s+/);
                cleaned = words.slice(0, -phraseLength).join(' ').trim();

                // Re-normalize for next iteration
                const newNormalized = this.normalizeArabic(cleaned);
                if (newNormalized !== normalizedForClosing) {
                    return this.removeRitualPhrases(cleaned); // Recursively check again
                }
            }
        }

        return cleaned;
    }

    /**
     * Aggressive Arabic normalization
     */
    normalizeArabic(text) {
        return text
            // Remove diacritics
            .replace(/[ًٌٍَُِّْٰ]/g, '')
            // Normalize alef variations
            .replace(/[إأآٱا]/g, 'ا')
            // Normalize ya variations
            .replace(/[ىيئ]/g, 'ي')
            // Normalize ta marbuta and ha
            .replace(/[ةه]/g, 'ه')
            // Normalize waw variations
            .replace(/[وؤ]/g, 'و')
            // Remove hamza
            .replace(/ء/g, '')
            // Remove alef wasla
            .replace(/ٱ/g, '')
            // Remove tatweel/kashida
            .replace(/[ـ\u0640]/g, '')
            // Normalize spaces
            .trim()
            .replace(/\s+/g, ' ');
    }

    /**
     * SUPER aggressive normalization for n-gram matching
     * Removes ALL Unicode combining marks and variations that Whisper doesn't capture
     * This is specifically for n-gram matching to handle Whisper STT errors
     */
    normalizeForNgrams(text) {
        return text
            // First apply basic normalization
            .replace(/[ًٌٍَُِّْٰ]/g, '') // Remove standard diacritics

            // Remove ALL Arabic Unicode combining marks (U+0600 to U+06FF range)
            // This includes: ٓ (U+0653), ۟ (U+06DF), ۖ (U+06D6), ۗ (U+06D7), etc.
            .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')

            // Normalize ALL alef variations (more comprehensive)
            .replace(/[إأآٱاٲٳٵ]/g, 'ا')

            // Normalize ALL ya variations
            .replace(/[ىيیۍېئ]/g, 'ي')

            // Normalize ta marbuta and ha
            .replace(/[ةه]/g, 'ه')

            // Normalize ALL waw variations
            .replace(/[وؤٶ]/g, 'و')

            // Remove ALL types of hamza
            .replace(/[ءأإآؤئ]/g, '')

            // Remove tatweel/kashida
            .replace(/[ـ\u0640]/g, '')

            // Remove Arabic decorative marks
            .replace(/[\u06E5-\u06E9]/g, '')

            // Remove paragraph separator and other special marks
            .replace(/[\u060C\u061B\u061F\u06DD]/g, '')

            // Remove sajdah and other markers
            .replace(/[\u06DE\u۞]/g, '')

            // Remove small alif above (common in يٓا)
            .replace(/ٓ/g, '')

            // Normalize spaces and trim
            .trim()
            .replace(/\s+/g, ' ')

            // Convert to lowercase (if applicable for Arabic)
            .toLowerCase();
    }

    /**
     * Merge common word splits caused by Whisper STT
     * Example: "يا يها" → "يايها", "ما ذا" → "ماذا"
     *
     * This fixes the word boundary mismatch between Quran and Whisper:
     * - Quran: "يٓايها" (1 word)
     * - Whisper: "يا يها" (2 words, should be merged)
     *
     * @param {Array<string>} words - Array of words
     * @returns {Array<string>} Words with common splits merged
     */
    mergeCommonSplits(words) {
        const merged = [];
        let i = 0;

        while (i < words.length) {
            const current = words[i];
            const next = words[i + 1];

            // Check if current + next form a common split pattern
            if (next && this.shouldMergeWords(current, next)) {
                // Merge the two words
                merged.push(current + next);
                i += 2; // Skip both words
            } else {
                merged.push(current);
                i += 1;
            }
        }

        return merged;
    }

    /**
     * Check if two words should be merged
     * Returns true for common Whisper split patterns
     */
    shouldMergeWords(word1, word2) {
        // Normalize both words for comparison
        const norm1 = this.normalizeForNgrams(word1);
        const norm2 = this.normalizeForNgrams(word2);

        // ONLY merge specific known patterns to avoid false positives
        // Being conservative is better than incorrectly merging valid words

        // 1. "يا يها" → "يايها" (O you) - most common split
        if (norm1 === 'يا' && (norm2 === 'يها' || norm2 === 'ايها')) {
            return true;
        }

        // 2. "ي يها" → "ييها" (variant)
        if (norm1 === 'ي' && (norm2 === 'يها' || norm2 === 'ايها')) {
            return true;
        }

        // 3. "ما ذا" → "ماذا" (what)
        if (norm1 === 'ما' && norm2 === 'ذا') {
            return true;
        }

        // 4. "من ذا" → "منذا" (who/from)
        if (norm1 === 'من' && norm2 === 'ذا') {
            return true;
        }

        // 5. "ل ما" → "لما" (when/for what)
        if (norm1 === 'ل' && norm2 === 'ما') {
            return true;
        }

        // DO NOT merge other short words - too risky for false positives
        // Examples of words that should NOT merge:
        // - "قل يا" (say, O) - two separate words
        // - "من دون" (besides) - two separate words
        // - "ان كنتم" (if you) - two separate words

        return false;
    }

    /**
     * Check if a word is garbage (should be removed)
     */
    isGarbageWord(word) {
        // Empty or very short
        if (!word || word.length === 0) return true;

        // Single character that's not a valid Arabic letter
        if (word.length === 1) {
            return !this.validSingleLetters.has(word);
        }

        // Contains Latin letters
        if (/[a-zA-Z]/.test(word)) return true;

        // Contains numbers
        if (/[0-9]/.test(word)) return true;

        // In garbage token list
        if (this.garbageTokens.has(word)) return true;

        // Mixed Arabic and non-Arabic
        const hasArabic = /[\u0600-\u06FF]/.test(word);
        const hasNonArabic = /[^\u0600-\u06FF\s]/.test(word);
        if (hasArabic && hasNonArabic) return true;

        return false;
    }

    /**
     * Remove garbage tokens from text
     */
    removeGarbage(text) {
        const words = text.split(/\s+/);
        const cleanWords = [];

        for (let i = 0; i < words.length; i++) {
            const word = words[i].trim();

            // Skip garbage words
            if (this.isGarbageWord(word)) {
                continue;
            }

            // Check for isolated valid words (surrounded by garbage)
            // Skip them as they're likely errors
            if (i > 0 && i < words.length - 1) {
                const prevGarbage = this.isGarbageWord(words[i - 1]);
                const nextGarbage = this.isGarbageWord(words[i + 1]);

                // If both neighbors are garbage and this is a common word, might be error
                if (prevGarbage && nextGarbage && word.length <= 3) {
                    continue;
                }
            }

            cleanWords.push(word);
        }

        return cleanWords.join(' ');
    }

    /**
     * Full preprocessing pipeline
     */
    preprocess(rawTranscript) {
        // Step 1: Convert numerals to Arabic words (speech recognition fix)
        const withArabicNumbers = this.convertNumeralsToArabic(rawTranscript);

        // Step 2: Remove ritual phrases (audhu billah, sadaqallahu, etc.)
        const withoutRituals = this.removeRitualPhrases(withArabicNumbers);

        // Step 3: Normalize
        const normalized = this.normalizeArabic(withoutRituals);

        // Step 4: Remove garbage
        const cleaned = this.removeGarbage(normalized);

        // Step 5: Final normalization
        const final = this.normalizeArabic(cleaned);

        return {
            original: rawTranscript,
            normalized: final,
            wordCount: final.split(/\s+/).filter(w => w.length > 0).length,
            removedTokens: rawTranscript.split(/\s+/).length - final.split(/\s+/).length
        };
    }

    /**
     * Extract n-grams from text
     */
    extractNgrams(text, n) {
        const words = text.split(/\s+/).filter(w => w.length > 0);
        const ngrams = [];

        for (let i = 0; i <= words.length - n; i++) {
            const ngram = words.slice(i, i + n).join(' ');
            ngrams.push(ngram);
        }

        return ngrams;
    }

    /**
     * Extract multiple n-gram sizes
     */
    extractAllNgrams(text) {
        return {
            '2grams': this.extractNgrams(text, 2),
            '3grams': this.extractNgrams(text, 3),
            '4grams': this.extractNgrams(text, 4)
        };
    }
}

module.exports = TextPreprocessor;
