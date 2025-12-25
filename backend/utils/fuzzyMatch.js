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
 * Find similar n-grams in index with optimization
 * @param {string} transcriptNgram - N-gram from user's transcript
 * @param {object} ngramIndex - Full n-gram index
 * @param {number} threshold - Minimum similarity (0.0 - 1.0)
 * @param {object} firstWordIndex - Optimized index by first word (optional)
 * @returns {array} Array of { ngram, similarity, verses }
 */
function findSimilarNgrams(transcriptNgram, ngramIndex, threshold = 0.70, firstWordIndex = null) {
    const matches = [];

    // Optimization: Use first-word index if available
    let candidates;
    if (firstWordIndex) {
        const firstWord = transcriptNgram.split(' ')[0];
        candidates = firstWordIndex[firstWord] || [];
    } else {
        candidates = Object.keys(ngramIndex);
    }

    // Find fuzzy matches
    for (const indexNgram of candidates) {
        const similarity = levenshteinSimilarity(transcriptNgram, indexNgram);

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
