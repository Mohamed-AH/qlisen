# Deploying the Telegram Bot Backend to Render

This deploys the combined backend: the Express API (`/api/transcription/*`,
`/api/recitation/*`) and the Telegram bot's long-polling loop run together
in **one process, one Render Web Service**. The bot's calls to the API go to
`localhost` inside the same container - nothing leaves the box for that hop.

This supersedes the "Part 1: Setup Your Local Whisper Server" section of
`DEPLOYMENT.md` - tilawa runs in-process now, so there's no PC-hosted
Whisper server or Cloudflare tunnel to keep online.

## Why Docker, not Render's native Node runtime

Two things this app needs aren't available through Render's native Node
buildpack:
- **ffmpeg** (decodes Telegram voice notes) - installed via `apt-get` in the
  Dockerfile.
- **onnxruntime-node**'s prebuilt native binary - needs a glibc base image
  (`node:22-slim`, not Alpine).

`backend/Dockerfile` and `render.yaml` (repo root) are already set up for
this.

## 1. Get a Telegram bot token

Message [@BotFather](https://t.me/BotFather) on Telegram, send `/newbot`,
follow the prompts, and copy the token it gives you
(`123456789:ABCdef...`).

## 2. Deploy

### Option A - Blueprint (recommended, one click)

1. Push this repo to GitHub (already done if you're reading this from the
   deployed branch).
2. In the Render dashboard: **New +** → **Blueprint**.
3. Connect the repo. Render reads `render.yaml` from the root and proposes
   the `qlisen-backend` service.
4. Fill in the env vars it prompts for (marked `sync: false` in
   `render.yaml`) - at minimum `TELEGRAM_BOT_TOKEN`.
5. Click **Apply**.

### Option B - Manual Web Service

1. Render dashboard → **New +** → **Web Service** → connect the repo.
2. **Runtime**: Docker
3. **Dockerfile Path**: `backend/Dockerfile`
4. **Docker Build Context Directory**: `backend`
5. **Plan**: see sizing note below.
6. Add environment variables (see next section).
7. **Create Web Service**.

## 3. Environment variables

| Variable | Required | Notes |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | **Yes** | From BotFather. Without it, the server still runs but the bot stays off. |
| `NODE_ENV` | Recommended | `production` |
| `USE_TILAWA` | No | Defaults on whenever the baked-in model assets are present. Set to `false` to force the Whisper fallback instead. |
| `SENDGRID_API_KEY` | No | Only used if you want email results too (Telegram users don't need it - `EmailService` no-ops without a key). |
| `FROM_EMAIL`, `FRONTEND_URL` | No | Only relevant if `SENDGRID_API_KEY` is set. |
| `BACKEND_URL` | No | Leave unset - the combined server defaults the bot to its own `localhost:$PORT`. Only set this if you split the bot out to run elsewhere. |

Don't set `PORT` yourself - Render injects it, and the app already reads
`process.env.PORT`.

## 4. Plan sizing

Pick **Standard** (2 GB RAM) or higher, not the $7/mo **Starter** (512 MB).
The ONNX model plus inference buffers can get tight on 512 MB, and Starter's
throttled CPU makes longer recitations (multi-minute voice notes) noticeably
slower to transcribe. Bump the plan later if you see OOM restarts or slow
responses in the logs.

## 5. First build

The Docker build runs `node scripts/fetch-tilawa-assets.js`, which downloads
the ~88MB model plus ~15MB of JSON assets from GitHub and bakes them into
the image. Expect the first build to take several minutes; this means the
service is ready to transcribe the moment it boots - no runtime download, no
cold-start race.

## 6. Verify

```bash
curl https://<your-service>.onrender.com/health
curl https://<your-service>.onrender.com/api/transcription/health
```

The second should show:

```json
{
  "primaryEngine": "tilawa",
  "tilawa": { "available": true, "active": true },
  ...
}
```

Then message your bot on Telegram: `/start`, then send a voice note.

## Troubleshooting

- **Logs never show "🤖 Telegram Bot initialized"** - `TELEGRAM_BOT_TOKEN`
  isn't set, or is set on the wrong service if you split into two.
- **Service restarts / crashes under load** - likely OOM; bump the plan
  (see sizing note above).
- **`/api/transcription/health` shows `"tilawa": {"available": false}`** -
  the build step failed to fetch the model assets; check the build logs for
  `fetch-tilawa-assets.js` errors (usually a transient GitHub fetch - retry
  the deploy).
- **Slow first response after a deploy** - normal; the ONNX session loads
  lazily on the first transcription request (a few seconds), not at boot.
