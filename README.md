# NM7 TV Web / Tizen 1.0.69

## Chuẩn nguồn

Bản hiện tại lấy **Android NM7 TV 1.0.69** làm mốc UI/asset/player: release `v1.0.69-fast-vtvcab-logo-16`, commit `f79fc06009f20e0ac3a5859c0abcfd6ce70a6763`.

Không lấy 1.0.39 làm baseline giao diện.

## UI 1.0.69

- Layout TV theo mốc Android 1.0.69.
- YouTube dùng đúng vector logo của Android 1.0.69.
- Launcher/icon được dựng từ đúng vector `ic_launcher.xml` của Android 1.0.69.
- Card kênh: logo tròn, halo/ring khi focus, điều hướng D-pad trái/phải/lên/xuống.
- Side menu và các mục Trang chính / Truyền hình / Thể thao / Yêu thích / Gần đây / Tìm kiếm / Tải lại.
- Giữ logo fallback riêng cho các kênh VTVCab đã xử lý ở Android 1.0.69.

## Playback

### Tizen/Samsung TV

Trên Samsung TV, player ưu tiên **Samsung AVPlay** nếu `webapis.avplay` tồn tại:

- HLS `.m3u8`
- MPEG-DASH `.mpd`
- User-Agent / Cookie qua AVPlay streaming properties
- Display 1920x1080
- Buffer callbacks, playback callbacks, seek, play/pause
- PlayReady SetProperties khi playlist cung cấp license metadata
- ClearKey/Widevine không ép qua AVPlay nếu TV API không hỗ trợ trực tiếp; ClearKey DASH vẫn giữ nhánh HTML5/EME fallback.

Samsung xác nhận AVPlay là API phù hợp cho adaptive streaming/DRM trên TV, hỗ trợ HLS/DASH và được cấu hình sau `open()` trước `prepare()/prepareAsync()`.

### Browser fallback

Nếu không có AVPlay:

- hls.js cho HLS
- dash.js cho DASH
- mpegts.js cho MPEG-TS khi trình duyệt hỗ trợ
- Resolver/probe cho URL không có đuôi `.m3u8/.mpd`

## Playlist

Preview hiện đọc playlist động qua API. Smoke test gần nhất xác nhận:

- 483–494 kênh tùy thời điểm nguồn cập nhật
- HLS / DASH / HTTP được phân loại
- VTV1 có DASH + fallback HLS
- ON Sports có DASH/ClearKey + fallback HLS
- ON Football có DASH/ClearKey + fallback HLS

## Tizen WGT

Artifact build hiện tại:

`NM7-TV-Tizen-1.0.69-AVPlay-unsigned.wgt`

SHA-256:

`1ee0e3c48d44a57caa9caa0e30096fe18ba2a60efbd5837774a5526b0ed23524`

WGT gồm:

- `config.xml` Tizen 2.3+ / profile `tv-samsung`
- `index.html`
- `dash.all.min.js`
- `icon.png`

### Tình trạng

- Source branch: `feature/web-tv-browser-1.0.69-android-exact`
- Android 1.0.69 baseline: đã chốt.
- UI/runtime syntax: PASS.
- Browser UI smoke: PASS.
- Playlist smoke: PASS.
- WGT build: PASS.
- **TV thực tế:** chưa thể tự xác nhận hoàn toàn trong GitHub runner; cần sideload WGT lên Samsung TV M5500 và kiểm tra playback native AVPlay. WGT hiện là unsigned để Apps2Samsung re-sign theo DUID/certificate của TV.

## Không merge main

Nhánh này là nhánh phát triển riêng của mốc 1.0.69. `main` được giữ nguyên cho đến khi kiểm tra TV thật hoàn tất.
