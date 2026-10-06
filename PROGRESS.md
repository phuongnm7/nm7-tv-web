# NM7 TV Web — Tiến độ dự án

## Mốc hiện tại

- Ngày: **06/10/2026**
- Nhánh: `fix/youtube-original-coccoc-adblock-20261006`
- Tính năng mới nhất: **nhập nguồn IPTV bằng tệp M3U/M3U8 cục bộ**
- Cloudflare Worker: `https://nm7-tv-web.phuongnm7-iptv.workers.dev/`
- Chuẩn giao diện TV: Android TV NM7 1.0.69
- Nền tảng triển khai: **Cloudflare Workers**
- Không chuyển dự án sang Vercel.

## Trạng thái hiện tại

Bản hiện tại **giữ nguyên giao diện, player, điều hướng, playlist và các logic playback đang có**; phần bổ sung duy nhất cho mốc này là khả năng thêm nguồn IPTV bằng tệp M3U/M3U8 trong **Thêm nguồn IPTV**.

### Nhập nguồn IPTV bằng tệp cục bộ

- Thêm nút **📁 Chọn tệp M3U** trong hộp thoại **Thêm nguồn IPTV**.
- Hỗ trợ tệp `.m3u` và `.m3u8`.
- Tệp được đọc trực tiếp bằng File API của trình duyệt; **không upload tệp lên máy chủ**.
- Dùng lại parser M3U hiện có để giữ metadata kênh như `tvg-id`, `tvg-logo`, `group-title` và thông tin stream/header/DRM khi có.
- Giới hạn kích thước tệp: **20 MB**.
- Tên tệp được hiển thị là **nguồn hiện tại** trong phiên.
- Sau khi nạp thành công, hộp thoại nguồn tự đóng.
- Remote TV trong hộp thoại vẫn hỗ trợ **LEFT/UP**, **RIGHT/DOWN** và **OK**.
- Khi reload nguồn, playlist cục bộ được nạp lại từ nội dung đã đọc trong phiên.
- Tính năng được triển khai đồng nhất trong `app.js` và `app-safari-policy.js`.

## Bảo toàn bản hiện tại

Đã kiểm tra so với baseline trước khi bổ sung tính năng:

- Không thay đổi UI player.
- Không thay đổi cơ chế DRM/playback hiện có.
- Không thay đổi giao diện Android TV 1.0.69.
- Không thay đổi danh sách/nhóm playlist mặc định.
- Không thay đổi các endpoint nguồn Thể thao và `/api/source`.
- Chỉ bổ sung code cần thiết cho local M3U import vào hai file player hiện có.

## Kiểm tra code

Đã xác nhận trên GitHub:

- JavaScript `app.js`: **syntax hợp lệ**.
- `app.js` và `app-safari-policy.js`: **đồng nhất nội dung**.
- Có đầy đủ marker của file picker, local reader, local loader, local apply và remote focus handling.
- GitHub branch đã chứa code local M3U với blob SHA `229efe82bd60e71c6b3ea3fd2192eaa51d1f5219`.

## Cloudflare / GitHub Actions

Commit code triển khai `a36b3c0e798fdfc08d3584524ac00f1dc28f07a2`:

- GitHub Actions run **#250 attempt 2: SUCCESS**.
- Checkout: **SUCCESS**.
- Deploy to Cloudflare Workers: **SUCCESS**.
- Production smoke test: **SUCCESS**.
- Smoke test xác nhận HTML/player, background 1.0.69, playlist Android 1.0.69, playlist Thể thao, custom source và các marker Shaka/Safari DRM hiện có.

Các lần thất bại trước của run #248/#249/#250 là lỗi runner/infrastructure trước khi workflow chạy step; rerun sau đó đã hoàn tất thành công.

## Tài liệu

Ngày 06/10/2026 đã cập nhật README và PROGRESS để ghi nhận chính thức tính năng local M3U và trạng thái production. Các commit tài liệu sau đó chỉ thay đổi tài liệu, **không thay đổi code player**.

## Nguồn Thể thao và nguồn tùy chỉnh

### Nguồn Thể thao

Nguồn chính:
`https://raw.githubusercontent.com/phuongnm7/Iptv-phuongnm7/main/sports-auto.m3u?utm_source=chatgpt.com`

Nguồn dự phòng:
`https://thethaonm7.phuongnm7-iptv.workers.dev/playlist.m3u`

Worker tự thử nguồn dự phòng khi nguồn chính lỗi.

### Thêm nguồn IPTV bằng URL

Trình duyệt dùng:
`/api/source?u=<URL_playlist>`

Worker lấy playlist ở phía máy chủ, phân tích M3U/JSON, giải quyết URL tương đối và giữ metadata stream/header/DRM khi có. Cơ chế này tiếp tục được giữ nguyên.

## Phát video

- HLS / DASH / DRM / FLV / MPEG-TS vẫn giữ các đường phát hiện tại.
- Shaka Player hiện tại: **5.2.12**.
- Các logic playback/DRM đã có trước mốc local M3U không bị thay đổi bởi tính năng mới.

## Giai đoạn test tiếp theo

Test thực tế local M3U trên:

- Chrome Android.
- Samsung TV/Tizen Web App.
- Desktop Chrome/Edge/Safari.
- Playlist M3U/M3U8 nhỏ và lớn.
- Playlist có group/logo/tvg-id.
- Playlist có header User-Agent/Referer/Origin.
- Playlist có metadata DRM/ClearKey.
- Chuyển nguồn URL ↔ tệp M3U và reload trang.

Nếu phát hiện lỗi, chỉ sửa đúng phần local M3U hoặc lỗi tái hiện cụ thể; không dùng bản thử nghiệm mới làm baseline tùy tiện.

## Quy tắc bàn giao

Không thay đổi UI/player/DRM hiện tại nếu lỗi không liên quan trực tiếp. Mọi bản sửa tiếp theo phải cô lập theo lỗi để bảo vệ mốc Android TV 1.0.69 đang dùng làm chuẩn.


## iOS DASH/ClearKey fallback — 2026-10-06

- Confirmed provider sources in the current playlist are DASH/ClearKey for SCTV17, SCTV22, On Sports, and On Sports+; there is no provider-supplied FairPlay/HLS input.
- Safari/iOS web playback cannot be enabled by changing the DASH manifest or proxying it. Inline Safari playback requires an authorized FairPlay/HLS source and provider license integration.
- Added first-party handoff buttons for On Sports → VTVprime, SCTV22 → VTVgo, and SCTV17 → the official SCTV iOS app listing. Provider login/subscription may be required.
- On Sports+ has no verified official per-channel destination yet and therefore remains explicitly without a handoff button.
- This is an iOS viewing workaround through provider platforms, not inline playback in NM7 TV. Validate each provider destination/account entitlement on a real iPhone before claiming playback success.


## YouTube gốc + AdBlock kiểu Cốc Cốc — 2026-10-06

### Nghiên cứu

- Đối chiếu trang YouTube chính thức của Cốc Cốc: Cốc Cốc công khai việc tích hợp Adblock Plus và cập nhật liên tục để xử lý cơ chế chống chặn quảng cáo của YouTube.
- Kết luận kỹ thuật: JavaScript Web của NM7 không thể trở thành lớp network blocker cho youtube.com sau khi điều hướng sang origin khác. Same-Origin Policy ngăn truy cập DOM cross-origin; iframe không giải quyết được request interception.
- Tizen 3.0 có EWK request interception, phù hợp với kiến trúc browser-layer filter.

### Đã sửa

- Xóa YouTube Web Shell/Piped/Invidious khỏi luồng người dùng.
- web-tv/youtube.js hiện chỉ điều hướng đến YouTube gốc và hỗ trợ deep-link video.
- web-tv/app.js và web-tv/app-safari-policy.js gọi cùng launcher YouTube gốc.
- Worker xóa các endpoint proxy Piped /api/youtube/*.
- Cloudflare smoke test đổi từ kiểm tra Piped stream sang kiểm tra official YouTube launcher.
- Thêm tizen-youtube-host/: native EWK WebView, URL request interception, bộ lọc ad URL bảo thủ, response 204 cho URL quảng cáo rõ ràng, JS fallback bấm Skip/xử lý overlay và manifest TV API 3.0.

### Trạng thái kiểm thử

- JavaScript launcher đã được kiểm tra cấu trúc và không còn gọi Piped API.
- Worker không còn route /api/youtube/*.
- Chưa có kết quả build/install native host trên Samsung UA49M5500 Tizen 3.0 vì môi trường hiện tại không có Samsung Tizen SDK/thiết bị ký và TV thật để chạy E2E.
- Do đó chưa tuyên bố thành công tuyệt đối đối với YouTube ad-free trên TV.

### Kiến trúc mục tiêu

NM7 TV Web → https://www.youtube.com/ → Native Tizen EWK host → request interception + page-level fallback


## Chạy nền mobile — 2026-10-06

### IPTV

- Thêm `web-tv/mobile-background.js`.
- Dùng Media Session API để đưa metadata và Play/Pause/tua vào khu vực điều khiển media của browser/OS khi browser hỗ trợ.
- Thêm nút **◩ Chạy nền** trong player mobile.
- Safari/WebKit: ưu tiên `webkitSetPresentationMode('picture-in-picture')`; browser chuẩn: dùng `requestPictureInPicture()` khi khả dụng.
- Theo dõi `visibilitychange`, `pagehide`, `pageshow` nhưng không tự phá player khi ứng dụng chuyển nền.
- Khi thiết bị/browser không có PiP, không giả vờ hỗ trợ; Media Session vẫn được duy trì nơi có thể.

### YouTube

- YouTube vẫn mở bằng trang YouTube chính thức.
- NM7 Web không thể ép `youtube.com` chạy nền trái với chính sách của YouTube bằng JavaScript cross-origin.
- Google hiện xác nhận background playback trên mobile browser là tính năng của YouTube Premium.

### Kiểm tra

- `mobile-background.js` đã thêm vào `index.html`.
- `app.js` và `app-safari-policy.js` đã đồng bộ hook nút **Chạy nền**.
- Cloudflare workflow có smoke test cho Media Session, PiP, WebKit presentation mode và visibility handling.
- Cần kiểm tra thiết bị thật: Android Chrome khóa màn hình/chuyển app; iPhone/iPad Safari PiP/chuyển app/khóa màn hình.

### Trạng thái

**Đã triển khai lớp Web cần thiết cho IPTV background playback.** Khả năng cuối cùng vẫn phụ thuộc browser/OS; YouTube gốc tuân theo giới hạn của YouTube.
## YouTube AdShield mobile — 2026-10-06

### Nguyên nhân được xác nhận

Ảnh test cho thấy quảng cáo được render bởi chính YouTube gốc trong player. NM7 Web trước đó điều hướng thẳng sang `youtube.com`, nên sau khi chuyển origin NM7 không còn kiểm soát network request của YouTube.

Bộ lọc YouTube hiện tại của uBlock xử lý cả `adPlacements`, `adSlots`, `playerAds`, `get_watch`, `youtubei/v1/player` và một số request `googlevideo.com/initplayback`; do đó bộ lọc URL nhỏ của NM7 trước đây không đủ. citeturn413338search0turn413338search2

### Đã triển khai trên nhánh Android test

- Nhánh: `fix/youtube-webview-adshield-20261006`.
- Tạo từ baseline NM7 TV 1.0.69 `build/1.0.65-logo-fit-clean`.
- Thêm `YouTubeHostActivity` dùng WebView chính thức.
- Thêm `YouTubeRequestBlocker` cho request quảng cáo rõ ràng.
- Thêm `youtube_adshield.js` bằng document-start injection; WebView 1.15.0 hỗ trợ API document-start và minSdk 23. citeturn413338search7
- Android Chrome launcher trên NM7 Web thử `nm7youtube://open?url=...` để chuyển từ browser sang host khi host đã được cài.

### CI

Các run Android gần nhất trên nhánh này fail trong khoảng 2–4 giây, không có step/log. Vì vậy chưa có APK build được xác nhận từ CI và chưa có kiểm thử Android thật.

### Kết luận

Chrome/Safari thuần không thể biến thành lớp network adblock của YouTube chỉ bằng JavaScript của NM7. Giải pháp đang thử nghiệm là browser-layer native host, gần kiến trúc của trình duyệt có adblock. Đây vẫn là WIP cho tới khi test thiết bị thật.


## Web-only YouTube diagnostic — 2026-10-06
- Mobile proxy fallback and first-party request headers updated.
- Browser-level production verification is being added to the deployment workflow.


## 2026-10-06 — YouTube mở trực tiếp origin chính thức

Qua kiểm thử Chromium thực tế, reverse-proxy Cloudflare vẫn có thể trả về HTML/skeleton của YouTube nhưng các luồng dữ liệu phía sau bị YouTube rate-limit hoặc lỗi 401/403, dẫn tới trang đứng ở trạng thái loading. Vì vậy reverse-proxy không còn là đường mặc định của người dùng.

- web-tv/youtube.js hiện mở trực tiếp https://www.youtube.com/ hoặc URL video chính thức.
- Không đổi giao diện hay tài khoản của YouTube; người dùng nhận đúng trang YouTube chính thức của trình duyệt.
- Worker nm7-youtube-proxy vẫn được giữ để chẩn đoán/thử nghiệm và chỉ proxy khi thêm ?proxy=1; không dùng làm đường mặc định.
- Đây là thay đổi để ưu tiên tính ổn định: YouTube không bị kẹt skeleton do lớp proxy trung gian.
- Chặn quảng cáo ở tầng trình duyệt vẫn cần native browser host (như EWK trên Tizen) hoặc trình duyệt có bộ lọc riêng; JavaScript của NM7 không thể biến một tab youtube.com thành adblocker network-level.
