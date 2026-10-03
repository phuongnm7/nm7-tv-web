# NM7 TV Web 1.0.69

Web Browser version follows the Android TV 1.0.69 TV layout and behavior.

## TV UI
- Exact Android-style TV landscape wallpaper and channel cards.
- Home groups are prioritized as VTV, VTVcab, Thể Thao, SCTV when present.
- Real focusable HTML buttons with roving tabindex, so browser keyboard and Samsung TV Arrow/Enter/Back events use the same navigation state.
- LEFT from the first channel opens the side menu.
- UP/DOWN changes rows and LEFT/RIGHT changes channels within a row.
- OK opens playback.
- Player supports Back, controller, seek and channel switching.

## Browser playback
- HLS: native HLS where appropriate; Hls.js 1.7.3 on Chromium/MSE browsers.
- MPEG-TS/FLV: mpegts.js / FLV MSE path where the browser supports it.
- DASH: Shaka Player 4.16.51 with Media Source Extensions.
- ClearKey / Widevine / PlayReady are routed through the browser EME path when the TV/browser exposes the required key system.
- Unknown HTTP wrapper URLs are probed before the playback engine is selected.
- /api/stream rewrites HLS playlists and DASH BaseURL/segment dependencies through the same-origin proxy and preserves playlist headers.
- /api/license handles remote DRM license requests.
- Playlist metadata keeps User-Agent, Referer and Origin where supplied.

## Important browser limitation
Samsung documents that ArrowLeft, ArrowUp, ArrowRight, ArrowDown, Enter and Back are mandatory remote keys and can be received as DOM keyboard events. Samsung also documents that special color/playback keys cannot be made functional in the Smart TV Web Browser because the browser does not expose the Samsung Product/Tizen APIs. The Web version therefore treats Arrow/Enter/Back as the portable TV remote control surface; optional media key mappings are handled when the browser exposes them.

## Validation
GitHub Actions validates:
- JavaScript syntax and required assets.
- Browser focus/navigation behavior.
- HLS playback regression fixture.

The Web project is separate from the native Samsung Tizen WGT. The Browser URL stays a normal web application and does not require installing a WGT.
