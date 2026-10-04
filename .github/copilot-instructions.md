# Tap Web SDK — Copilot instructions

Coding-agent facts for [TapWithUs/tap-web-sdk](https://github.com/TapWithUs/tap-web-sdk) (browser Web Bluetooth).

## Facts

- **Published on npm:** `npm install @tapwithus/tapsdk` (latest **0.9.0**). That is the app-builder first path.
- **Clone + build + link** is only for unreleased local SDK development — not the default install for apps.
- **Browsers:** Chrome, Edge, Opera only. Safari/Firefox unsupported. Page must be **HTTPS** or **localhost**.
- **Connect:** `connect()` / `requestDevice()` needs a **user gesture** (e.g. button click).
- **v1 taps:** call `setInputMode(new InputModeController())` after connect, or taps are **silent** (Text/HID mode).
- **Hardware:** Tap Strap and TapXR only. Tap Band is waitlist — https://www.tapwithus.com/tapband-waitlist/ — not an SDK first-run target.
- **Do not invent APIs**, BLE UUIDs, gesture lists, or payload shapes. Follow exports and types in this repo / the published package.

## Where to read next

- App-builder guide: [`AGENTS.md`](../AGENTS.md) (For app builders)
- Cursor skill: [`.cursor/skills/tap-sdk-web/SKILL.md`](../.cursor/skills/tap-sdk-web/SKILL.md)
- Portal: https://dev.tapwithus.com/docs/web/ · https://dev.tapwithus.com/llms.txt
