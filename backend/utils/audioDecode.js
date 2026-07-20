/**
 * Decode an arbitrary audio file (Telegram ogg/opus voice notes, mp3, wav,
 * m4a, ...) into 16kHz mono Float32 PCM, the input format tilawa's ONNX
 * model expects.
 */

const { spawn } = require('child_process');

const SAMPLE_RATE = 16000;

/**
 * @param {string} inputPath - Path to the source audio file
 * @returns {Promise<Float32Array>} - Mono PCM samples at 16kHz, range [-1, 1]
 */
function decodeToFloat32PCM(inputPath) {
    return new Promise((resolve, reject) => {
        const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
        const args = [
            '-y',
            '-i', inputPath,
            '-vn',
            '-f', 'f32le',
            '-ac', '1',
            '-ar', String(SAMPLE_RATE),
            'pipe:1'
        ];

        const ffmpeg = spawn(ffmpegPath, args);
        const chunks = [];
        let stderr = '';

        ffmpeg.stdout.on('data', (chunk) => chunks.push(chunk));
        ffmpeg.stderr.on('data', (chunk) => {
            stderr += chunk.toString();
        });

        ffmpeg.on('error', (err) => {
            reject(new Error(`Failed to launch ffmpeg (${ffmpegPath}): ${err.message}`));
        });

        ffmpeg.on('close', (code) => {
            if (code !== 0) {
                return reject(new Error(`ffmpeg exited with code ${code}: ${stderr.slice(-500)}`));
            }

            const buffer = Buffer.concat(chunks);
            const floatCount = Math.floor(buffer.length / 4);
            const samples = new Float32Array(floatCount);
            for (let i = 0; i < floatCount; i++) {
                samples[i] = buffer.readFloatLE(i * 4);
            }
            resolve(samples);
        });
    });
}

module.exports = { decodeToFloat32PCM, SAMPLE_RATE };
