/**
 * Telegram Bot for Qlisen - Quran Recitation Verification
 *
 * Users can send voice notes to the bot and get instant analysis results
 */

const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

class QlisenTelegramBot {
    constructor(token, backendURL) {
        if (!token) {
            throw new Error('Telegram bot token is required');
        }

        this.token = token;
        this.backendURL = backendURL || 'http://localhost:5001';
        this.bot = new TelegramBot(token, { polling: true });

        console.log('🤖 Telegram Bot initialized');
        this.setupHandlers();
    }

    /**
     * Setup message handlers
     */
    setupHandlers() {
        // Start command
        this.bot.onText(/\/start/, (msg) => {
            this.handleStart(msg);
        });

        // Help command
        this.bot.onText(/\/help/, (msg) => {
            this.handleHelp(msg);
        });

        // Voice message handler
        this.bot.on('voice', (msg) => {
            this.handleVoice(msg);
        });

        // Audio file handler
        this.bot.on('audio', (msg) => {
            this.handleAudio(msg);
        });

        // Document handler (audio files sent as documents)
        this.bot.on('document', (msg) => {
            if (msg.document.mime_type && msg.document.mime_type.startsWith('audio/')) {
                this.handleDocument(msg);
            }
        });

        // Text message handler (catch-all)
        this.bot.on('message', (msg) => {
            if (!msg.voice && !msg.audio && !msg.document && msg.text && !msg.text.startsWith('/')) {
                this.handleText(msg);
            }
        });

        console.log('✅ Bot handlers registered');
    }

    /**
     * Handle /start command
     */
    async handleStart(msg) {
        const chatId = msg.chat.id;
        const firstName = msg.from.first_name || 'أخي الكريم';

        const welcomeMessage = `
السلام عليكم ${firstName}! 👋

أهلاً بك في *قليسن* 🎤
بوت التحقق من تلاوة القرآن الكريم

📖 *كيف تستخدم البوت:*
1️⃣ اضغط على 🎤 أسفل الشاشة
2️⃣ اتل ما حفظت من القرآن
3️⃣ أرسل التسجيل
4️⃣ استلم التحليل مباشرة

✨ *المميزات:*
• تحليل فوري للتلاوة
• تحديد السورة والآيات
• نسبة الدقة
• الكلمات الناقصة
• الآيات المفقودة

جرب الآن! أرسل تسجيل صوتي 🎙️
        `;

        await this.bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
    }

    /**
     * Handle /help command
     */
    async handleHelp(msg) {
        const chatId = msg.chat.id;

        const helpMessage = `
📚 *دليل الاستخدام*

*كيفية إرسال التلاوة:*
• اضغط على أيقونة 🎤 أسفل الشاشة
• اتل الآيات بوضوح
• أرسل التسجيل الصوتي

*نصائح للحصول على أفضل النتائج:*
✓ تأكد من الهدوء في المكان
✓ تكلم بوضوح
✓ اتل سورة واحدة في كل تسجيل
✓ السور القصيرة أسرع في التحليل

*أنواع الملفات المدعومة:*
• رسائل صوتية (Voice Messages)
• ملفات صوتية (Audio Files)
• MP3, OGG, M4A, WAV

*الأوامر المتاحة:*
/start - البدء
/help - المساعدة

جرب الآن! 🎙️
        `;

        await this.bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
    }

    /**
     * Handle text messages
     */
    async handleText(msg) {
        const chatId = msg.chat.id;

        const message = `
أهلاً! 👋

لتحليل تلاوتك، يرجى إرسال:
• رسالة صوتية 🎤
• ملف صوتي 🎵

/help للمساعدة
        `;

        await this.bot.sendMessage(chatId, message);
    }

    /**
     * Handle voice messages
     */
    async handleVoice(msg) {
        const chatId = msg.chat.id;
        const fileId = msg.voice.file_id;
        const duration = msg.voice.duration;

        console.log(`🎤 Voice message received from ${msg.from.first_name} (${chatId})`);
        console.log(`   File ID: ${fileId}, Duration: ${duration}s`);

        try {
            // Send initial message
            const processingMsg = await this.bot.sendMessage(
                chatId,
                '🔄 جاري تحليل تلاوتك...\n⏳ قد يستغرق هذا بضع ثوانٍ'
            );

            // Download audio file
            const audioPath = await this.downloadAudio(fileId);

            // Send to backend for analysis
            const result = await this.analyzeAudio(audioPath);

            // Delete temporary file
            fs.unlinkSync(audioPath);

            // Delete processing message
            await this.bot.deleteMessage(chatId, processingMsg.message_id);

            // Send results
            await this.sendResults(chatId, result);

        } catch (error) {
            console.error('Voice processing error:', error);
            await this.bot.sendMessage(
                chatId,
                '❌ عذراً، حدث خطأ أثناء معالجة التسجيل\nالرجاء المحاولة مرة أخرى'
            );
        }
    }

    /**
     * Handle audio files
     */
    async handleAudio(msg) {
        await this.handleVoice(msg); // Same processing
    }

    /**
     * Handle documents (audio files sent as documents)
     */
    async handleDocument(msg) {
        const chatId = msg.chat.id;
        const fileId = msg.document.file_id;

        console.log(`📄 Audio document received from ${msg.from.first_name} (${chatId})`);

        try {
            const processingMsg = await this.bot.sendMessage(
                chatId,
                '🔄 جاري تحليل تلاوتك...\n⏳ قد يستغرق هذا بضع ثوانٍ'
            );

            const audioPath = await this.downloadAudio(fileId);
            const result = await this.analyzeAudio(audioPath);
            fs.unlinkSync(audioPath);

            await this.bot.deleteMessage(chatId, processingMsg.message_id);
            await this.sendResults(chatId, result);

        } catch (error) {
            console.error('Document processing error:', error);
            await this.bot.sendMessage(
                chatId,
                '❌ عذراً، حدث خطأ أثناء معالجة الملف\nالرجاء المحاولة مرة أخرى'
            );
        }
    }

    /**
     * Download audio from Telegram
     */
    async downloadAudio(fileId) {
        const file = await this.bot.getFile(fileId);
        const fileUrl = `https://api.telegram.org/file/bot${this.token}/${file.file_path}`;

        const tempDir = path.join(__dirname, '../uploads/telegram');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        const tempPath = path.join(tempDir, `${Date.now()}-${path.basename(file.file_path)}`);

        const response = await axios.get(fileUrl, { responseType: 'stream' });
        const writer = fs.createWriteStream(tempPath);

        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', () => resolve(tempPath));
            writer.on('error', reject);
        });
    }

    /**
     * Send audio to backend for analysis
     */
    async analyzeAudio(audioPath) {
        const formData = new FormData();
        formData.append('audio', fs.createReadStream(audioPath));
        formData.append('email', ''); // No email for Telegram users

        const response = await axios.post(
            `${this.backendURL}/api/transcription/analyze`,
            formData,
            {
                headers: formData.getHeaders(),
                maxBodyLength: Infinity,
                maxContentLength: Infinity
            }
        );

        return response.data;
    }

    /**
     * Format and send results to user
     */
    async sendResults(chatId, result) {
        if (!result.success) {
            await this.bot.sendMessage(
                chatId,
                `❌ *فشل التحليل*\n\n${result.error || 'حدث خطأ غير متوقع'}`,
                { parse_mode: 'Markdown' }
            );
            return;
        }

        // Check if queued
        if (result.queued) {
            await this.bot.sendMessage(
                chatId,
                `⏳ *تم إضافتك إلى قائمة الانتظار*\n\nرقم الطلب: \`${result.jobId}\`\n\nسنرسل لك النتائج قريباً`,
                { parse_mode: 'Markdown' }
            );
            return;
        }

        // Format results message
        const analysis = result.analysis;
        const accuracy = Math.round(analysis.accuracy * 100);

        let message = `✅ *تحليل التلاوة*\n\n`;
        message += `📖 *السورة:* ${analysis.surahNameArabic || analysis.surah}\n`;
        message += `📄 *الآيات:* ${analysis.startVerse} - ${analysis.endVerse}\n`;
        message += `🎯 *الدقة:* ${accuracy}%\n\n`;

        // Accuracy emoji
        const accuracyEmoji = accuracy >= 90 ? '🌟' :
                             accuracy >= 75 ? '👍' :
                             accuracy >= 50 ? '⚠️' : '❌';

        message += `${accuracyEmoji} *التقييم:* `;
        if (accuracy >= 90) message += 'ممتاز!\n';
        else if (accuracy >= 75) message += 'جيد جداً\n';
        else if (accuracy >= 50) message += 'جيد، لكن يحتاج تحسين\n';
        else message += 'يحتاج مراجعة\n';

        message += `\n📝 *النص المنسوخ:*\n_${result.transcript}_\n\n`;

        // Verses analysis
        if (analysis.verses && analysis.verses.length > 0) {
            message += `📊 *تحليل الآيات:*\n`;

            analysis.verses.forEach(verse => {
                const verseAccuracy = Math.round(verse.accuracy * 100);
                let statusEmoji = '';

                if (verse.status === 'perfect') statusEmoji = '✅';
                else if (verse.status === 'good') statusEmoji = '✓';
                else if (verse.status === 'partial') statusEmoji = '⚠️';
                else statusEmoji = '❌';

                message += `${statusEmoji} *آية ${verse.ayah}:* ${verseAccuracy}%`;

                if (verse.wordsMissing > 0) {
                    message += ` (${verse.wordsMissing} كلمة ناقصة)`;
                }

                message += `\n`;
            });
        }

        // Recommendations
        if (analysis.recommendations && analysis.recommendations.length > 0) {
            message += `\n💡 *توصيات:*\n`;
            analysis.recommendations.forEach(rec => {
                message += `• ${rec}\n`;
            });
        }

        message += `\n🕒 *وقت المعالجة:* ${(result.totalProcessingTime / 1000).toFixed(1)}ث`;

        // Send message
        await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });

        // Send encouragement
        if (accuracy >= 90) {
            await this.bot.sendMessage(chatId, 'ما شاء الله! استمر في الحفظ 📿');
        } else if (accuracy >= 75) {
            await this.bot.sendMessage(chatId, 'بارك الله فيك! واصل التدريب 💪');
        } else {
            await this.bot.sendMessage(chatId, 'لا تيأس، المراجعة مفتاح النجاح 🌟');
        }
    }

    /**
     * Start bot
     */
    start() {
        console.log('🚀 Telegram bot is running...');
        console.log('   Send /start to the bot to begin!');
    }

    /**
     * Stop bot
     */
    stop() {
        this.bot.stopPolling();
        console.log('⏹️  Telegram bot stopped');
    }
}

module.exports = QlisenTelegramBot;
