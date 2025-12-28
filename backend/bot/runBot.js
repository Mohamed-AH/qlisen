/**
 * Telegram Bot Runner
 *
 * Run this script to start the Telegram bot
 * The bot will connect to your running backend server
 *
 * Usage:
 *   node backend/bot/runBot.js
 */

require('dotenv').config();
const QlisenTelegramBot = require('./telegramBot');

// Configuration
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

// Validate configuration
if (!TELEGRAM_BOT_TOKEN) {
    console.error('❌ Error: TELEGRAM_BOT_TOKEN is not set in .env file');
    console.error('');
    console.error('To create a Telegram bot:');
    console.error('1. Open Telegram and search for @BotFather');
    console.error('2. Send /newbot command');
    console.error('3. Follow instructions to create your bot');
    console.error('4. Copy the token and add to .env:');
    console.error('   TELEGRAM_BOT_TOKEN=your-token-here');
    console.error('');
    process.exit(1);
}

console.log('╔════════════════════════════════════════╗');
console.log('║   Qlisen Telegram Bot                  ║');
console.log('║   Quran Recitation Verification        ║');
console.log('╚════════════════════════════════════════╝');
console.log('');
console.log('📋 Configuration:');
console.log(`   Bot Token: ${TELEGRAM_BOT_TOKEN.substring(0, 10)}...`);
console.log(`   Backend URL: ${BACKEND_URL}`);
console.log('');

// Create and start bot
try {
    const bot = new QlisenTelegramBot(TELEGRAM_BOT_TOKEN, BACKEND_URL);
    bot.start();

    console.log('✅ Bot is now online!');
    console.log('');
    console.log('🎤 Users can now:');
    console.log('   1. Find your bot on Telegram');
    console.log('   2. Send /start to begin');
    console.log('   3. Send voice messages for analysis');
    console.log('');
    console.log('📊 Bot statistics will appear here:');
    console.log('');

    // Handle shutdown gracefully
    process.on('SIGINT', () => {
        console.log('\n\n👋 Shutting down bot...');
        bot.stop();
        process.exit(0);
    });

    process.on('SIGTERM', () => {
        console.log('\n\n👋 Shutting down bot...');
        bot.stop();
        process.exit(0);
    });

} catch (error) {
    console.error('❌ Failed to start bot:', error.message);
    process.exit(1);
}
