# Tasbih

A calm, ad-free online dhikr counter — **https://tasbih.alkp.dev**

- Tap anywhere or press **Space** / **Enter** to count; **Backspace** / **-** / **Z** to undo; **M** to mute; **F** for focus mode (**Esc** to leave).
- Selectable count sound (bead, wood, pop, beep, crystal) and target sound (bell, gong, chord, alarm), plus a long haptic pattern on completion.
- Focus mode (eye button): everything slides to its edge and only the counter remains.
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

## Deploy

Every push to `main` is built and deployed by GitHub Actions ([.github/workflows/deploy.yml](.github/workflows/deploy.yml))
to Cloudflare Workers static assets, with `tasbih.alkp.dev` attached as a custom domain (see `wrangler.jsonc`).
Pull requests only run the build.

Required repository secrets:

- `CLOUDFLARE_API_TOKEN` — created from the **Edit Cloudflare Workers** token template, with zone resources including `alkp.dev`.
- `CLOUDFLARE_ACCOUNT_ID` — shown on the Cloudflare dashboard (Workers & Pages overview, right sidebar).
