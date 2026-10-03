#!/usr/bin/env bash
# Build the score and render the MP4 (images in public/img are already prepared).
set -euo pipefail
cd "$(dirname "$0")"
python3 scripts/score.py
npx remotion render PentagonPapers out/raw.mp4 --codec=h264 --crf=17 --concurrency=4
ffmpeg -loglevel error -y -i out/raw.mp4 -c:v copy -af "loudnorm=I=-14:TP=-1.5:LRA=11" -c:a aac -b:a 256k -ar 48000 out/pentagon-papers.mp4
