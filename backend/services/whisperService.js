const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

/**
 * Service for handling Whisper transcription
 * Supports both local (whisper.cpp) and cloud (OpenAI API) modes
 * Optimized for Arabic Quran recitation
 */
class WhisperService {
    constructor(apiKey) {
        this.useLocal = process.env.USE_LOCAL_WHISPER === 'true';
        this.useRemote = process.env.USE_REMOTE_WHISPER === 'true';
        this.apiKey = apiKey || process.env.OPENAI_API_KEY;
        this.baseURL = 'https://api.openai.com/v1/audio/transcriptions';
        this.remoteURL = process.env.WHISPER_URL; // Cloudflare tunnel URL
        this.modelName = process.env.WHISPER_MODEL || 'base'; // tiny, base, small, medium, large

        if (this.useRemote) {
            console.log('🌐 Whisper configured for REMOTE mode (URL: ' + this.remoteURL + ')');
        } else if (this.useLocal) {
            console.log('🏠 Whisper configured for LOCAL mode (model: ' + this.modelName + ')');
            this.nodeWhisper = null; // Lazy load when needed
        } else {
            console.log('☁️  Whisper configured for API mode');
        }
    }

    /**
     * Lazy load node-whisper (only when needed for local mode)
     */
    async loadLocalWhisper() {
        if (!this.nodeWhisper) {
            try {
                const { nodewhisper } = require('nodejs-whisper');
                this.nodeWhisper = nodewhisper;
                console.log('✅ Local Whisper loaded successfully');
            } catch (error) {
                throw new Error('nodejs-whisper not installed. Run: npm install nodejs-whisper');
            }
        }
        return this.nodeWhisper;
    }

    /**
     * Transcribe using local Whisper (whisper.cpp)
     * @param {string} audioFilePath - Path to audio file
     * @returns {Promise<Object>} - Transcription result
     */
    async transcribeLocal(audioFilePath) {
        try {
            if (!fs.existsSync(audioFilePath)) {
                throw new Error(`Audio file not found: ${audioFilePath}`);
            }

            console.log('🏠 Transcribing locally with whisper.cpp...');
            console.log(`   Model: ${this.modelName}`);
            console.log(`   File: ${path.basename(audioFilePath)}`);

            const nodewhisper = await this.loadLocalWhisper();
            const startTime = Date.now();

            // Transcribe with nodejs-whisper
            const output = await nodewhisper(audioFilePath, {
                modelName: this.modelName,
                autoDownloadModelName: this.modelName, // Auto-download model if not exists
                whisperOptions: {
                    language: 'ar',
                    outputInText: true,
                    outputInVtt: false,
                    outputInSrt: false,
                    translateToEnglish: false,
                    wordTimestamps: false,
                    timestamps_length: 20,
                    splitOnWord: true
                }
            });

            const processingTime = Date.now() - startTime;
            console.log(`✅ Local transcription completed in ${processingTime}ms`);

            // Extract text from output
            let transcript = '';
            if (typeof output === 'string') {
                transcript = output;
            } else if (output && output.text) {
                transcript = output.text;
            } else {
                transcript = String(output);
            }

            // Clean up transcript
            transcript = transcript.trim();

            return {
                success: true,
                transcript,
                processingTime,
                method: 'local',
                model: this.modelName
            };

        } catch (error) {
            console.error('❌ Local Whisper error:', error.message);
            return {
                success: false,
                error: error.message,
                transcript: null
            };
        }
    }

    /**
     * Transcribe using OpenAI Whisper API
     * @param {string} audioFilePath - Path to audio file
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} - Transcription result
     */
    async transcribeAPI(audioFilePath, options = {}) {
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
            console.log(`✅ Whisper API transcription completed in ${processingTime}ms`);

            return {
                success: true,
                transcript: response.data.text,
                processingTime,
                method: 'api',
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
     * Transcribe using remote Whisper server (via Cloudflare tunnel)
     * @param {string} audioFilePath - Path to audio file
     * @returns {Promise<Object>} - Transcription result
     */
    async transcribeRemote(audioFilePath) {
        try {
            if (!this.remoteURL) {
                throw new Error('WHISPER_URL not configured for remote mode');
            }

            if (!fs.existsSync(audioFilePath)) {
                throw new Error(`Audio file not found: ${audioFilePath}`);
            }

            console.log('🌐 Transcribing via remote Whisper server...');
            console.log(`   Remote URL: ${this.remoteURL}`);
            console.log(`   File: ${path.basename(audioFilePath)}`);

            // Step 1: Check if Whisper is online
            try {
                const healthCheck = await axios.get(this.remoteURL + '/', { timeout: 5000 });
                console.log('✅ Remote Whisper is online');
            } catch (error) {
                console.error('❌ Remote Whisper is offline');
                return {
                    success: false,
                    error: 'OFFLINE',
                    shouldQueue: true,
                    transcript: null
                };
            }

            // Step 2: Check if busy (optional - server will handle)
            // The Docker Whisper server processes one at a time

            // Step 3: Send audio for transcription with optimizations
            const form = new FormData();
            form.append('audio_file', fs.createReadStream(audioFilePath));
            form.append('task', 'transcribe');
            form.append('language', 'ar');

            // Request verbose JSON to get segments and word timestamps
            // Options: txt, vtt, srt, tsv, json, verbose_json
            form.append('output', 'verbose_json');

            // OPTIMIZATION 1: Quranic initial prompt
            // Provides vocabulary context to improve accuracy for Classical Arabic
            const quranicPrompt = 'بسم الله الرحمن الرحيم. القرآن الكريم بالعربية الفصحى. ' +
                                  'الله المؤمنين الكافرين الصلاة الزكاة الجنة النار القيامة ' +
                                  'الرسول النبي الآيات السور التوبة الرحمة العذاب الإيمان';
            form.append('initial_prompt', quranicPrompt);

            // OPTIMIZATION 2: Enable word-level timestamps
            // Essential for error detection and verse boundary identification
            // Try multiple parameter formats - API might use different names
            form.append('word_timestamps', 'True');        // Python boolean format
            form.append('word_level_timestamps', 'True');  // Alternative name
            form.append('encode', 'true');                 // Some APIs need this

            // OPTIMIZATION 3: Optimize inference parameters
            form.append('temperature', '0.0');         // Deterministic output (no creativity)
            form.append('beam_size', '10');            // Higher accuracy (default is 5)
            form.append('best_of', '5');               // Sample 5 times, pick best
            form.append('vad_filter', 'True');         // Voice Activity Detection filter

            console.log('🎯 Using optimized parameters: small model + beam_size=10 + Quranic prompt');

            console.log('📤 Sending audio to remote server...');
            const startTime = Date.now();

            const response = await axios.post(this.remoteURL + '/asr', form, {
                headers: {
                    ...form.getHeaders()
                },
                timeout: 120000, // 2 minute timeout (transcription can take time)
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            });

            const processingTime = Date.now() - startTime;
            console.log(`✅ Remote transcription completed in ${processingTime}ms`);

            // DEBUG: Log response structure to understand what we're getting
            console.log('🔍 DEBUG - Response structure:');
            console.log(`   Type: ${typeof response.data}`);
            console.log(`   Is string: ${typeof response.data === 'string'}`);
            console.log(`   Is object: ${typeof response.data === 'object' && !Array.isArray(response.data)}`);

            // Handle string response (parse if JSON)
            let parsedData = response.data;
            if (typeof response.data === 'string') {
                console.log(`   Response is string, attempting to parse as JSON...`);
                try {
                    parsedData = JSON.parse(response.data);
                    console.log(`   ✅ Successfully parsed JSON`);
                    console.log(`   Keys in parsed data: ${Object.keys(parsedData).join(', ')}`);
                } catch (e) {
                    console.log(`   ⚠️  Not valid JSON, treating as plain text transcript`);
                    parsedData = { text: response.data };
                }
            }

            if (parsedData && parsedData.segments) {
                console.log(`   ✅ Segments found: ${parsedData.segments.length}`);
                if (parsedData.segments[0]) {
                    console.log(`   First segment keys: ${Object.keys(parsedData.segments[0]).join(', ')}`);
                    if (parsedData.segments[0].words) {
                        console.log(`   ✅ Word-level timestamps available!`);
                        console.log(`   First segment has ${parsedData.segments[0].words.length} words`);
                    }
                }
            } else {
                console.log(`   ⚠️  No segments in response`);
            }

            // Extract transcript from response
            let transcript = '';
            if (parsedData && parsedData.text) {
                transcript = parsedData.text;
            } else if (typeof parsedData === 'string') {
                transcript = parsedData;
            } else {
                throw new Error('Invalid response format from remote Whisper');
            }

            // ENHANCEMENT: Extract word-level timestamps and metadata
            let words = [];
            let segments = [];
            let totalDuration = 0;

            if (parsedData && parsedData.segments) {
                segments = parsedData.segments;

                // Flatten all words from all segments
                for (const segment of segments) {
                    if (segment.words && Array.isArray(segment.words)) {
                        words = words.concat(segment.words.map(w => ({
                            word: w.word ? w.word.trim() : '',
                            start: w.start || 0,
                            end: w.end || 0,
                            confidence: w.probability || null
                        })));
                    }
                }

                // Calculate total duration from last segment
                if (segments.length > 0) {
                    totalDuration = segments[segments.length - 1].end || 0;
                }
            }

            // Calculate overall confidence score
            const avgConfidence = words.length > 0
                ? words.reduce((sum, w) => sum + (w.confidence || 0), 0) / words.length
                : null;

            // Flag low-confidence words (potential transcription errors)
            const LOW_CONFIDENCE_THRESHOLD = 0.7;
            const lowConfidenceWords = words.filter(w => w.confidence && w.confidence < LOW_CONFIDENCE_THRESHOLD);

            // Log quality metrics
            console.log(`📊 Transcription quality:`);
            console.log(`   Words: ${words.length}`);
            console.log(`   Avg confidence: ${avgConfidence ? (avgConfidence * 100).toFixed(1) + '%' : 'N/A'}`);
            console.log(`   Low confidence: ${lowConfidenceWords.length} words (${(lowConfidenceWords.length / Math.max(words.length, 1) * 100).toFixed(1)}%)`);
            if (totalDuration > 0) {
                console.log(`   Duration: ${totalDuration.toFixed(2)}s`);
            }

            return {
                success: true,
                transcript: transcript.trim(),
                processingTime,
                method: 'remote',
                remoteURL: this.remoteURL,

                // NEW: Detailed metadata
                metadata: {
                    language: parsedData.language || 'ar',
                    duration: totalDuration,
                    wordCount: words.length,
                    avgConfidence: avgConfidence,
                    modelUsed: this.modelName || 'small'
                },

                // NEW: Word-level data for error detection
                words: words,
                segments: segments,

                // NEW: Quality indicators
                quality: {
                    lowConfidenceWords: lowConfidenceWords.map(w => ({
                        word: w.word,
                        timestamp: `${w.start.toFixed(2)}s`,
                        confidence: w.confidence ? (w.confidence * 100).toFixed(1) + '%' : 'N/A'
                    })),
                    lowConfidenceCount: lowConfidenceWords.length,
                    lowConfidencePercentage: (lowConfidenceWords.length / Math.max(words.length, 1) * 100).toFixed(1)
                }
            };

        } catch (error) {
            console.error('❌ Remote Whisper error:', error.message);

            // Check if it's a timeout or connection error (should queue)
            if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT' ||
                error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
                return {
                    success: false,
                    error: 'TIMEOUT_OR_OFFLINE',
                    shouldQueue: true,
                    transcript: null
                };
            }

            // Check if server returned 409 (busy) or 503 (unavailable)
            if (error.response && (error.response.status === 409 || error.response.status === 503)) {
                return {
                    success: false,
                    error: 'BUSY',
                    shouldQueue: true,
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
     * Transcribe Arabic audio (routes to remote, local, or API based on config)
     * @param {string} audioFilePath - Path to audio file
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} - Transcription result
     */
    async transcribeArabic(audioFilePath, options = {}) {
        if (this.useRemote) {
            return await this.transcribeRemote(audioFilePath);
        } else if (this.useLocal) {
            return await this.transcribeLocal(audioFilePath);
        } else {
            return await this.transcribeAPI(audioFilePath, options);
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
