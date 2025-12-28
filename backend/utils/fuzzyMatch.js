/**
 * Fuzzy String Matching Utilities
 * Levenshtein distance and similarity calculation
 */

/**
 * Calculate Levenshtein distance between two strings
 * @param {string} str1
 * @param {string} str2
 * @returns {number} Edit distance
 */
function levenshteinDistance(str1, str2) {
    const len1 = str1.length;
    const len2 = str2.length;

    // Create matrix
    const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));

    // Initialize first row and column
    for (let i = 0; i <= len1; i++) matrix[i][0] = i;
    for (let j = 0; j <= len2; j++) matrix[0][j] = j;

    // Fill matrix
    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;

            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,      // deletion
                matrix[i][j - 1] + 1,      // insertion
                matrix[i - 1][j - 1] + cost // substitution
            );
        }
    }

    return matrix[len1][len2];
}

/**
 * Calculate similarity score (0.0 - 1.0)
 * @param {string} str1
 * @param {string} str2
 * @returns {number} Similarity score (1.0 = identical, 0.0 = completely different)
 */
function levenshteinSimilarity(str1, str2) {
    const maxLen = Math.max(str1.length, str2.length);
    if (maxLen === 0) return 1.0; // Both empty strings

    const distance = levenshteinDistance(str1, str2);
    return 1.0 - (distance / maxLen);
}

/**
 * SUPER aggressive normalization for n-gram matching
 * Removes ALL Unicode combining marks and variations that Whisper STT doesn't capture
 * This matches the normalizeForNgrams() in textPreprocessor.js
 *
 * Why needed: Whisper cannot distinguish between:
 * - أ (alif with hamza above) vs ا (plain alif) vs إ (hamza below) vs آ (madda)
 * - ة (ta marbuta) vs ه (ha)
 * - ى (alif maqsura) vs ي (ya)
 * - Unicode combining marks like ٓ in يٓا
 *
 * @param {string} text - Arabic text to normalize
 * @returns {string} Aggressively normalized text
 */
function normalizeForNgrams(text) {
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
 * Find similar n-grams in index with optimization
 * @param {string} transcriptNgram - N-gram from user's transcript
 * @param {object} ngramIndex - Full n-gram index
 * @param {number} threshold - Minimum similarity (0.0 - 1.0)
 * @param {object} firstWordIndex - Optimized index by first word (optional)
 * @returns {array} Array of { ngram, similarity, verses }
 */
function findSimilarNgrams(transcriptNgram, ngramIndex, threshold = 0.70, firstWordIndex = null) {
    const matches = [];

    // CRITICAL: Normalize transcript n-gram BEFORE matching
    // This ensures Whisper transcription matches Quran text despite Unicode differences
    const normalizedTranscript = normalizeForNgrams(transcriptNgram);

    // Optimization: Use first-word index if available
    let candidates;
    if (firstWordIndex) {
        // Normalize first word for index lookup
        const firstWord = transcriptNgram.split(' ')[0];
        const normalizedFirstWord = normalizeForNgrams(firstWord);

        // Try to find candidates with normalized first word
        candidates = firstWordIndex[normalizedFirstWord] || firstWordIndex[firstWord] || [];
    } else {
        candidates = Object.keys(ngramIndex);
    }

    // Find fuzzy matches
    for (const indexNgram of candidates) {
        // CRITICAL: Normalize index n-gram before comparison
        // Example: "يٓايها الذين" (with ٓ) → "يايها الذين" (without ٓ)
        const normalizedIndex = normalizeForNgrams(indexNgram);

        // Compare NORMALIZED strings
        const similarity = levenshteinSimilarity(normalizedTranscript, normalizedIndex);

        if (similarity >= threshold) {
            matches.push({
                ngram: indexNgram,
                similarity: similarity,
                verses: ngramIndex[indexNgram]
            });
        }
    }

    // Sort by similarity descending
    matches.sort((a, b) => b.similarity - a.similarity);

    return matches;
}

/**
 * Build first-word index for optimization
 * @param {object} ngramIndex
 * @returns {object} Index mapping first word to n-grams
 */
function buildFirstWordIndex(ngramIndex) {
    const firstWordIndex = {};

    for (const ngram of Object.keys(ngramIndex)) {
        const firstWord = ngram.split(' ')[0];

        if (!firstWordIndex[firstWord]) {
            firstWordIndex[firstWord] = [];
        }

        firstWordIndex[firstWord].push(ngram);
    }

    return firstWordIndex;
}

module.exports = {
    levenshteinDistance,
    levenshteinSimilarity,
    findSimilarNgrams,
    buildFirstWordIndex
};
