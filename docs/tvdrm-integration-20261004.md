# TV-DRM integration — 2026-10-04

This branch integrates useful playback ideas from the public hieu-TQS/TV-DRM player into NM7 TV Web 1.0.69 without replacing the Android-style UI/navigation.

## Changes

- Browser playback is direct-first; /api/stream is now a recovery path rather than the first hop.
- DASH/DRM license requests are direct-first and use /api/license on retry.
- /api/probe now resolves common wrapper responses containing JSON/HTML/playlist/manifest stream URLs before selecting an engine.
- HLS.js recovery was strengthened for transient network/media errors.
- FLV.js is loaded because the player already has an FLV engine path.
- Samsung Tizen WGT routes ClearKey DASH through the browser EME/dash.js path instead of rejecting it in AVPlay.
- Samsung Tizen Widevine tries the modern EME_WIDEVINE_CDM name first and falls back to WIDEVINE_CDM.
- AVPlay-specific seek/play controls are only used when the current stream is actually running through AVPlay.

## Validation target

1. Direct HLS on PC/browser.
2. Wrapped HLS/MPD on PC/browser.
3. Static ClearKey DASH on PC/browser.
4. ClearKey DASH on Samsung Tizen WGT through EME/dash.js.
5. Widevine/PlayReady on Samsung Tizen through AVPlay.
6. Arrow/OK/Back navigation remains unchanged.
