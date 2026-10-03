# NM7 TV Web Browser 1.0.69 — PROGRESS

## 2026-10-03

### Baseline
- Android chuẩn: `v1.0.69-fast-vtvcab-logo-16`
- Commit: `f79fc06009f20e0ac3a5859c0abcfd6ce70a6763`
- Branch: `feature/web-tv-browser-1.0.69-android-exact`

### Đã triển khai
- Web App/PWA cho Samsung Internet, không lấy WGT làm mục tiêu runtime.
- UI/asset theo Android 1.0.69.
- D-pad LEFT/RIGHT/UP/DOWN/OK.
- RIGHT-edge navigation với wrap về đầu hàng.
- HLS native `<video>` trên Tizen browser khi browser hỗ trợ native HLS.
- dash.js 2.5.0 cho DASH/MSE; hls.js 0.14.17 cho browser không có native HLS.
- Same-origin stream proxy cho MSE/CORS.
- Proxy rewrite HLS và sniff MIME cho MPD/M3U8.
- Fallback state machine đúng: cùng candidate proxy → direct → candidate kế tiếp.
- Playlist động giữ metadata và candidates từ nguồn.

### Smoke
- Web syntax tương thích kiểu JavaScript cũ: PASS.
- Playlist/protocol matrix: PASS.
- Tizen 3.0 UA routing: PASS.
- Native HLS routing: PASS.
- RIGHT-edge remote navigation: PASS.
- Chromium live playback: đang được kiểm tra; các CDN có thể trả 403 cho môi trường runner nên không dùng runner làm đại diện cho TV.
- TV UA49M5500/Tizen 3.0 chưa có phiên điều khiển trực tiếp từ môi trường này; chưa đánh dấu TV thực tế PASS.

### Quy tắc
- Không merge `main`.
- Không lấy 1.0.39 làm baseline.
- Không coi WGT build là tiêu chí hoàn thành Web App.

### Remote + autoplay fix (2026-10-03)
- Đã loại bỏ các lời gọi tới controller/seek/switch hàm chưa tồn tại gây lỗi khi bấm remote.
- Remote handler chạy ở `window` capture và nhận cả `keyCode` lẫn `event.key` (ArrowLeft/Right/Up/Down/Enter/Back/Escape).
- Home D-pad navigation smoke: **PASS**.
- Enter/OK chọn kênh chuyển sang player ngay.
- URL stream không có extension được khởi động ngay trước khi probe bất đồng bộ, tránh mất user-activation.
- Không còn thông báo/luồng chờ "Chờ xác nhận phát…".
- Player Back/Return đóng player và trả focus về đúng card.
- Samsung/Tizen browser routing smoke: **PASS**.
- Deployment có code fix: `nm7-tv-laox6n5nz-phuongnm7.vercel.app`.
