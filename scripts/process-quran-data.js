#!/usr/bin/env node

/**
 * Process Madani Mushaf JSON data for Qlisen recitation checker
 *
 * Input: madani-mushaf-raw.json (page-based structure)
 * Output:
 *   - quran-uthmani.json (flat verse list with metadata)
 *   - quran-metadata.json (surah info, page boundaries)
 *   - ngram-index.json (position detection index)
 */

const fs = require('fs');
const path = require('path');

// Text normalization for Arabic (same as frontend)
function normalizeArabic(text) {
    return text
        .replace(/[ًٌٍَُِّْٰ]/g, '') // Remove all diacritics
        .replace(/[إأآٱا]/g, 'ا') // Normalize alef variations
        .replace(/[ىيئ]/g, 'ي') // Normalize ya variations
        .replace(/[ةه]/g, 'ه') // Normalize ta marbuta and ha
        .replace(/[وؤ]/g, 'و') // Normalize waw
        .replace(/ء/g, '') // Remove hamza
        .replace(/ٱ/g, '') // Remove alef wasla
        .replace(/ـ/g, '') // Remove tatweel
        .replace(/\u0640/g, '') // Remove kashida
        .trim()
        .replace(/\s+/g, ' '); // Normalize spaces
}

function processQuranData() {
    console.log('🔄 Processing Madani Mushaf data...\n');

    // Load raw data
    const rawPath = path.join(__dirname, '../data/madani-mushaf-raw.json');
    const rawData = JSON.parse(fs.readFileSync(rawPath, 'utf8'));

    console.log(`✅ Loaded ${rawData.length} pages\n`);

    // Data structures
    const verses = []; // Flat list of all verses
    const surahs = new Map(); // Surah metadata
    const pages = []; // Page metadata

    let globalVerseIndex = 0;

    // Process each page
    rawData.forEach((pageData, pageIndex) => {
        if (pageIndex === 0 || !pageData) return; // Skip empty first element

        const pageNumber = pageIndex;
        const pageVerses = [];

        // Get juz number
        const juzNumber = pageData.juzNumber || 1;

        // Process each chapter on this page
        for (const [key, chapter] of Object.entries(pageData)) {
            if (key === 'juzNumber') continue;

            const surahNumber = parseInt(chapter.chapterNumber);
            const surahNameAr = chapter.titleAr;
            const surahNameEn = chapter.titleEn;
            const totalVerses = parseInt(chapter.verseCount);

            // Store surah metadata
            if (!surahs.has(surahNumber)) {
                surahs.set(surahNumber, {
                    id: surahNumber,
                    name: surahNameAr,
                    nameEn: surahNameEn,
                    totalVerses: totalVerses,
                    startPage: pageNumber,
                    endPage: pageNumber,
                    revelation: 'Makkah' // Default, can be enhanced later
                });
            } else {
                // Update end page
                const surahData = surahs.get(surahNumber);
                surahData.endPage = pageNumber;
            }

            // Process verses in this chapter on this page
            chapter.text.forEach(verse => {
                const ayahNumber = parseInt(verse.verseNumber);
                const verseText = verse.text.trim();
                const normalizedText = normalizeArabic(verseText);

                const verseData = {
                    id: globalVerseIndex++,
                    surah: surahNumber,
                    surahName: surahNameAr,
                    surahNameEn: surahNameEn,
                    ayah: ayahNumber,
                    page: pageNumber,
                    juz: juzNumber,
                    text: verseText,
                    textNormalized: normalizedText,
                    wordCount: normalizedText.split(' ').filter(w => w.length > 0).length
                };

                verses.push(verseData);
                pageVerses.push(verseData);
            });
        }

        // Store page metadata
        pages.push({
            number: pageNumber,
            juz: juzNumber,
            versesOnPage: pageVerses.length,
            firstVerse: pageVerses[0] ? {
                surah: pageVerses[0].surah,
                ayah: pageVerses[0].ayah
            } : null,
            lastVerse: pageVerses[pageVerses.length - 1] ? {
                surah: pageVerses[pageVerses.length - 1].surah,
                ayah: pageVerses[pageVerses.length - 1].ayah
            } : null
        });
    });

    console.log(`✅ Processed ${verses.length} verses`);
    console.log(`✅ Found ${surahs.size} surahs`);
    console.log(`✅ Processed ${pages.length} pages\n`);

    // Create metadata
    const metadata = {
        totalSurahs: surahs.size,
        totalAyahs: verses.length,
        totalPages: pages.length,
        surahs: Array.from(surahs.values()).sort((a, b) => a.id - b.id),
        pages: pages.filter(p => p.number > 0) // Remove empty pages
    };

    // Save processed data
    const outputDir = path.join(__dirname, '../data');

    fs.writeFileSync(
        path.join(outputDir, 'quran-uthmani.json'),
        JSON.stringify({ verses }, null, 2)
    );
    console.log('✅ Saved: quran-uthmani.json');

    fs.writeFileSync(
        path.join(outputDir, 'quran-metadata.json'),
        JSON.stringify(metadata, null, 2)
    );
    console.log('✅ Saved: quran-metadata.json');

    // Build n-gram index for position detection
    console.log('\n🔄 Building n-gram index...');
    const ngramIndex = buildNgramIndex(verses);

    fs.writeFileSync(
        path.join(outputDir, 'ngram-index.json'),
        JSON.stringify(ngramIndex, null, 2)
    );
    console.log('✅ Saved: ngram-index.json');

    // Statistics
    const totalWords = verses.reduce((sum, v) => sum + v.wordCount, 0);
    console.log('\n📊 Statistics:');
    console.log(`   Total Verses: ${verses.length}`);
    console.log(`   Total Words: ${totalWords.toLocaleString()}`);
    console.log(`   Total Surahs: ${metadata.totalSurahs}`);
    console.log(`   Total Pages: ${metadata.totalPages}`);
    console.log(`   N-grams created: ${Object.keys(ngramIndex).length.toLocaleString()}`);
    console.log('\n✅ Quran data processing complete!\n');
}

function buildNgramIndex(verses) {
    const index = {};
    let ngramCount = 0;

    verses.forEach(verse => {
        const words = verse.textNormalized.split(' ').filter(w => w.length > 0);

        // Create 3-grams (3-word sequences)
        for (let i = 0; i < words.length - 2; i++) {
            const ngram = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;

            if (!index[ngram]) {
                index[ngram] = [];
            }

            index[ngram].push({
                verseId: verse.id,
                surah: verse.surah,
                ayah: verse.ayah,
                page: verse.page,
                juz: verse.juz,
                wordIndex: i
            });

            ngramCount++;
        }
    });

    console.log(`   Created ${ngramCount.toLocaleString()} n-gram entries`);
    console.log(`   Unique n-grams: ${Object.keys(index).length.toLocaleString()}`);

    return index;
}

// Run the script
try {
    processQuranData();
} catch (error) {
    console.error('❌ Error processing Quran data:', error);
    process.exit(1);
}
