# Qlisen Telegram Bot

Quran Recitation Verification via Telegram

## 🤖 Features

- ✅ Send voice notes directly in Telegram
- ✅ Instant analysis and feedback
- ✅ Verse-by-verse accuracy
- ✅ Arabic interface
- ✅ No browser needed
- ✅ Works on all phones

## 🚀 Setup Guide

### Step 1: Create Telegram Bot

1. **Open Telegram** and search for `@BotFather`
2. **Send command:** `/newbot`
3. **Choose bot name:** `Qlisen Quran Bot` (or any name)
4. **Choose username:** `QlisenBot` (must end with 'bot')
5. **Copy the token:** `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`

### Step 2: Configure Environment

Edit `backend/.env` and add:

```bash
TELEGRAM_BOT_TOKEN=your-token-from-botfather
BACKEND_URL=http://localhost:5001
```

### Step 3: Install Dependencies

```bash
cd backend
npm install
```

### Step 4: Start Backend

Make sure your backend is running:

```bash
npm start
```

Backend should be running on http://localhost:5001

### Step 5: Start Bot

In a **new terminal**:

```bash
node backend/bot/runBot.js
```

You should see:

```
╔════════════════════════════════════════╗
║   Qlisen Telegram Bot                  ║
║   Quran Recitation Verification        ║
╚════════════════════════════════════════╝

📋 Configuration:
   Bot Token: 123456789:...
   Backend URL: http://localhost:5001

🤖 Telegram Bot initialized
✅ Bot handlers registered
🚀 Telegram bot is running...
   Send /start to the bot to begin!

✅ Bot is now online!
```

## 📱 How Users Use It

### 1. Find the Bot

User opens Telegram and searches for your bot username (e.g., `@QlisenBot`)

### 2. Start Conversation

User sends `/start` command

Bot responds with:

```
السلام عليكم! 👋

أهلاً بك في قليسن 🎤
بوت التحقق من تلاوة القرآن الكريم

📖 كيف تستخدم البوت:
1️⃣ اضغط على 🎤 أسفل الشاشة
2️⃣ اتل ما حفظت من القرآن
3️⃣ أرسل التسجيل
4️⃣ استلم التحليل مباشرة
```

### 3. Send Voice Note

User presses microphone button, recites Quran, sends voice note

### 4. Get Results

Bot analyzes and responds with:

```
✅ تحليل التلاوة

📖 السورة: الفلق
📄 الآيات: 1 - 5
🎯 الدقة: 91%

🌟 التقييم: ممتاز!

📝 النص المنسوخ:
قل أعوذ برب الفلق من شر ما خلق...

📊 تحليل الآيات:
✅ آية 1: 100%
✅ آية 2: 100%
⚠️ آية 3: 85% (1 كلمة ناقصة)
✅ آية 4: 100%
✅ آية 5: 100%

🕒 وقت المعالجة: 3.2ث
```

## 🎯 Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | Start the bot |
| `/help` | Show help message |

## 📊 Supported Audio Formats

- ✅ Voice Messages (Telegram voice notes)
- ✅ Audio Files (MP3, OGG, M4A)
- ✅ Documents (audio files sent as files)

## 🔧 Troubleshooting

### Bot Not Responding

**Check if bot is running:**
```bash
# You should see "Telegram bot is running..." in terminal
```

**Check backend:**
```bash
curl http://localhost:5001/health
# Should return OK
```

**Check bot token:**
- Make sure `TELEGRAM_BOT_TOKEN` is set correctly in `.env`
- Token should be from @BotFather

### "Failed to connect to backend"

**Solution:** Make sure backend is running on port 5001

```bash
cd backend
npm start
```

### Voice Messages Not Downloading

**Check permissions:**
- Bot needs permission to access Telegram files
- Check internet connection
- Check `backend/uploads/telegram` directory exists

### Analysis Fails

**Check Whisper:**
```bash
curl http://localhost:5000/
# Should return Whisper API info
```

**Check queue:**
```bash
curl http://localhost:5001/api/transcription/queue/stats
```

## 🚀 Deployment

### Local Testing (Your PC)

1. Backend runs on your PC (localhost:5001)
2. Bot runs on your PC
3. Users send voice notes from anywhere
4. Bot connects to your local backend

**Limitations:**
- Your PC must be online
- Backend must be running

### Production (Recommended)

1. **Deploy backend to Render**
2. **Update `.env`:**
   ```bash
   BACKEND_URL=https://your-backend.onrender.com
   ```
3. **Run bot on your PC or VPS**
4. Bot connects to production backend

**Advantages:**
- Backend always online
- More reliable
- Faster for users

## 📝 Example Usage

### User Experience

```
User: [Sends voice note of Al-Fatiha]

Bot: 🔄 جاري تحليل تلاوتك...
     ⏳ قد يستغرق هذا بضع ثوانٍ

Bot: ✅ تحليل التلاوة
     📖 السورة: الفاتحة
     📄 الآيات: 1 - 7
     🎯 الدقة: 95%

     🌟 التقييم: ممتاز!

     [Full analysis...]

Bot: ما شاء الله! استمر في الحفظ 📿
```

## 💡 Tips for Best Results

**For Users:**
- ✓ Recite in a quiet place
- ✓ Speak clearly
- ✓ One surah per voice note
- ✓ Short surahs analyze faster

**For Developers:**
- Use `small` or `medium` Whisper model for better accuracy
- Monitor bot logs for errors
- Keep backend and bot on same network for testing

## 📊 Bot Statistics

The bot logs every interaction:

```bash
🎤 Voice message received from Ahmad (12345678)
   File ID: BQACAgQA..., Duration: 15s
✅ Analysis sent successfully
```

Monitor these logs to track:
- Number of users
- Average processing time
- Error rates

## 🔒 Security

**Bot Token:**
- Never commit `.env` file
- Keep token secret
- Regenerate if exposed (via @BotFather)

**User Privacy:**
- Audio files deleted after processing
- No permanent storage
- No user data collected

## 📞 Support

**Common Questions:**

**Q: Can multiple users use the bot simultaneously?**
A: Yes! The backend queue system handles concurrent requests.

**Q: What's the maximum voice note length?**
A: Telegram limit is 20MB. Recommend <2 minutes for faster processing.

**Q: Does it work offline?**
A: No, bot needs internet to connect to backend.

**Q: Can I use same bot for multiple languages?**
A: Currently Arabic only. English translation can be added.

## 🎉 Success!

Your Telegram bot is now ready!

Users can:
1. Find your bot on Telegram
2. Send `/start`
3. Send voice notes
4. Get instant Quran analysis

**Bot is 100% FREE for any number of users!** ✅
