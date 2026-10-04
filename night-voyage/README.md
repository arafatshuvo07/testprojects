# Night Voyage

A 10-second, 1080p/30fps documentary-style aerial shot: a cruise ship sails toward a misty coastline at night, its bow searchlights sweeping the water while moonlight glitters on the sea.

Built with Remotion + Three.js (`@remotion/three`). Everything is procedural. The ocean, terrain, ship and light beams are generated in code, and every animation is driven by `useCurrentFrame()`, so renders are deterministic.

## Structure

- `src/NightVoyage/NightVoyage.tsx`: the composition. It holds the camera move, lights, the grade/grain/letterbox overlays and the caption.
- `src/NightVoyage/Ocean.tsx`: the water shader (waves, moon glitter, wake, searchlight pools, fog).
- `src/NightVoyage/Coast.tsx`: the procedural hills with valley mist.
- `src/NightVoyage/Ship.tsx`: the cruise ship model (hull, decks, lit cabins, yellow funnel).
- `src/NightVoyage/Beams.tsx`: the volumetric bow searchlights.
- `src/NightVoyage/scene.ts`: shared constants: ship speed/heading, moon direction, fog.

The caption text (`location`, `timestamp`) is editable as composition props in the Studio.

## Commands

```console
npm i
npm run dev                      # preview in Remotion Studio
npx remotion render NightVoyage out/night-voyage.mp4
```

In a headless container without a GPU, add `--gl=swangle`.
