const path = require('path');
const fs = require('fs');

/**
 * QURAN DUPLICATE DISCOVERY SCRIPT (OPTIMIZED)
 *
 * Scans the entire Quran database to identify identical verse sequences
 * that appear in multiple locations (cross-surah or intra-surah).
 *
 * Criteria:
 * - Multi-verse sequences (any length) with ≥4 total words
 * - Single verses with ≥5 words (lowered from 10 to catch more duplicates)
 * - Excludes very short formulas like "بسم الله"
 *
 * Output: data/duplicates_registry.json
 */

// Load Quran data
const dataPath = path.join(__dirname, '..', '..', 'data', 'quran-uthmani.json');
const quranDataRaw = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const quranData = quranDataRaw.verses;

console.log('🔍 QURAN DUPLICATE DISCOVERY SCRIPT (OPTIMIZED)');
console.log('═'.repeat(80));
console.log(`Loaded ${quranData.length} verses from Quran database\n`);

/**
 * Get normalized text
 */
function getNormalizedText(verse) {
    if (!verse || !verse.textNormalized) return '';
    return verse.textNormalized
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}

/**
 * Count words in text
 */
function countWords(text) {
    return text.split(/\s+/).filter(w => w.length > 0).length;
}

/**
 * Get surrounding verse for UI hint
 */
function getSurroundingHint(surahId, verseNum) {
    const nextVerse = quranData.find(v => v.surah === surahId && v.ayah === verseNum + 1);
    if (nextVerse) {
        const words = nextVerse.textNormalized.split(/\s+/).slice(0, 5).join(' ');
        return `بعد: ${words}...`;
    }

    const prevVerse = quranData.find(v => v.surah === surahId && v.ayah === verseNum - 1);
    if (prevVerse) {
        const words = prevVerse.textNormalized.split(/\s+/).slice(-5).join(' ');
        return `قبل: ...${words}`;
    }

    return '';
}

/**
 * OPTIMIZED: Build sequence map in single pass
 */
function discoverDuplicates() {
    console.log('📊 Phase 1: Building sequence map...\n');

    // Map: normalized_text -> [{surahId, startVerse, endVerse, ...}]
    const sequenceMap = new Map();

    // Group verses by surah
    const versesBySurah = new Map();
    quranData.forEach(verse => {
        if (!versesBySurah.has(verse.surah)) {
            versesBySurah.set(verse.surah, []);
        }
        versesBySurah.get(verse.surah).push(verse);
    });

    let surahCount = 0;
    const totalSurahs = versesBySurah.size;

    // For each surah, generate all possible sequences
    for (const [surahId, verses] of versesBySurah) {
        surahCount++;
        if (surahCount % 10 === 0) {
            console.log(`   Processed ${surahCount}/${totalSurahs} surahs...`);
        }

        // Max sequence length to check (limit to 20 verses for performance)
        const MAX_SEQUENCE_LENGTH = Math.min(20, verses.length);

        for (let i = 0; i < verses.length; i++) {
            for (let seqLength = 1; seqLength <= MAX_SEQUENCE_LENGTH && i + seqLength <= verses.length; seqLength++) {
                const sequenceVerses = verses.slice(i, i + seqLength);
                const normalizedText = sequenceVerses
                    .map(v => getNormalizedText(v))
                    .join(' ');

                const wordCount = countWords(normalizedText);

                // Apply filtering criteria
                if (seqLength === 1 && wordCount < 5) {
                    // Single verse must have ≥5 words
                    break; // No point checking longer sequences starting here
                }

                if (seqLength > 1 && wordCount < 4) {
                    // Multi-verse sequences must have ≥4 total words
                    continue;
                }

                // Add to map
                if (!sequenceMap.has(normalizedText)) {
                    sequenceMap.set(normalizedText, []);
                }

                sequenceMap.get(normalizedText).push({
                    surahId: surahId,
                    surahName: sequenceVerses[0].surahName,
                    startVerse: sequenceVerses[0].ayah,
                    endVerse: sequenceVerses[sequenceVerses.length - 1].ayah,
                    verseCount: seqLength,
                    wordCount: wordCount,
                    verseRange: sequenceVerses[0].ayah === sequenceVerses[sequenceVerses.length - 1].ayah ?
                        `${sequenceVerses[0].ayah}` :
                        `${sequenceVerses[0].ayah}-${sequenceVerses[sequenceVerses.length - 1].ayah}`,
                    uiHint: getSurroundingHint(surahId, sequenceVerses[sequenceVerses.length - 1].ayah)
                });
            }
        }
    }

    console.log(`\n✅ Phase 1 Complete: Built map with ${sequenceMap.size} unique sequences\n`);

    // Phase 2: Filter for duplicates only (sequences with 2+ occurrences)
    console.log('📊 Phase 2: Filtering for duplicates...\n');

    const duplicates = new Map();
    for (const [text, locations] of sequenceMap) {
        if (locations.length >= 2) {
            // Duplicate found!
            duplicates.set(text, {
                text: text,
                wordCount: locations[0].wordCount,
                verseCount: locations[0].verseCount,
                occurrences: locations
            });
        }
    }

    console.log(`✅ Phase 2 Complete: Found ${duplicates.size} duplicate sequences\n`);
    return duplicates;
}

/**
 * Format registry for output
 */
function formatRegistry(duplicates) {
    const registry = {};

    for (const [normalizedText, data] of duplicates) {
        // Use normalized text as key (truncated for readability)
        const keyPreview = normalizedText.substring(0, 50);

        registry[normalizedText] = {
            text_preview: keyPreview + (normalizedText.length > 50 ? '...' : ''),
            text_full: normalizedText,
            word_count: data.wordCount,
            verse_count: data.verseCount,
            occurrences: data.occurrences
        };
    }

    return registry;
}

/**
 * Generate statistics report
 */
function generateReport(duplicates) {
    console.log('📊 DUPLICATE DISCOVERY REPORT');
    console.log('═'.repeat(80));
    console.log(`Total duplicate sequences found: ${duplicates.size}\n`);

    // Categorize
    const singleVerse = [];
    const multiVerse = [];
    const intraSurah = [];
    const crossSurah = [];

    for (const [text, data] of duplicates) {
        if (data.verseCount === 1) {
            singleVerse.push(data);
        } else {
            multiVerse.push(data);
        }

        // Check if all occurrences in same surah
        const surahIds = new Set(data.occurrences.map(o => o.surahId));
        if (surahIds.size === 1) {
            intraSurah.push(data);
        } else {
            crossSurah.push(data);
        }
    }

    console.log(`📌 By Verse Count:`);
    console.log(`   Single-verse duplicates: ${singleVerse.length}`);
    console.log(`   Multi-verse duplicates: ${multiVerse.length}`);
    console.log();

    console.log(`📌 By Location:`);
    console.log(`   Intra-surah duplicates: ${intraSurah.length}`);
    console.log(`   Cross-surah duplicates: ${crossSurah.length}`);
    console.log();

    console.log(`📌 Top 10 Duplicates (by word count):`);
    const sorted = Array.from(duplicates.values())
        .sort((a, b) => b.wordCount - a.wordCount)
        .slice(0, 10);

    sorted.forEach((dup, idx) => {
        const refs = dup.occurrences.map(o =>
            `${o.surahName} ${o.verseRange}`
        ).join(', ');
        console.log(`   ${idx + 1}. [${dup.wordCount} words, ${dup.verseCount} verses] ${refs}`);
    });
    console.log();
}

/**
 * Main execution
 */
function main() {
    const startTime = Date.now();

    // Discover duplicates
    const duplicates = discoverDuplicates();

    // Generate report
    generateReport(duplicates);

    // Format and save registry
    const registry = formatRegistry(duplicates);
    const outputPath = path.join(__dirname, '..', '..', 'data', 'duplicates_registry.json');

    fs.writeFileSync(
        outputPath,
        JSON.stringify(registry, null, 2),
        'utf8'
    );

    const duration = Date.now() - startTime;

    console.log(`✅ Registry saved to: data/duplicates_registry.json`);
    console.log(`⏱️  Total execution time: ${(duration / 1000).toFixed(2)}s`);
    console.log('═'.repeat(80));
}

// Run
main();
