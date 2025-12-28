const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

/**
 * Service for handling OpenAI Whisper API transcription
 * Optimized for Arabic Quran recitation
 */
class WhisperService {
    constructor(apiKey) {
        this.apiKey = apiKey || process.env.OPENAI_API_KEY;
        this.baseURL = 'https://api.openai.com/v1/audio/transcriptions';
    }

    /**
     * Transcribe Arabic audio using Whisper API
     * @param {string} audioFilePath - Path to audio file
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} - Transcription result
     */
    async transcribeArabic(audioFilePath, options = {}) {
        try {
            if (!this.apiKey) {
                throw new Error('OPENAI_API_KEY not configured');
            }

            if (!fs.existsSync(audioFilePath)) {
                throw new Error(`Audio file not found: ${audioFilePath}`);
            }

            const form = new FormData();
            form.append('file', fs.createReadStream(audioFilePath));
            form.append('model', options.model || 'whisper-1');
            form.append('language', 'ar'); // Arabic

            // Add Quranic context to improve accuracy
            const prompt = options.prompt || 'هذا تلاوة من القرآن الكريم بالعربية الفصحى';
            form.append('prompt', prompt);

            // Optional: request word-level timestamps
            if (options.timestamps) {
                form.append('timestamp_granularities', JSON.stringify(['word']));
            }

            console.log('📡 Sending audio to Whisper API...');
            const startTime = Date.now();

            const response = await axios.post(this.baseURL, form, {
                headers: {
                    ...form.getHeaders(),
                    'Authorization': `Bearer ${this.apiKey}`
                },
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            });

            const processingTime = Date.now() - startTime;
            console.log(`✅ Whisper transcription completed in ${processingTime}ms`);

            return {
                success: true,
                transcript: response.data.text,
                processingTime,
                metadata: {
                    language: response.data.language,
                    duration: response.data.duration,
                    words: response.data.words || null
                }
            };

        } catch (error) {
            console.error('❌ Whisper API error:', error.message);

            if (error.response) {
                return {
                    success: false,
                    error: error.response.data?.error?.message || error.message,
                    statusCode: error.response.status,
                    transcript: null
                };
            }

            return {
                success: false,
                error: error.message,
                transcript: null
            };
        }
    }

    /**
     * Transcribe with automatic retry on failure
     * @param {string} audioFilePath - Path to audio file
     * @param {number} maxRetries - Maximum number of retry attempts
     * @returns {Promise<Object>} - Transcription result
     */
    async transcribeWithRetry(audioFilePath, maxRetries = 3) {
        let lastError;

        for (let i = 0; i < maxRetries; i++) {
            try {
                const result = await this.transcribeArabic(audioFilePath);

                if (result.success) {
                    return result;
                }

                lastError = result.error;

                // Don't retry on client errors (400-499)
                if (result.statusCode >= 400 && result.statusCode < 500) {
                    return result;
                }

                // Retry on server errors (500+) or network issues
                if (i < maxRetries - 1) {
                    const waitTime = 1000 * Math.pow(2, i); // Exponential backoff
                    console.log(`⏳ Retry ${i + 1}/${maxRetries} after ${waitTime}ms...`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                }

            } catch (error) {
                lastError = error.message;
                console.error(`Attempt ${i + 1} failed:`, error.message);
            }
        }

        return {
            success: false,
            error: `Failed after ${maxRetries} attempts: ${lastError}`,
            transcript: null
        };
    }

    /**
     * Get estimated cost for transcription
     * @param {number} durationSeconds - Audio duration in seconds
     * @returns {number} - Estimated cost in USD
     */
    estimateCost(durationSeconds) {
        // Whisper API pricing: $0.006 per minute
        const minutes = durationSeconds / 60;
        return (minutes * 0.006).toFixed(4);
    }
}

module.exports = WhisperService;
