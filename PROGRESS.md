# NM7 TV 1.0.69 — PROGRESS

## 2026-10-03

### Baseline
- Chuẩn chính thức: Android release `v1.0.69-fast-vtvcab-logo-16`.
- Commit baseline: `f79fc06009f20e0ac3a5859c0abcfd6ce70a6763`.
- Branch phát triển: `feature/web-tv-browser-1.0.69-android-exact`.

### Đã hoàn thành
- Dựng lại UI TV theo cấu trúc Android 1.0.69.
- Dùng vector YouTube logo đúng từ Android 1.0.69.
- Dựng launcher icon đúng từ `ic_launcher.xml` Android 1.0.69.
- Logo kênh tròn + halo/ring focus.
- D-pad navigation.
- Side menu / search / favorites / recent / reload.
- Parser giữ `tvg-id`, `tvg-logo`, group, EXTVLCOPT, URL headers, KODIPROP/DRM metadata.
- Stream classification: HLS/DASH/TS/HTTP.
- Fallback candidate theo cùng tvg-id / tên kênh.
- Native AVPlay path cho Tizen.
- Browser fallback bằng hls.js / dash.js / mpegts.js.
- Probe URL resolver để nhận diện stream khi URL không có extension.
- WGT Tizen build pipeline.

### Smoke test
- Web syntax: PASS.
- Browser UI: PASS.
- D-pad RIGHT focus: PASS.
- Playlist: PASS.
- Dynamic source count: 483–494 tại các lượt scan.
- Protocol matrix: HLS/DASH/HTTP.
- WGT build: PASS.

### Kiểm tra stream hiện tại
- Seenow MPD trực tiếp từ GitHub runner có thể bị 403/không DNS theo thời điểm.
- Một số HLS fallback công khai đã hết hiệu lực hoặc yêu cầu edge token; không được đánh dấu là nguồn ổn định nếu chưa kiểm tra trực tiếp trên TV.
- ON Sports / ON Football trong playlist hiện có ClearKey metadata; AVPlay trên Samsung chỉ công khai PlayReady / Widevine / Verimatrix, nên ClearKey DASH vẫn dùng đường HTML5/EME fallback khi môi trường TV cho phép.
- Vì vậy chưa đánh dấu trạng thái "tất cả kênh phát OK" chỉ dựa trên GitHub runner.

### WGT artifact
- File: `NM7-TV-Tizen-1.0.69-AVPlay-unsigned.wgt`
- SHA-256: `1ee0e3c48d44a57caa9caa0e30096fe18ba2a60efbd5837774a5526b0ed23524`
- Build run: `37107630282`.
- Artifact: `NM7-TV-Tizen-1.0.69-AVPlay-unsigned`.

### Việc còn phải xác nhận
1. Cài WGT đã re-sign lên Samsung M5500 / Tizen 3.0.
2. Xác nhận AVPlay native mở VTV1.
3. Xác nhận các kênh HLS không DRM.
4. Xác nhận ON Sports / ON Football ClearKey path trên TV thực.
5. Sau khi test TV pass mới merge main.
