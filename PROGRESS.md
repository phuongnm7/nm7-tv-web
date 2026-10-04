# NM7 TV Web — Progress

## Current baseline
- Date: 2026-10-04
- Branch: `feat/tvdrm-player-integration-20261004`
- Stable test commit before this progress note: `0e50b38bdd0bc1c242a9f73b5d2cdb74300636e1`
- Cloudflare Worker: `https://nm7-tv-web.phuongnm7-iptv.workers.dev/`
- TV UI baseline: Android TV NM7 1.0.69
- Deployment target: Cloudflare Workers; do not switch deployment to Vercel.

## Current status
The current mobile-responsive version is considered **temporarily stable for extended real-device testing**. No further UI refactor is being made at this point so that test results are attributable to this baseline.

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

## Validation
For commit `0e50b38bdd0bc1c242a9f73b5d2cdb74300636e1`:
- GitHub Actions browser validation: **success**
- Syntax/validation checks: **success**
- Latest Cloudflare deployment/smoke test: **success** (deployment corresponding to the current baseline)

## Testing phase
Please treat `0e50b38bdd0bc1c242a9f73b5d2cdb74300636e1` as the current functional baseline while testing on:
- Android Chrome/mobile browser
- Samsung TV/Tizen Web App
- Different screen orientations
- Channel switching and player gestures
- Long scrolling through the full channel list
- HLS, DASH/DRM, FLV and MPEG-TS channels

### Known next-step candidates
Only change these after real-device testing identifies a reproducible issue:
- mobile scrolling/render performance with the full channel list
- logo lazy-loading / rendering performance
- focus/scroll interaction edge cases
- Samsung TV-specific playback compatibility for remaining unsupported streams
- cleanup of temporary diagnostic GitHub workflows

## Handover rule
Do not use a new experimental UI baseline until the current test round is finished. Any future fix should branch from the current stable commit and be isolated to the reported issue.
