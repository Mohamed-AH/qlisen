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
        // Step 1: Normalize
        const normalized = this.normalizeArabic(rawTranscript);

        // Step 2: Remove garbage
        const cleaned = this.removeGarbage(normalized);

        // Step 3: Final normalization
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
