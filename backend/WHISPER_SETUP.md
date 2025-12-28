# Whisper Self-Hosting Setup Guide

This guide shows you how to self-host Whisper for Arabic transcription (no API costs).

## Quick Start (5 minutes)

### 1. Install Dependencies

```bash
cd /home/user/qlisen/backend
npm install nodejs-whisper
```

### 2. Configure Environment Variables

Edit your `.env` file:

```bash
# Choose ONE mode:

# Option A: Use LOCAL Whisper (self-hosted, free)
USE_LOCAL_WHISPER=true
WHISPER_MODEL=base  # Options: tiny, base, small, medium, large

# Option B: Use OpenAI API (cloud, paid)
USE_LOCAL_WHISPER=false
OPENAI_API_KEY=your_api_key_here
```

### 3. Start the Server

```bash
npm start
```

**On first run**, the model will auto-download (~150MB for base model). This happens once.

### 4. Test It

```bash
curl -X POST http://localhost:3000/api/transcription/health
```

You should see:
```json
{
  "success": true,
  "whisperConfigured": true,
  "message": "Whisper transcription service is ready"
}
```

## Model Comparison

| Model | Size | Speed (CPU) | Accuracy | Recommended For |
|-------|------|-------------|----------|-----------------|
| **tiny** | 75 MB | Very Fast (1-2s) | Fair | Testing only |
| **base** | 142 MB | Fast (2-4s) | Good | ⭐ Production (recommended) |
| **small** | 466 MB | Medium (5-10s) | Very Good | High accuracy needs |
| **medium** | 1.5 GB | Slow (15-30s) | Excellent | Best accuracy |
| **large** | 2.9 GB | Very Slow (30-60s) | Best | Research/benchmarking |

**For Quran recitation, use `base` or `small` model.**

## Performance Expectations

### On CPU (typical VPS/server):
- **base model**: 2-5 seconds for 30 seconds of audio
- **small model**: 5-10 seconds for 30 seconds of audio

### On GPU (if available):
- **base model**: Under 1 second for 30 seconds of audio
- **small model**: 1-2 seconds for 30 seconds of audio

## System Requirements

### Minimum:
- **RAM**: 2GB available
- **Storage**: 1GB free (for model)
- **CPU**: Any modern CPU (2+ cores recommended)

### Recommended:
- **RAM**: 4GB available
- **Storage**: 5GB free
- **CPU**: 4+ cores
- **Optional GPU**: NVIDIA GPU with CUDA (4x faster)

## Cost Comparison

### Local Hosting:
- **Setup**: $0
- **Per transcription**: $0
- **Monthly**: $0 (just server costs)
- **Privacy**: Complete (audio never leaves server)

### OpenAI API:
- **Setup**: $0
- **Per transcription**: ~$0.02-0.03
- **Monthly**: $10-100+ depending on usage
- **Privacy**: Audio sent to OpenAI

**Example**: 1000 transcriptions/month
- **Local**: $0
- **API**: $20-30

## Troubleshooting

### Model not downloading?

Check your internet connection and try manually:
```bash
cd node_modules/nodejs-whisper
npm run download-model base
```

### Out of memory error?

Use smaller model:
```bash
WHISPER_MODEL=tiny
```

### Slow transcription?

1. Use `tiny` or `base` model (not medium/large)
2. Ensure no other heavy processes running
3. Consider upgrading server CPU

### Error: "nodejs-whisper not installed"?

```bash
npm install nodejs-whisper
```

## Advanced: GPU Acceleration

If you have NVIDIA GPU, you can get 4x faster transcription:

### 1. Install CUDA toolkit
```bash
# Ubuntu/Debian
sudo apt install nvidia-cuda-toolkit
```

### 2. Use faster-whisper instead
```bash
pip install faster-whisper
```

### 3. Create Python service
See `WHISPER_GPU_SETUP.md` for full GPU setup guide.

## Switching Between Local and API

You can switch anytime by changing `.env`:

```bash
# Switch to local
USE_LOCAL_WHISPER=true

# Switch to API
USE_LOCAL_WHISPER=false
OPENAI_API_KEY=sk-...
```

Restart server after changing.

## Model Storage Location

Models are stored in:
```
node_modules/nodejs-whisper/models/
```

You can delete models you're not using to save space.

## Testing Local vs API Quality

Test both and compare:

```bash
# Test with local
USE_LOCAL_WHISPER=true npm start

# Test with API
USE_LOCAL_WHISPER=false npm start
```

Upload same audio file and compare transcription quality.

## Recommended Setup for Production

1. **Start with local `base` model** - good balance of speed/accuracy
2. **Monitor accuracy** - if too many errors, upgrade to `small`
3. **Keep API as fallback** - if local fails, switch to API automatically

## Questions?

- Model too slow? Use `tiny` or `base`
- Need better accuracy? Use `small` or `medium`
- Want zero cost? Use local
- Want fastest setup? Use API

**For most Quran apps: Use local `base` model**
