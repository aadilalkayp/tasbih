# Tasbih

A calm, ad-free online dhikr counter — **https://tasbih.alkp.dev**

- Tap anywhere or press **Space** / **Enter** to count; **Backspace** / **-** / **Z** to undo; **M** to mute.
- Soft click sound per count, a distinct chime + long haptic pattern when the target is reached.
- Custom dhikrs with targets, and sequences (e.g. 33 · 33 · 34 after salah) that auto-advance.
- Guards against accidental counts: optional "ignore mouse & trackpad clicks" and a double-count cooldown.
- Daily totals, 7-day history and streak. Everything is stored in `localStorage`; export/import a JSON backup in Settings.
- Installable (PWA) and works offline.

Haptics use the Vibration API (Android). iOS Safari has no Vibration API, so on iOS 18+ a hidden
`<input type="checkbox" switch>` is toggled to trigger a system haptic tap.

## Develop

```sh
npm install
npm run dev
```

## Deploy (Cloudflare Workers static assets)

```sh
npx wrangler login   # once
npm run deploy       # builds to dist/ and deploys; attaches tasbih.alkp.dev as a custom domain
```

The `alkp.dev` zone must be on the same Cloudflare account. Config lives in `wrangler.jsonc`.
