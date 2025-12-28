/**
 * Bilingual Support - Arabic/English Translations
 */

const TRANSLATIONS = {
    ar: {
        // Page Title
        pageTitle: 'قليسن - تحقق من تلاوتك',

        // Header
        appTitle: 'قليسن',
        appSubtitle: 'تحقق من تلاوة القرآن الكريم',
        langBtn: 'English',

        // Recording Section
        recordTitle: 'ابدأ التسجيل',
        recordInstructions: 'اضغط على زر الاستماع وابدأ التلاوة، ثم اضغط مرة أخرى للتوقف',
        uploadInstructions: 'سجل صوتك باستخدام تطبيق التسجيل في هاتفك، ثم ارفع الملف هنا',
        recordText: 'استمع',
        recordIcon: '🎤',
        stopText: 'إيقاف',
        stopIcon: '⏹️',
        uploadText: 'ارفع ملف',
        orText: 'أو',

        // Recording Status
        recordingText: 'جاري التسجيل...',
        processingText: 'جاري المعالجة...',
        transcribingText: 'جاري النسخ...',
        analyzingText: 'جاري التحليل...',

        // Results Section
        resultsTitle: 'نتيجة التحليل',
        accuracyLabel: 'الدقة',
        transcriptTitle: 'النص المنسوخ:',
        versesTitle: 'تحليل الآيات:',
        recommendationsTitle: 'توصيات:',
        tryAgainText: 'حاول مرة أخرى',

        // Verse Status
        statusPerfect: 'ممتاز',
        statusGood: 'جيد',
        statusPartial: 'جزئي',
        statusSkipped: 'مفقود',

        // Verse Stats
        wordsMatched: 'كلمات صحيحة',
        wordsMissing: 'كلمات ناقصة',
        verse: 'آية',

        // Queued Section
        queuedTitle: 'تم إضافتك إلى قائمة الانتظار',
        queuedMessage: 'الخادم مشغول حالياً. سنرسل لك النتائج عبر البريد الإلكتروني قريباً.',
        jobIdLabel: 'رقم الطلب:',
        backText: 'العودة',

        // Help Modal
        helpTitle: 'كيفية الاستخدام',
        helpSteps: [
            'اضغط على زر "استمع" لبدء التسجيل',
            'اتل ما تحفظ من القرآن الكريم',
            'اضغط على الزر مرة أخرى للتوقف',
            'انتظر النتائج - سيتم تحليل تلاوتك آية بآية',
            'راجع الآيات المفقودة والكلمات الناقصة'
        ],
        tipsTitle: 'نصائح:',
        tipsList: [
            'تأكد من وجودك في مكان هادئ',
            'تكلم بوضوح وبصوت مسموع',
            'يفضل تلاوة سورة واحدة في كل تسجيل',
            'السور القصيرة تعطي نتائج أسرع'
        ],

        // Errors
        errorMicPermission: 'الرجاء السماح بالوصول إلى الميكروفون',
        errorRecording: 'حدث خطأ أثناء التسجيل',
        errorProcessing: 'حدث خطأ أثناء معالجة الصوت',
        errorNetwork: 'حدث خطأ في الاتصال بالخادم',
        errorBrowserSupport: 'متصفحك لا يدعم تسجيل الصوت'
    },

    en: {
        // Page Title
        pageTitle: 'Qlisen - Verify Your Recitation',

        // Header
        appTitle: 'Qlisen',
        appSubtitle: 'Quran Recitation Verification',
        langBtn: 'العربية',

        // Recording Section
        recordTitle: 'Start Recording',
        recordInstructions: 'Press the Listen button and start reciting, then press again to stop',
        uploadInstructions: 'Record your voice using your phone\'s recorder app, then upload the file here',
        recordText: 'Listen',
        recordIcon: '🎤',
        stopText: 'Stop',
        stopIcon: '⏹️',
        uploadText: 'Upload File',
        orText: 'OR',

        // Recording Status
        recordingText: 'Recording...',
        processingText: 'Processing...',
        transcribingText: 'Transcribing...',
        analyzingText: 'Analyzing...',

        // Results Section
        resultsTitle: 'Analysis Results',
        accuracyLabel: 'Accuracy',
        transcriptTitle: 'Transcript:',
        versesTitle: 'Verses Analysis:',
        recommendationsTitle: 'Recommendations:',
        tryAgainText: 'Try Again',

        // Verse Status
        statusPerfect: 'Perfect',
        statusGood: 'Good',
        statusPartial: 'Partial',
        statusSkipped: 'Skipped',

        // Verse Stats
        wordsMatched: 'words matched',
        wordsMissing: 'words missing',
        verse: 'Verse',

        // Queued Section
        queuedTitle: 'Added to Queue',
        queuedMessage: 'The server is currently busy. We will send you the results via email soon.',
        jobIdLabel: 'Job ID:',
        backText: 'Back',

        // Help Modal
        helpTitle: 'How to Use',
        helpSteps: [
            'Press the "Listen" button to start recording',
            'Recite what you have memorized from the Quran',
            'Press the button again to stop',
            'Wait for the results - your recitation will be analyzed verse by verse',
            'Review the skipped verses and missing words'
        ],
        tipsTitle: 'Tips:',
        tipsList: [
            'Make sure you are in a quiet place',
            'Speak clearly and audibly',
            'Prefer reciting one surah per recording',
            'Short surahs give faster results'
        ],

        // Errors
        errorMicPermission: 'Please allow access to the microphone',
        errorRecording: 'An error occurred while recording',
        errorProcessing: 'An error occurred while processing the audio',
        errorNetwork: 'An error occurred while connecting to the server',
        errorBrowserSupport: 'Your browser does not support audio recording'
    }
};

/**
 * Get current language from localStorage or default
 */
function getCurrentLanguage() {
    return localStorage.getItem(CONFIG.STORAGE_KEYS.language) || CONFIG.DEFAULT_LANG;
}

/**
 * Get translation for a key
 */
function t(key) {
    const lang = getCurrentLanguage();
    return TRANSLATIONS[lang][key] || key;
}

/**
 * Update all translatable elements on the page
 */
function updatePageTranslations() {
    const lang = getCurrentLanguage();
    const translations = TRANSLATIONS[lang];

    // Update document language and direction
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';

    // Update all elements with IDs
    for (const [key, value] of Object.entries(translations)) {
        const element = document.getElementById(key);
        if (element) {
            if (Array.isArray(value)) {
                // For lists (help steps, tips)
                if (element.tagName === 'OL' || element.tagName === 'UL') {
                    element.innerHTML = value.map(item => `<li>${item}</li>`).join('');
                }
            } else {
                element.textContent = value;
            }
        }
    }
}

/**
 * Toggle between Arabic and English
 */
function toggleLanguage() {
    const currentLang = getCurrentLanguage();
    const newLang = currentLang === 'ar' ? 'en' : 'ar';
    localStorage.setItem(CONFIG.STORAGE_KEYS.language, newLang);
    updatePageTranslations();
}
