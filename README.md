# NM7 TV Web — Browser 1.0.69

## Chuẩn duy nhất

Web App này lấy **Android NM7 TV 1.0.69** làm chuẩn UI/logic: release `v1.0.69-fast-vtvcab-logo-16`, commit `f79fc06009f20e0ac3a5859c0abcfd6ce70a6763`.

Không dùng UI, logic hoặc cấu trúc 1.0.39 làm baseline.

## Mục tiêu triển khai

Đây là **Web App/PWA chạy trực tiếp trong trình duyệt Internet của Samsung TV**:

1. Mở Samsung Internet.
2. Nhập URL Web App.
3. Dùng remote D-pad để điều khiển.
4. Có thể thêm trang vào Home Screen của TV.

Không yêu cầu cài WGT để chạy Web App.

## UI / remote

- Bố cục TV bám Android 1.0.69.
- YouTube dùng vector Android 1.0.69.
- Launcher/logo và logo kênh theo asset 1.0.69.
- Card logo tròn + halo/ring khi focus.
- Side menu, search, favorites, recent, reload.
- LEFT/RIGHT/UP/DOWN/OK.
- RIGHT ở card ngoài cùng được xử lý wrap sang card đầu của cùng hàng.

## Playback browser

Samsung Tizen 3.0 (2017) có HTML5 `video`, MSE và EME; Samsung cũng liệt kê MPEG-DASH, HLS và ClearKey trong nền tảng streaming của Tizen 3.0.

Implementation hiện tại:

- **HLS trên Samsung Tizen browser:** ưu tiên HTML5 `video` native, không ép qua JavaScript proxy nếu trình duyệt có native HLS.
- **DASH:** dash.js 2.5.0, tương thích JavaScript cũ của Tizen 3.0/M47.
- **Desktop/non-Tizen:** hls.js 0.14.17 cho HLS; dash.js cho DASH.
- Browser proxy cùng origin tại `/api/stream` dùng khi MSE/JavaScript cần CORS và để rewrite HLS segment URLs.
- Proxy sniff MIME để MPD/M3U8 không bị trả sai `text/html`.
- Fallback đúng thứ tự: proxy → direct trên cùng candidate; chỉ sau đó mới chuyển candidate tiếp theo.
- Không tự sinh URL stream ngoài playlist/metadata nguồn.

## Playlist

`/api/playlist?source=tv` tải nguồn playlist động và giữ metadata:

- `tvg-id`
- `tvg-logo`
- group
- URL headers
- KODIPROP/DRM metadata
- HLS/DASH/HTTP classification
- nhiều candidate theo cùng kênh

Smoke gần nhất đã đọc được khoảng 493 kênh / 521 candidates tùy thời điểm nguồn.

## Kiểm chứng

- HTML/JS dùng cú pháp cũ phù hợp Tizen 3.0: PASS.
- Playlist/protocol coverage: PASS.
- Tizen browser routing smoke với UA Tizen 3.0: PASS.
- Native HLS routing trên browser path: PASS ở mức routing test.
- RIGHT-edge navigation: PASS.
- Chromium full playback với nguồn live thực tế còn phụ thuộc quyền truy cập của CDN/Vercel runner; HTTP 403 từ runner không được coi là bằng chứng TV không phát được.
- **TV Samsung UA49M5500 chưa được điều khiển trực tiếp từ môi trường phát triển này**, nên không ghi nhận "TV thực tế PASS" khi chưa có phiên test trực tiếp trên TV.

## Nhánh

`feature/web-tv-browser-1.0.69-android-exact`

Giữ nhánh riêng, không merge `main` cho tới khi người dùng xác nhận Web App chạy ổn định trên TV thật.
