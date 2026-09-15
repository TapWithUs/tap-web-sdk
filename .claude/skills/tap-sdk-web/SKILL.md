---
name: tap-sdk-web
description: >-
  Build browser apps with Tap Strap / TapXR via tap-sdk-web (Web Bluetooth).
  Use when connecting Tap in Chrome/Edge/Opera, wiring tap callbacks, Controller
  mode, or debugging zero events. Package is NOT on npm — clone and link.
---

# tap-sdk-web (app builders)

Use this skill when integrating **Tap** into a web app with the Web SDK.

## Hard constraints

- **Not on npm.** Package name is `tap-sdk-web`; repo is `TapWithUs/tap-web-sdk`. Install via clone + `npm install` + `npm run build`, then `npm link` or path install. Do **not** tell users to install from the npm registry.
- **Hardware first-run:** Tap Strap and TapXR only. Tap Band is waitlist-only (https://www.tapwithus.com/tapband-waitlist/) — not an SDK target.
- **XR gestures:** subset of Band; do **not invent** missing-gesture lists — use package enums.
- **Browsers:** Chrome, Edge, Opera only. Safari/Firefox unsupported. Page must be HTTPS or localhost.
- **Connect:** `connect()` → `requestDevice()` needs a **user gesture** (button click).
- **v1 taps:** call `setInputMode(new InputModeController())` after connect. **Text mode is silent to the SDK.**
- **APIs:** only use exports from `tap-sdk-web` / this repo. Do **not invent** methods, UUIDs, or payload shapes. v2 tapcode may be a list (not int) — follow `TapSDKWeb2` types.

## Docs

- Portal Web SDK: https://dev.tapwithus.com/docs/web/
- Getting started: https://dev.tapwithus.com/docs/getting-started/
- How Tap works: https://dev.tapwithus.com/docs/how-tap-works/
- Repo README and `AGENTS.md` (For app builders)

## Install

```bash
git clone https://github.com/TapWithUs/tap-web-sdk.git
cd tap-web-sdk
npm install
npm run build
npm link
# in your app:
npm link tap-sdk-web
```

## First win

```typescript
import {
    connect,
    isTapSDKWeb2,
    InputModeController,
} from 'tap-sdk-web';

// From a button click handler:
const sdk = await connect();

if (isTapSDKWeb2(sdk)) {
    sdk.registerTapEvents((id, data) => console.log('Tap', data[0]));
} else {
    sdk.registerTapEvents((id, tapcode) => console.log('Tap', tapcode));
    await sdk.setInputMode(new InputModeController());
}
```

## Zero events

1. Missing Controller on v1 (still in Text) — fix with `InputModeController`.
2. Safari/Firefox or non-HTTPS origin.
3. `connect()` without user gesture.
4. Device busy / off.
5. Invented callback signatures — match README / types.

## Out of scope for this skill

- Publishing to npm
- Editing the developer portal site
- Python or mobile SDKs (except as behavior reference)
- Treating Tap Band as a supported first-run device
