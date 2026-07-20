# Debian-based (glibc) image, not Alpine - onnxruntime-node ships prebuilt
# native bindings that require glibc.
FROM node:22-slim

# ffmpeg: decodes Telegram voice notes (and other audio formats) to the PCM
# tilawa's model expects. Not available as an npm postinstall download in
# most sandboxed/CI network setups, so it's installed via apt instead.
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg ca-certificates && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# .npmrc sets onnxruntime-node-install=skip, so npm ci doesn't try to
# download optional CUDA binaries (this deployment is CPU-only).
COPY package.json package-lock.json .npmrc ./
RUN npm ci --omit=dev

COPY . .

# Bake tilawa's model + JSON assets (~88MB) into the image at build time,
# so the service is ready to transcribe immediately on boot - no runtime
# download, no cold-start race, no risk of a request arriving before the
# model exists on disk.
RUN node scripts/fetch-tilawa-assets.js

ENV NODE_ENV=production

# Render (and most PaaS) inject PORT at runtime; the app reads
# process.env.PORT and falls back to 5001 for local/manual runs.
EXPOSE 5001

CMD ["node", "test-server.js"]
