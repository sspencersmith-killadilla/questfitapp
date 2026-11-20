# Brand favicon + MIT license

## Current state
- No `public/` folder and no icon link in the site head, so browsers show a generic icon.
- No logo exists in the project yet.
- No LICENSE or README file; package.json has no license field.

## 1. Favicon
- Design a square QuestFit icon in the app's "leather-bound gym journal" look: deep ember/leather background, gold mark (an open book combined with a small flame/footstep), bold shapes with no tiny text so it reads at 16-32px.
- Save it to `public/favicon.png` (64x64, padded square).
- Add `{ rel: "icon", type: "image/png", href: "/favicon.png" }` to the root page head.
- There is no `public/favicon.ico` to delete; I'll confirm none exists.

## 2. MIT license
- Add `LICENSE` at the project root with the standard MIT text, "Copyright (c) 2026 Spencer Smith".
- Set `"license": "MIT"` in package.json.
- No README exists, so no README section is added (I'll create a short README with the license line only if you want one).
