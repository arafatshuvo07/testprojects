# The Pentagon Papers — documentary short

A 2:50 archival-style documentary cut to the supplied ElevenLabs narration
(`public/narration.mp3`). No subtitles; on-screen text is limited to name
lower-thirds, dates, the 1945–1967 timeline, the 6–3 ruling and the per curiam quote.

- `data/transcript.json` – word-level timestamps of the narration (Parakeet ASR).
- `src/shots.ts` – shot list; every cut is pinned to the word it illustrates.
- `scripts/slots.json` – which real archival image fills each slot, with crop and source.
- `scripts/prepare_images.py` – rebuilds `public/img/` from the original sources: the declassified
  Pentagon Papers PDF (DocumentCloud S3), Smithsonian Open Access (CC0) and the Open Images
  dataset (CC BY 2.0, streamed from its S3 tar shards). The prepared images are committed, so
  this is only needed to change picks.
- `scripts/score.py` – synthesises the drone score, impacts and typewriter keys.
- `CREDITS.md` – source and license of every image used.

Render: `npm i && python3 scripts/score.py && npx remotion render PentagonPapers out/pentagon-papers.mp4 --crf=17`
