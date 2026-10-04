# NM7 TV Web 1.0.69

Web Browser version follows the Android TV 1.0.69 TV layout and behavior.

## Current test baseline
- Date: 2026-10-04
- Branch: `feat/tvdrm-player-integration-20261004`
- Stable functional baseline: `0e50b38bdd0bc1c242a9f73b5d2cdb74300636e1`
- Cloudflare Worker: `https://nm7-tv-web.phuongnm7-iptv.workers.dev/`
- Deployment target: Cloudflare Workers.
- This baseline is currently in an extended real-device testing phase. Avoid unrelated UI changes until the test round identifies a reproducible issue.

## TV UI
- Exact Android-style TV landscape wallpaper and channel cards.
- Home groups are prioritized as VTV, VTVcab, Thể Thao, SCTV when present.
- Real focusable HTML buttons with roving tabindex, so browser keyboard and Samsung TV Arrow/Enter/Back events use the same navigation state.
- LEFT from the first channel opens the side menu.
- UP/DOWN changes rows and LEFT/RIGHT changes channels within a row.
- OK opens playback.
- Player supports Back, controller, seek and channel switching.
- Android TV 1.0.69 remains the visual and interaction reference for the TV layout.

## Mobile / responsive
- Mobile uses native vertical page scrolling instead of global touch interception.
- Channel cards switch to a responsive grid on small screens, so each channel group no longer requires horizontal swiping.
- Global `#app` touch handlers were removed to prevent scroll fighting and lag.
- Touch gesture handling is restricted to the player area.
- Player gestures:
  - swipe left/right: seek
  - swipe up/down: switch channel
  - tap: show controls
- Mobile menu and two-stage Back/exit handling remain available.
- The TV remote/keyboard navigation path is preserved separately from mobile touch behavior.

## Browser playback
- HLS: native HLS where appropriate; Hls.js 1.7.3 on Chromium/MSE browsers.
- MPEG-TS/FLV: mpegts.js / FLV MSE path where the browser supports it.
- DASH: Shaka Player 4.16.51 with Media Source Extensions.
- ClearKey / Widevine / PlayReady are routed through the browser EME path when the TV/browser exposes the required key system.
- Unknown HTTP wrapper URLs are probed before the playback engine is selected.
- /api/stream rewrites HLS playlists and DASH BaseURL/segment dependencies through the same-origin proxy and preserves playlist headers.
- /api/license handles remote DRM license requests.
- Playlist metadata keeps User-Agent, Referer and Origin where supplied.
- ON Football currently uses the latest committed SeeNow DASH sources with the corresponding ClearKey metadata.

## Important browser limitation
Samsung documents that ArrowLeft, ArrowUp, ArrowRight, ArrowDown, Enter and Back are mandatory remote keys and can be received as DOM keyboard events. Samsung also documents that special color/playback keys cannot be made functional in the Smart TV Web Browser because the browser does not expose the Samsung Product/Tizen APIs. The Web version therefore treats Arrow/Enter/Back as the portable TV remote control surface; optional media key mappings are handled when the browser exposes them.

## Validation
The latest baseline passed the repository's automated validation at commit `0e50b38bdd0bc1c242a9f73b5d2cdb74300636e1`:
- JavaScript syntax/validation checks: success.
- Browser validation workflow: success.
- Cloudflare deployment and deployed-worker smoke test: success.

The Web project is separate from the native Samsung Tizen WGT. The Browser URL stays a normal web application and does not require installing a WGT.

## Current test focus
During this test round, prioritize:
- Android Chrome/mobile scrolling and touch responsiveness.
- Samsung TV/Tizen browser remote navigation.
- Long scrolling through the full channel list.
- Channel switching and player gestures.
- HLS, DASH/DRM, FLV and MPEG-TS playback.
- Remaining Samsung TV playback compatibility issues.

## Known future cleanup / optimization
These are intentionally deferred until a reproducible issue or the current test round is complete:
- mobile full-list rendering/lazy-logo performance
- focus/scroll edge cases
- remaining unsupported Samsung TV stream formats
- cleanup of temporary diagnostic GitHub workflows

The current stable baseline should be used as the starting point for any next fix, and unrelated changes should remain isolated.
