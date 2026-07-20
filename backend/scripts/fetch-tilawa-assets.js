/**
 * Fetch tilawa model + JSON assets into backend/models/tilawa/.
 *
 * Pinned to the same Mohamed-AH/tilawa commit the sister Hafiz app
 * (Mohamed-AH/quran) vendors and has verified (CTC token table / verse
 * text / model in sync, 0 word-alignment mismatches across all 6,236 verses).
 *
 * Re-run any time the assets are missing or you want to bump the pinned
 * commit (update TILAWA_COMMIT below and re-run).
 *
 * Usage: node backend/scripts/fetch-tilawa-assets.js
 */

const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const https = require('https');
const http = require('http');

const TILAWA_COMMIT = 'ec5cdc72c1c48ba29866ca2e3197d6b9a0e2e793';
const MODEL_BYTES = 88307366;

const MODEL_URL =
    process.env.TILAWA_MODEL_UPSTREAM ||
    `https://media.githubusercontent.com/media/Mohamed-AH/tilawa/${TILAWA_COMMIT}/web/frontend/public/fastconformer_full_mixed.onnx`;

const ASSET_BASE = `https://raw.githubusercontent.com/Mohamed-AH/tilawa/${TILAWA_COMMIT}/web/frontend/public/`;

const ASSETS = {
    'vocab.json': ASSET_BASE + 'vocab.json',
    'quran_ctc_tokens.json': ASSET_BASE + 'quran_ctc_tokens.json',
    'quran.json': ASSET_BASE + 'quran.json'
};

const outDir = path.join(__dirname, '..', 'models', 'tilawa');

/** Follow redirects and stream the response body to a file. */
function fetchToFile(url, destination, redirectsLeft = 5) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https:') ? https : http;
        const request = client.get(url, (response) => {
            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                response.resume();
                if (redirectsLeft <= 0) return reject(new Error('Too many redirects'));
                return resolve(fetchToFile(response.headers.location, destination, redirectsLeft - 1));
            }
            if (response.statusCode !== 200) {
                response.resume();
                return reject(new Error(`HTTP ${response.statusCode} for ${url}`));
            }
            const out = fs.createWriteStream(destination);
            response.pipe(out);
            out.on('finish', () => out.close(resolve));
            out.on('error', reject);
            response.on('error', reject);
        });
        request.on('error', reject);
        request.setTimeout(180000, () => request.destroy(new Error('Upstream timeout')));
    });
}

async function fetchAsset(name, url) {
    const dest = path.join(outDir, name);
    const partPath = `${dest}.part`;
    console.log(`⬇️  ${name} ...`);
    await fetchToFile(url, partPath);
    await fsp.rename(partPath, dest);
    const stat = await fsp.stat(dest);
    console.log(`✅ ${name} (${(stat.size / 1024).toFixed(1)} KB)`);
}

async function fetchModel() {
    const dest = path.join(outDir, 'fastconformer_full_mixed.onnx');

    try {
        const stat = await fsp.stat(dest);
        if (stat.size === MODEL_BYTES) {
            console.log(`✅ fastconformer_full_mixed.onnx already present (${(stat.size / 1024 / 1024).toFixed(1)} MB)`);
            return;
        }
    } catch (err) {
        // not present, fall through to download
    }

    const partPath = `${dest}.part`;
    console.log(`⬇️  fastconformer_full_mixed.onnx (${(MODEL_BYTES / 1024 / 1024).toFixed(1)} MB) from ${MODEL_URL} ...`);
    await fetchToFile(MODEL_URL, partPath);
    const stat = await fsp.stat(partPath);
    if (stat.size !== MODEL_BYTES) {
        await fsp.unlink(partPath).catch(() => {});
        throw new Error(`Truncated model download: got ${stat.size} bytes, expected ${MODEL_BYTES}`);
    }
    await fsp.rename(partPath, dest);
    console.log(`✅ fastconformer_full_mixed.onnx (${(stat.size / 1024 / 1024).toFixed(1)} MB)`);
}

async function main() {
    await fsp.mkdir(outDir, { recursive: true });

    for (const [name, url] of Object.entries(ASSETS)) {
        await fetchAsset(name, url);
    }

    await fetchModel();

    console.log('\n🎉 All tilawa assets ready in', outDir);
}

main().catch((err) => {
    console.error('❌ Failed to fetch tilawa assets:', err.message);
    process.exit(1);
});
