/**
 * Tilawa Service - Quran-specialized offline transcription
 *
 * Wraps @tilawa/core (https://github.com/Mohamed-AH/tilawa) with an
 * onnxruntime-node SessionRunner. Given 16kHz mono PCM audio, returns a
 * normalized Arabic transcript from a model trained specifically on
 * Quranic recitation - offline, no per-request cost, no external API.
 *
 * This service only produces the transcript. Which surah/verses were
 * recited, and all word-level mistake detection (missing/incorrect words,
 * per-ayah accuracy), is still decided by the existing RecitationAnalyzer
 * n-gram/fast-path pipeline downstream - that pipeline is Arabic-text based
 * (not audio based) and already proven on this codebase's test corpus.
 *
 * Note: @tilawa/core's own bestJoint03Match() one-shot verse guess is
 * logged here for observability but deliberately NOT used to pick the
 * surah/verse range - on real test clips it occasionally picked the wrong
 * surah (e.g. an Al-Ikhlas clip matched to Al-Kahf at score 0.77) where
 * RecitationAnalyzer's n-gram/fast-path detection on the same transcript
 * was correct. Its transcript quality, in contrast, was consistently
 * excellent on every clip tested.
 */

const fs = require('fs');
const path = require('path');
const { decodeToFloat32PCM } = require('../utils/audioDecode');

const MODEL_DIR = process.env.TILAWA_MODEL_DIR || path.join(__dirname, '..', 'models', 'tilawa');
const MODEL_PATH = path.join(MODEL_DIR, 'fastconformer_full_mixed.onnx');
const VOCAB_PATH = path.join(MODEL_DIR, 'vocab.json');
const TOKENS_PATH = path.join(MODEL_DIR, 'quran_ctc_tokens.json');
const QURAN_PATH = path.join(MODEL_DIR, 'quran.json');

class TilawaService {
    constructor() {
        this.session = null;
        this.runner = null;
        this.initPromise = null;
        this.available = [MODEL_PATH, VOCAB_PATH, TOKENS_PATH, QURAN_PATH].every(fs.existsSync);

        if (!this.available) {
            console.log('⚠️  Tilawa assets not found in', MODEL_DIR);
            console.log('   Run: node scripts/fetch-tilawa-assets.js');
        }
    }

    isAvailable() {
        return this.available;
    }

    async init() {
        if (this.session) return this.session;
        if (!this.available) {
            throw new Error('Tilawa model assets not found. Run: node scripts/fetch-tilawa-assets.js');
        }
        if (!this.initPromise) {
            this.initPromise = this._loadSession().catch((err) => {
                this.initPromise = null; // allow retrying on next call
                throw err;
            });
        }
        return this.initPromise;
    }

    async _loadSession() {
        console.log('🧠 Loading tilawa model (ONNX)...');
        const startTime = Date.now();

        const ort = require('onnxruntime-node');
        // @tilawa/core ships ESM-only; dynamic import works from CommonJS.
        const { createTilawaSession } = await import('@tilawa/core');

        const ortSession = await ort.InferenceSession.create(MODEL_PATH);

        const runner = {
            async run(audio) {
                const input = new ort.Tensor('float32', audio, [1, audio.length]);
                const length = new ort.Tensor('int64', BigInt64Array.from([BigInt(audio.length)]), [1]);
                const results = await ortSession.run({ audio_signal: input, length });
                const output = results[ortSession.outputNames[0]];
                const [, timeSteps, vocabSize] = output.dims;
                return { logprobs: output.data, timeSteps, vocabSize };
            }
        };

        const vocab = JSON.parse(fs.readFileSync(VOCAB_PATH, 'utf8'));
        const quranCtcTokens = JSON.parse(fs.readFileSync(TOKENS_PATH, 'utf8'));
        const quran = JSON.parse(fs.readFileSync(QURAN_PATH, 'utf8'));

        const session = createTilawaSession(runner, { vocab, quranCtcTokens, quran }, {
            onDiagnostic: (event, data) => {
                if (process.env.TILAWA_DEBUG === 'true') {
                    console.log(`   [tilawa:${event}]`, JSON.stringify(data).slice(0, 300));
                }
            }
        });

        console.log(`✅ Tilawa model loaded in ${Date.now() - startTime}ms`);
        this.session = session;
        this.runner = runner;
        return session;
    }

    /**
     * Transcribe 16kHz mono PCM audio into normalized Arabic text.
     * @param {Float32Array} pcm
     */
    async transcribePCM(pcm) {
        const session = await this.init();
        const startTime = Date.now();

        const { logprobs, timeSteps, vocabSize } = await this.runner.run(pcm);
        const greedy = session.decoder.decode(logprobs, timeSteps, vocabSize);

        // Informational only - see file header for why this isn't used to
        // pick the surah/verse range.
        const champion = session.db.bestJoint03Match(greedy.text);

        const processingTime = Date.now() - startTime;

        console.log(`🕋 Tilawa transcribed in ${processingTime}ms` +
            (champion ? ` (own verse guess: ${champion.surah}:${champion.ayah}-${champion.ayah_end ?? champion.ayah} @ ${champion.score.toFixed(3)}, not authoritative)` : ' (no own verse guess)'));

        return {
            success: true,
            transcript: greedy.text,
            processingTime,
            method: 'tilawa',
            metadata: {
                ownVerseGuess: champion
                    ? { surah: champion.surah, ayah: champion.ayah, ayahEnd: champion.ayah_end ?? champion.ayah, score: champion.score }
                    : null
            }
        };
    }

    /**
     * Decode an audio file and transcribe it. Mirrors WhisperService's
     * file-path based interface for a drop-in swap in routes.
     * @param {string} audioFilePath
     */
    async transcribeFile(audioFilePath) {
        const pcm = await decodeToFloat32PCM(audioFilePath);
        if (pcm.length < 16000 * 0.3) { // less than 0.3s of audio
            return { success: false, error: 'Audio too short to transcribe', transcript: null };
        }
        return this.transcribePCM(pcm);
    }
}

module.exports = new TilawaService();
