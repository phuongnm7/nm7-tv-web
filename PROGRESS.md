# NM7 TV Web — Progress

## Current baseline
- Date: 2026-10-04
- Branch: `feat/tvdrm-player-integration-20261004`
- Stable test baseline: `4fff84e7cfe495311c3623179b87b9e8a97c0acc`
- Cloudflare Worker: `https://nm7-tv-web.phuongnm7-iptv.workers.dev/`
- TV UI baseline: Android TV NM7 1.0.69
- Deployment target: Cloudflare Workers; do not switch deployment to Vercel.

## Current status
The current mobile-responsive version is considered **temporarily stable for extended real-device testing**. The source-management fixes in this baseline are also part of the test baseline, while unrelated UI refactors remain deferred.

### Mobile
- Native vertical page scrolling is used on mobile.
- Channel cards use a responsive grid instead of horizontal per-row swipe strips.
- Global `#app` touch interception was removed.
- Touch gesture handling is limited to the player area.
- Player gestures:
  - swipe left/right: seek
  - swipe up/down: switch channel
  - tap: show player controls
- Mobile menu and Back handling remain enabled.
- TV remote/keyboard navigation is kept on the TV path.

### TV / desktop
- Android 1.0.69 visual baseline remains the reference.
- TV directional navigation and OK selection remain intact.
- Channel/logo presentation and existing player paths are preserved.

### Playback
- HLS / DASH / DRM / FLV / MPEG-TS player paths remain in place.
- ON Football uses the latest SeeNow DASH sources and ClearKey metadata currently committed in the Worker and playlist.

## Source-management fixes in current baseline
- The default **Thể thao** source no longer depends on a single failing Worker endpoint. The Worker now tries the current `sports-auto.m3u` source first and keeps `thethaonm7.../playlist.m3u` as fallback.
- **Thêm nguồn IPTV** no longer fetches arbitrary playlist URLs directly from the browser. It now calls the same-origin `/api/source` gateway, which fetches/parses the playlist server-side and returns CORS-safe JSON.
- Worker M3U parsing now resolves relative stream URLs against the source URL.

## Validation
For commit `4fff84e7cfe495311c3623179b87b9e8a97c0acc`:
- GitHub Actions browser validation: **success**
- Cloudflare deployment and smoke test: **success**
- Sport playlist API smoke test: **success**, 566 channels returned.
- Custom-source API smoke test: **success**, 566 channels parsed from the same real M3U source.
- Cloudflare smoke test also confirmed the normal Android 1.0.69 playlist: 490 channels with the expected first groups.

## Testing phase
Please treat `4fff84e7cfe495311c3623179b87b9e8a97c0acc` as the current functional baseline while testing on:
- Android Chrome/mobile browser
- Samsung TV/Tizen Web App
- Different screen orientations
- Channel switching and player gestures
- Long scrolling through the full channel list
- HLS, DASH/DRM, FLV and MPEG-TS channels

### Latest verified fixes
- `8617103b1cb9a23e9a349d980b4251ba7cd0b5d4`: sport-source fallback and same-origin custom-source gateway implemented.
- `997ffcf86d74d2cca881a39ad3b27d1ec9e2b44b`: mobile custom-source loading moved to `/api/source`.
- `4fff84e7cfe495311c3623179b87b9e8a97c0acc`: Cloudflare smoke tests added for sport and custom-source APIs.
- Latest documentation commits: `876fa3b6b78ba6577c64ffc460d89b67ae8be264` and `db975d41bf3e79ba9a2fbef3d241fc73dc5e1d80`.

### Known next-step candidates
Only change these after real-device testing identifies a reproducible issue:
- mobile scrolling/render performance with the full channel list
- logo lazy-loading / rendering performance
- focus/scroll interaction edge cases
- Samsung TV-specific playback compatibility for remaining unsupported streams
- cleanup of temporary diagnostic GitHub workflows

## Handover rule
Do not use a new experimental UI baseline until the current test round is finished. Any future fix should branch from the current stable commit and be isolated to the reported issue.
