# The Pentagon Papers — documentary short

A 2:50 archival-style documentary cut to the supplied ElevenLabs narration
(`public/narration.mp3`). No subtitles; on-screen text is limited to name
lower-thirds, dates, the 1945–1967 timeline, the 6–3 ruling and the per curiam quote.

- `data/transcript.json` – word-level timestamps of the narration (Parakeet ASR).
- `src/shots.ts` – shot list; every cut is pinned to the word it illustrates.
- `scripts/images.json` – which real public-domain archival photo fills each slot.
- `scripts/fetch_images.py` – downloads those photos from Wikimedia Commons
  (needs `commons.wikimedia.org` and `upload.wikimedia.org`), writes credits.
- `scripts/score.py` – synthesises the drone score, impacts and typewriter keys.

Build everything: `npm i && ./render.sh` → `out/pentagon-papers.mp4`.

You can also drop your own photos into `public/img/<slot>.jpg` (slot names are
the keys in `scripts/images.json`) and run `python3 scripts/fetch_images.py --meta-only`.
