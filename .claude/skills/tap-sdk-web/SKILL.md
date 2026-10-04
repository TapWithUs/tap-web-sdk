---
name: tap-sdk-web
description: >-
  Build browser apps with Tap Strap / TapXR via @tapwithus/tapsdk (Web Bluetooth).
  Use when connecting Tap in Chrome/Edge/Opera, wiring tap callbacks, Controller
  mode, or debugging zero events. Install with npm install @tapwithus/tapsdk.
---

# tap-sdk-web / @tapwithus/tapsdk (app builders)

Use this skill when integrating **Tap** into a web app with the Web SDK.

## Hard constraints

- **Package (published):** `npm install @tapwithus/tapsdk` (latest **0.9.0**). Repo is `TapWithUs/tap-web-sdk`. Clone + build + `npm link` is **only** for unreleased local SDK development — not the app-builder first path.
- **Hardware first-run:** Tap Strap and TapXR only. Tap Band is waitlist-only (https://www.tapwithus.com/tapband-waitlist/) — not an SDK target.
- **XR gestures:** subset of Band; do **not invent** missing-gesture lists — use package enums.
- **Browsers:** Chrome, Edge, Opera only. Safari/Firefox unsupported. Page must be HTTPS or localhost.
- **Connect:** `connect()` → `requestDevice()` needs a **user gesture** (button click).
- **v1 taps:** call `setInputMode(new InputModeController())` after connect. **Text mode is silent to the SDK.**
- **APIs:** only use exports from `@tapwithus/tapsdk` / this repo. Do **not invent** methods, UUIDs, or payload shapes. v2 tapcode may be a list (not int) — follow `TapSDKWeb2` types.

## Docs

- Portal Web SDK: https://dev.tapwithus.com/docs/web/
- Getting started: https://dev.tapwithus.com/docs/getting-started/
- How Tap works: https://dev.tapwithus.com/docs/how-tap-works/
- Repo README and `AGENTS.md` (For app builders)

## Install package (app builders)

```bash
npm install @tapwithus/tapsdk
```

## Install this skill (into an app repo)

```bash
# From the app project root
curl -sL https://raw.githubusercontent.com/TapWithUs/tap-web-sdk/master/install-skills.sh | bash
# or: bash -s -- cursor | claude | all
```

**Local SDK development only:** clone `tap-web-sdk`, `npm install` + `npm run build`, `npm link`, then in the app `npm link @tapwithus/tapsdk`.

## First win

```typescript
import {
    connect,
    isTapSDKWeb2,
    InputModeController,
} from '@tapwithus/tapsdk';

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

- Changing npm Trusted Publishing / release workflow (unless the user asks)
- Editing the developer portal site
- Python or mobile SDKs (except as behavior reference)
- Treating Tap Band as a supported first-run device
