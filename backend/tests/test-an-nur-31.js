const RecitationAnalyzer = require('../services/recitationAnalyzer');

const analyzer = new RecitationAnalyzer();

const text = "وَلَا يُبْدِينَ زِينَتَهُنَّ إِلَّا لِبُعُولَتِهِنَّ أَوْ آبَائِهِنَّ أَوْ آبَاءِ بُعُولَتِهِنَّ أَوْ أَبْنَائِهِنَّ أَوْ أَبْنَاءِ بُعُولَتِهِنَّ أَوْ إِخْوَانِهِنَّ أَوْ بَنِي إِخْوَانِهِنَّ أَوْ بَنِي أَخَوَاتِهِنَّ أَوْ نِسَائِهِنَّ أَوْ مَا مَلَكَتْ أَيْمَانُهُنَّ أَوِ التَّابِعِينَ غَيْرِ أُولِي الْإِرْبَةِ مِنَ الرِّجَالِ أَوِ الطِّفْلِ الَّذِينَ لَمْ يَظْهَرُوا عَلَىٰ عَوْرَاتِ النِّسَاءِ";

console.log('Testing An-Nur 31 with exact text from user output...\n');

analyzer.analyzeFull(text).then(result => {
    console.log('\n📊 RESULT:');
    console.log('   Success:', result.success);
    console.log('   Method:', result.method);
    console.log('   Confidence:', result.confidence);
    if (result.surah) {
        console.log('   Detected Surah:', result.surah.name, `(ID: ${result.surah.id})`);
    }

    if (result.success) {
        console.log('   ✅ PASS');
    } else {
        console.log('   ❌ FAIL');
        console.log('   Error:', result.error);
    }
});
