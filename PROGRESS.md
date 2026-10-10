# NM7 TV Web — Tiến độ dự án

## Mốc hiện tại

- Ngày: **06/10/2026**
- Nhánh: `fix/youtube-original-coccoc-adblock-20261006`
- Tính năng mới nhất: **YouTube mở trực tiếp origin chính thức, không còn kẹt skeleton do reverse-proxy**
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


## 2026-10-08 — Tiếp tục từ mốc YouTube gốc

- Đã rà soát lại branch `fix/youtube-original-coccoc-adblock-20261006`.
- Xác nhận lỗi của YouTube E2E run #21 không phải do launcher: bài test cũ yêu cầu URL phải là `www.youtube.com`, trong khi YouTube mobile hợp lệ chuyển sang `https://m.youtube.com/`.
- Đã sửa workflow `.github/workflows/youtube-e2e.yml` để chấp nhận cả `www.youtube.com` và `m.youtube.com` khi xác nhận official YouTube origin.
- Không thay đổi player IPTV, DRM, UI Android 1.0.69 hoặc pipeline playlist.
- Native Tizen YouTube host vẫn ở trạng thái source scaffold; chưa có bằng chứng build/sign/E2E trên Samsung UA49M5500 Tizen 3.0 trong môi trường hiện tại.
- Lần kiểm tra tiếp theo phải chạy lại YouTube E2E sau commit sửa test; chỉ đánh dấu thành công khi workflow pass và, riêng adblock Tizen, vẫn cần build/cài/test thiết bị thật.


## 2026-10-08 — Responsive mobile layout + YouTube home shortcut

- Giữ nguyên toàn bộ baseline Android TV 1.0.69, player, DRM, playlist, remote navigation và local M3U.
- Ẩn nút **Chọn ứng dụng** (button cạnh logo YouTube) khỏi thanh đầu trang chủ trên mọi chế độ; nút YouTube gốc vẫn giữ nguyên.
- Thiết bị touch/mobile ở portrait dùng lưới **3 cột**; ở landscape dùng **4 cột**. Khoảng cách và chiều cao thẻ được giảm để tận dụng diện tích màn hình, nhưng không thay đổi thứ tự kênh.
- Native Tizen YouTube host bổ sung nút nổi **⌂ NM7** trong trang YouTube gốc và phím **Home/XF86Home/XF86HomePage** để quay thẳng về trang chủ NM7.
- Browser web thuần không thể chèn nút vào youtube.com sau khi đã chuyển origin do same-origin isolation; vì vậy shortcut một chạm trong YouTube được thực hiện ở native host. Trên mobile browser thuần, nút Home/điều hướng tab vẫn thuộc quyền kiểm soát của browser.
- Chưa đánh dấu native adblock thành công: vẫn cần build/sign và E2E trên Samsung UA49M5500 Tizen 3.0.


## 2026-10-08 — Fix D-pad scrolling trên TV/Google TV

- Xác định nguyên nhân: trang chính dùng `#homeRows` làm scroll container nhưng logic điều khiển TV chỉ đổi focus giữa các nhóm và phụ thuộc vào `scrollIntoView()`; đồng thời mọi `keydown` lặp (`e.repeat`) bị bỏ qua. Trên một số TV/Google TV browser, cách này khiến ↑↓ không cuộn trang thực tế.
- Đã bổ sung cuộn chủ động bằng `scrollTop` cho `#homeRows`, tự đưa hàng đang focus vào vùng nhìn thấy.
- Khi đang ở hàng đầu/cuối, ↑/↓ có fallback cuộn theo từng đoạn trang, nên D-pad vẫn có tác dụng ngay cả khi không còn nhóm kênh kế tiếp.
- Không bỏ qua `keydown` lặp đối với ↑↓, cho phép giữ phím để cuộn liên tục.
- Bổ sung nhận diện Android/Google TV key codes: D-pad `19/20/21/22`, OK `23/66`, Back `4`, cùng các dạng `Arrow*`/`DPAD_*`.
- Ép `#homeRows` thành scroll container riêng bằng `overflow-y: scroll` và giữ nguyên giao diện/kích thước TV hiện tại.
- Đồng bộ `web-tv/app.js` với `web-tv/app-safari-policy.js`.
- Thêm bước `node --check` cho JS TV trước Cloudflare deployment.
- Không thay đổi playlist, player, DRM, giao diện Android 1.0.69, YouTube hoặc các tính năng khác.


## 2026-10-08 — Phân tích video Google TV và sửa spatial navigation

- Đã xem trực tiếp video 223453.mp4. Lỗi thể hiện ở tầng focus/navigation: điều khiển dừng ở mép ô đang nhìn thấy, không đi được xuống hàng/nhóm bên dưới và không đi tiếp sang ô kế tiếp đúng theo bố cục 3/4 cột.
- Nguyên nhân gốc: CSS responsive đã chuyển các nhóm kênh thành CSS Grid 3/4 cột, nhưng thuật toán D-pad cũ vẫn coi mỗi group là một hàng logic và `S.col` là chỉ số tuyến tính. Vì vậy vị trí vật lý của các ô không còn tương ứng với `row/col` logic.
- Đã thay điều hướng trang chủ bằng **spatial navigation theo vị trí thật của DOM**: ↑/↓ tìm ô gần nhất theo trục dọc; ←/→ tìm ô kế tiếp theo hàng hiển thị; không còn phụ thuộc số cột cố định.
- Khi hết visual row ở đầu/cuối viewport, hệ thống vẫn cuộn `#homeRows` theo trang; khi còn visual row kế tiếp, focus chuyển trực tiếp tới ô đó và tự đưa vào vùng nhìn thấy.
- Đã bổ sung native spatial-focus fallback cho Android/Google TV: các card được để `tabindex=0`, cho phép TV browser tự di chuyển focus giữa các button khi D-pad không phát `keydown` theo chuẩn web.
- Bổ sung nhận diện Android/Google TV và trạng thái focus rõ ràng để nhìn thấy ô đang được chọn trên TV.
- `web-tv/app.js` và `web-tv/app-safari-policy.js` đã được đồng bộ.
- Kiểm tra CI: bước `node --check` cho `app.js`, `app-safari-policy.js`, `youtube.js` đã PASS trên commit trước đó. Deployment Cloudflare hiện đang **không thể hoàn tất do Cloudflare API token trong GitHub Actions trả Authentication error 10000 / Too many authentication failures 10502**; đây là lỗi credential của CI, không phải lỗi JavaScript vừa sửa.
- Không thay đổi playlist, DRM, player, UI Android 1.0.69 hay logic phát kênh.


## 2026-10-09 — Sửa phát nhóm VTV dự phòng trên iPad Web

- Đối chiếu playlist production: nhóm `VTV dự phòng` có 10 kênh; VTV2 HD, VTV3 HD, VTV4 HD, VTV5 HD, VTV7 HD và VTV8 HD chỉ có candidate DASH ClearKey. Các kênh cùng tên trong nhóm `VTV` có candidate HLS không DRM tương thích hơn với native HLS trên Safari.
- Nguyên nhân trong web: `addAppleHlsAlternatives()` chỉ tìm ứng viên thay thế trong cùng nhóm, nên không phát hiện HLS cùng tên ở nhóm `VTV`; đồng thời `startupCandidateIndex()` ưu tiên DASH ClearKey trước HLS trên iPad. `startDash()` sau đó đi thẳng tới màn hình fallback Safari và không thử được HLS tương ứng.
- Sửa `web-tv/app-safari-policy.js` và đồng bộ `web-tv/app.js`: với iPad, tìm thêm HLS không DRM từ kênh trùng tên giữa `VTV dự phòng` và `VTV`; ưu tiên HLS không DRM trước DASH ClearKey. Giữ nguyên kênh/candidate gốc và không xoá metadata hay DRM.
- Thêm regression checks trong Cloudflare deployment workflow cho cross-group HLS fallback và chính sách HLS-first trên iPad.
- Chẩn đoán production lấy được 479 kênh, trong đó 10 kênh thuộc nhóm `VTV dự phòng`. CI xác nhận deploy mới và các smoke test hiện có; cần tiếp tục xác nhận phát thực tế trên Safari/iPad để khẳng định CDN HLS đang hoạt động tại thời điểm xem.


## 2026-10-09 — Điều tra playback nhóm Thể Thao trên iPad Safari

- Đã triển khai cơ chế HLS-first và ghép candidate HLS chéo nhóm theo alias kênh chính xác (ví dụ VTV6), cùng fallback mở trang dịch vụ chính thức khi Safari không phát được DASH/ClearKey.
- Kiểm tra playlist production: nhóm `Thể Thao` hiện có 10 kênh. HTV Thể Thao có HLS; VTV6 có HLS trùng kênh ở nhóm VTV; On Sports có URL HLS cũ nhưng các endpoint đã trả 404/530 trong probe; phần lớn các kênh ON/SCTV khác chỉ có DASH ClearKey trong danh sách hiện tại.
- Kiểm tra nhiều mirror HLS cho SCTV15/17/22 và ON Sports/Football/News/Golf. Một số manifest SCTV15/17 chỉ trả `#EXTM3U` khi request có Referer SCTV Online, nhưng cùng URL qua Worker trả 404 và request không có Referer trả HTML; các mirror khác trả 403/404/502/204 rỗng hoặc DNS failure. Chưa tìm được HLS nào có thể xác nhận phát qua worker/iPad cho những kênh này.
- Đã bỏ candidate HLS SCTV15/17 chết qua proxy để tránh thử nguồn chắc chắn lỗi; giữ nguyên candidate DASH/ClearKey gốc. Không thay/xóa khóa DRM. Safari sẽ chuyển sang đường mở trang ON Plus/VTVgo/HTV chính thức được ánh xạ theo kênh khi không còn nguồn inline dùng được.
- Deploy và smoke test xác nhận code/playlist vẫn hợp lệ; **chưa xác nhận toàn bộ nhóm Thể Thao phát inline trên iPad**. Các kênh DASH/ClearKey cần nguồn HLS thực sự đang hoạt động hoặc player/platform có khả năng giải mã tương thích; không coi fallback sang trang ngoài là phát inline thành công.


## 2026-10-09 — Hiện nút menu trên iPad ngang

- Nguyên nhân: nút `#mobileMenuBtn` chỉ được bật trong media query `max-width:1024px`. Khi iPad xoay ngang và Safari dùng viewport rộng hơn 1024 CSS px, body vẫn ở `mobile-mode` nhưng nút quay về `display:none`.
- Sửa `web-tv/index.html`: thêm quy tắc `body.mobile-mode #mobileMenuBtn` trong nhánh `pointer:coarse`, luôn hiện nút ☰ cho thiết bị touch/mobile ở cả ngang và dọc, kể cả iPad ngang có viewport rộng.
- Thêm smoke check cho CSS menu ngang trong Cloudflare deploy workflow.


## 2026-10-09 — VietMiTV Merge làm mặc định 1 cho Truyền hình (chỉ NM7 Web)

- Đổi upstream mặc định 1 trong `worker.js` và `api/playlist.js` thành `https://nm7-tv-web.vercel.app/api/vietmitv-merge`.
- Chuyển nguồn truyền hình cũ `https://phuongnm7-playlist.phuongnm7-iptv.workers.dev/` xuống mặc định 2; vẫn giữ các nguồn cũ còn lại làm fallback cho truy vấn tổng hợp không chọn preset.
- `/api/playlist?source=tv&default=1` thử VietMiTV Merge trước, sau đó tự fallback về mặc định 2 nếu endpoint lỗi hoặc trả playlist rỗng. `default=2` chỉ dùng nguồn cũ.
- Web UI mặc định dùng preset 1; hộp thoại **Chỉnh sửa nguồn → Nguồn mặc định** có nút **Dùng mặc định 1** và **Dùng mặc định 2**. Cache key và schema được tách theo preset để không giữ nhầm playlist cũ.
- Đồng bộ frontend `web-tv/app.js` và `web-tv/app-safari-policy.js`; cập nhật cache-buster script trong `web-tv/index.html`. Không chỉnh repository NM7 Mobile hoặc NM7 TV Android.
- Cloudflare Deploy #426 xác nhận: preset 1 trả 359 kênh và upstream đúng URL VietMiTV Merge; preset 2 trả playlist cũ 515 kênh. Smoke tests và JavaScript syntax đều PASS. YouTube Original E2E #112 cũng PASS.
- Regression checks mới xác nhận cả hai upstream, hai route preset và lựa chọn trong UI.

- Cập nhật xác nhận cuối ngày 09/10/2026: commit `ebd9906582a815173ec570059a6d17252d37bf16` đã deploy thành công (Deploy #426) và E2E #112 thành công. Phạm vi chỉ là NM7 TV Web.


## 2026-10-09 — Chốt NM7 TV Web stable baseline

- Tạo nhánh `stable/nm7-tv-web-2026-10-09` làm nền chuẩn cho các lần phát triển tiếp theo.
- Commit production dùng để chốt mốc: `52a51a8447735259db92f33cf5a67748cdf94c40`.
- Bằng chứng: Cloudflare Deploy #428 = SUCCESS; YouTube Original E2E #114 = SUCCESS.
- Tạo `STABLE_BASELINE.md` và cập nhật `README.md` nêu quy tắc: các branch feature/fix sau này phải được tạo từ nhánh stable này; không dựa vào NM7 Mobile/NM7 TV Android hay baseline cũ khác.
- Không thay đổi mã ứng dụng trong đợt chốt stable này; chỉ thêm tài liệu. Tất cả thay đổi tính năng tiếp theo phải làm ở branch mới, không sửa trực tiếp nhánh stable.
- Phạm vi: riêng repository `phuongnm7/nm7-tv-web`.


## 2026-10-09 — VTV1 lấy nguồn trực tiếp từ playlist mặc định 1

### Thay đổi mã nguồn

- Nhánh: `fix/vtv1-single-source-hide-default-urls-20261009`.
- Trong `worker.js` đã xóa ba URL VTV1 hardcode: hai URL FPT và URL VTVGo; xóa luôn logic tự chèn các URL đó và logic ép chọn VTVGo/ứng viên thứ ba.
- Worker không còn tự thay nguồn VTV1 bằng URL VTVGo. Kênh VTV1 giữ các ứng viên do playlist Mặc định 1 trả về.
- Giữ nguyên upstream Mặc định 1: `https://nm7-tv-web.vercel.app/api/vietmitv-merge`; không thay URL mặc định toàn playlist.
- Tăng cache schema lên `20261009-vietmitv-defaults-2` và cập nhật version tham chiếu script để tránh cache danh sách kênh cũ.
- Không sửa NM7 Mobile/Android, không đổi nguồn thể thao, không deploy dedicated YouTube reverse proxy trên nhánh này.

### Triển khai

- Production Cloudflare: `https://nm7-tv-web.phuongnm7-iptv.workers.dev/`.
- Cloudflare Deploy #435: **SUCCESS** — [workflow run](https://github.com/phuongnm7/nm7-tv-web/actions/runs/37931847498).
- JavaScript syntax check: **SUCCESS**.
- Deploy to Cloudflare Workers: **SUCCESS**.
- Smoke test YouTube redirect/ad guard: **SUCCESS**.
- Smoke test deployed Cloudflare Worker: **SUCCESS**.
- Dedicated YouTube reverse proxy: **SKIPPED** theo điều kiện của nhánh, tránh tác động dịch vụ không liên quan.
- Kiểm tra mã nguồn xác nhận URL VTVGo và danh sách VTV1 hardcode đã bị loại khỏi Worker.

### Lưu ý kiểm thử

Smoke test không xác minh được video VTV1 phát xuyên suốt trên TV thật. Cần kiểm tra trực tiếp trên NM7 TV Web sau khi tải lại trang. Nếu vẫn không phát, bước tiếp theo là kiểm tra ứng viên VTV1 thực tế trong JSON của API Mặc định 1 và phản hồi HLS của chính URL đó; không tự chèn lại nguồn ngoài playlist.


## 2026-10-10 — Tự chọn nguồn mặc định theo nền tảng trình duyệt

### Yêu cầu

- Android: trang chủ tự mở **Nguồn mặc định 2**.
- iOS/iPadOS: trang chủ tự mở **Nguồn mặc định 1**.
- Không tác động NM7 Mobile, NM7 TV Android, Worker, danh sách nguồn, hay các nhánh/phiên bản production khác.

### Cách triển khai

- Nhánh riêng: `feat/auto-device-tv-preset-android-ios-20261010`, tạo từ `stable/nm7-tv-web-2026-10-09`; không sửa trực tiếp nhánh stable.
- Phát hiện Android bằng User-Agent và `navigator.userAgentData.platform` khi có.
- Phát hiện iPhone/iPad/iPod bằng User-Agent/platform; hỗ trợ iPadOS dùng desktop website bằng `navigator.platform === 'MacIntel'` và `navigator.maxTouchPoints > 1`.
- Gán preset ngay khi khởi tạo state, trước khi đọc local cache; như vậy cache key và danh sách ban đầu cũng dùng đúng preset của thiết bị.
- Startup truyền preset đã nhận diện vào loader. Việc đổi nguồn thủ công trong hộp thoại vẫn giữ nguyên; khi chuyển sang Thể thao rồi quay lại Truyền hình, menu tiếp tục dùng preset hiện tại thay vì ép về 1.
- Nếu không nhận diện được Android/iOS (desktop, Tizen TV hoặc thiết bị khác), giữ hành vi mặc định 1 hiện tại.
- Nếu API preset 2 lỗi và chưa có cache preset 2, báo lỗi rõ ràng thay vì âm thầm nạp playlist preset 1; vẫn giữ cache/playlist hiện có nếu đã có.
- Áp dụng cùng logic cho `web-tv/app-safari-policy.js` và `web-tv/app.js`; tăng cache-buster trong `web-tv/index.html` để tránh trình duyệt dùng script cũ. Không thay URL mặc định, logic API/Worker, player hoặc DRM.

### Kiểm thử tự động

- Thêm `scripts/test-device-default-preset.js` với các trường hợp Android User-Agent, Android Client Hints, iPhone, iPad, iPadOS desktop mode, desktop và Samsung Tizen TV.
- Cập nhật `.github/workflows/web-browser-validation.yml` để kiểm tra cú pháp cả hai file player và chạy test preset.
- Nhánh tính năng không nằm trong danh sách nhánh của Cloudflare production deploy; thay đổi này không tự triển khai lên dịch vụ đang chạy.
- Kiểm thử GitHub Actions `Web Browser Validation` đã **PASS**: [run #286](https://github.com/phuongnm7/nm7-tv-web/actions/runs/38005309930). Node syntax checks đều đạt; regression test xác nhận 7 trường hợp trên mỗi file player (Android UA, Android Client Hints, iPhone, iPad, iPadOS desktop mode, desktop và Samsung Tizen), giữ preset khi quay lại Truyền hình, trạng thái lỗi preset 2 và cache-buster của script đang được trang sử dụng.
- Không chạy Cloudflare production deploy. Nhánh tính năng không nằm trong danh sách deploy; nhánh stable, Worker đang chạy và các repository NM7 khác không bị thay đổi.


## Cloudflare isolated device-preset test (2026-10-10)
- Added `wrangler.device-test.toml` with Worker name `nm7-tv-web-device-test`; it reuses the existing `worker.js`, `web-tv` assets, and `phuongnm7-playlist` service binding.
- Added `.github/workflows/cloudflare-device-test.yml`. It deploys only the isolated test Worker and checks both TV playlist endpoints. It does not run `wrangler.toml` and does not deploy the production Worker `nm7-tv-web`.
- Test branch: `test/cloudflare-device-preset-20261010`. Production app source and production deployment workflow are unchanged by this test-specific commit.

- 2026-10-10: Updated isolated device detection so Windows desktop browsers open TV preset 2; added regression coverage and cache-buster update. Android remains preset 2; iOS/iPadOS remains preset 1. Production Worker unchanged.

## 2026-10-10 — Cập nhật device preset và triển khai production

### Quy tắc preset theo thiết bị

- **Android:** tự mở Nguồn mặc định 2.
- **Windows:** tự mở Nguồn mặc định 2.
- **iPhone/iPad/iPod:** tự mở Nguồn mặc định 1; nhận diện cả iPadOS bật chế độ desktop bằng `MacIntel` và `maxTouchPoints > 1`.
- **macOS, Samsung Tizen TV và thiết bị khác/không nhận diện:** giữ Nguồn mặc định 1.
- Người dùng vẫn được đổi preset thủ công; lựa chọn hiện tại được giữ khi chuyển giữa Truyền hình và Thể thao.
- Nhận diện preset xảy ra trước khi đọc cache. Nếu preset 2 lỗi và không có cache phù hợp, báo lỗi rõ ràng thay vì âm thầm dùng playlist preset 1.
- Đồng bộ logic ở `web-tv/app.js` và `web-tv/app-safari-policy.js`; cập nhật cache-buster ở `web-tv/index.html`.
- Regression test bao phủ Android UA/Client Hints, Windows, iPhone, iPad, iPadOS desktop mode, macOS/desktop và Samsung Tizen.

### Merge và production deploy

- Đã merge thay đổi tính năng vào nhánh ổn định `stable/nm7-tv-web-2026-10-09` qua [PR #18](https://github.com/phuongnm7/nm7-tv-web/pull/18).
- Đã cập nhật `README.md` ghi rõ quy tắc theo thiết bị, phạm vi thay đổi và kết quả deploy.
- Đã thêm nhánh stable vào trigger push của `.github/workflows/cloudflare-deploy.yml` để cập nhật production từ nhánh ổn định.
- Commit kích hoạt deploy: `b018f28dd163d75f2c8a46ff990532bdcdea05ec`.
- **Cloudflare Deploy #438: SUCCESS** — [GitHub Actions run](https://github.com/phuongnm7/nm7-tv-web/actions/runs/38010319718).
- Các bước đều PASS: JavaScript syntax check, deploy Cloudflare Worker, deploy dedicated YouTube reverse proxy, YouTube redirect/ad-guard smoke test và production Worker smoke test.
- Phạm vi chỉ là repository `phuongnm7/nm7-tv-web`. Không sửa NM7 Mobile hoặc NM7 TV Android; không thay URL nguồn, API playlist, player hoặc DRM trong thay đổi preset này.
