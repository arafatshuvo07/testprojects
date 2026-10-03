#!/usr/bin/env bash
# One-shot build: fetch archival photos, synthesise the score, render the MP4.
set -euo pipefail
cd "$(dirname "$0")"
python3 scripts/fetch_images.py
python3 scripts/score.py
npx remotion render PentagonPapers out/pentagon-papers.mp4 --codec=h264 --crf=18 --concurrency=4
