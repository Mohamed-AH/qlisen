/**
 * Test script for the new analyze-full endpoint
 * Tests post-processing analysis with sample transcripts
 */

const path = require('path');
const quranService = require('./services/quranService');
const RecitationAnalyzer = require('./services/recitationAnalyzer');

async function test() {
    console.log('🧪 Testing Post-Processing Analysis System\n');

    // Initialize Quran service
    console.log('📚 Loading Quran data...');
    await quranService.init(path.join(__dirname, '../data'));
    console.log('✅ Quran data loaded\n');

    // Create analyzer
    const analyzer = new RecitationAnalyzer(quranService);

    // Test 1: Perfect Al-Fatiha
    console.log('═══════════════════════════════════════════════════');
    console.log('Test 1: Perfect Al-Fatiha Recitation');
    console.log('═══════════════════════════════════════════════════\n');

    const perfectFatiha = `
        بسم الله الرحمن الرحيم
        الحمد لله رب العالمين
        الرحمن الرحيم
        مالك يوم الدين
        إياك نعبد وإياك نستعين
        اهدنا الصراط المستقيم
        صراط الذين أنعمت عليهم غير المغضوب عليهم ولا الضالين
    `;

    let result = await analyzer.analyzeFull(perfectFatiha, { duration: 30000 });
    console.log('Result:', JSON.stringify(result, null, 2));
    console.log('\n');

    // Test 2: Al-Fatiha with speech recognition errors (like user's example)
    console.log('═══════════════════════════════════════════════════');
    console.log('Test 2: Al-Fatiha with Speech Recognition Errors');
    console.log('═══════════════════════════════════════════════════\n');

    const noisyFatiha = `
        بسم الله الرحمن الرحيم الحمد لله رب العالمين الرحمن الرحيم
        مالك يوم الدين إياك نعبد Y يا كان نستعين مين ايه دين الصراط المستقيم
        صراط الذين النعم أنت عليهم غير المغضوب عليهم ولا الضوء اللي ما
    `;

    result = await analyzer.analyzeFull(noisyFatiha, { duration: 30000 });
    console.log('Result:', JSON.stringify(result, null, 2));
    console.log('\n');

    // Test 3: Al-Fatiha with skipped verse
    console.log('═══════════════════════════════════════════════════');
    console.log('Test 3: Al-Fatiha with Verse 3 Skipped');
    console.log('═══════════════════════════════════════════════════\n');

    const skippedVerse = `
        بسم الله الرحمن الرحيم
        الحمد لله رب العالمين
        مالك يوم الدين
        إياك نعبد وإياك نستعين
        اهدنا الصراط المستقيم
        صراط الذين أنعمت عليهم غير المغضوب عليهم ولا الضالين
    `;

    result = await analyzer.analyzeFull(skippedVerse, { duration: 25000 });
    console.log('Result:', JSON.stringify(result, null, 2));
    console.log('\n');

    // Test 4: Al-Ikhlas
    console.log('═══════════════════════════════════════════════════');
    console.log('Test 4: Al-Ikhlas');
    console.log('═══════════════════════════════════════════════════\n');

    const ikhlas = `
        قل هو الله أحد
        الله الصمد
        لم يلد ولم يولد
        ولم يكن له كفوا أحد
    `;

    result = await analyzer.analyzeFull(ikhlas, { duration: 15000 });
    console.log('Result:', JSON.stringify(result, null, 2));
    console.log('\n');

    console.log('✅ All tests completed!');
    process.exit(0);
}

test().catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
});
