# NM7 TV Web 1.0.69

Phiên bản Web của NM7 TV được xây dựng theo giao diện và hành vi của bản Android TV **1.0.69**.

## Stable baseline hiện tại — 09/10/2026

- Nhánh gốc ổn định cho các bản kế tiếp: `stable/nm7-tv-web-2026-10-09`.
- Commit production đã xác minh: `52a51a8447735259db92f33cf5a67748cdf94c40` (Deploy #428 PASS; YouTube Original E2E #114 PASS).
- Tài liệu chuẩn: [`STABLE_BASELINE.md`](STABLE_BASELINE.md).
- **Các bản web kế tiếp phải tạo branch feature/fix từ nhánh stable này** và giữ nguyên các tính năng hiện có, trừ phần được yêu cầu thay đổi.
- Chỉ áp dụng cho `phuongnm7/nm7-tv-web`; không áp dụng cho NM7 Mobile hoặc NM7 TV Android.

## Mốc hiện tại

- Ngày cập nhật: **10/10/2026**
- Nhánh ổn định: `stable/nm7-tv-web-2026-10-09`
- Cập nhật mới nhất: **tự chọn Nguồn mặc định theo hệ điều hành trình duyệt; production Cloudflare Deploy #438 đã PASS**
- Cloudflare Worker: `https://nm7-tv-web.phuongnm7-iptv.workers.dev/`
- Nơi triển khai: **Cloudflare Workers**
- Chuẩn giao diện TV: Android TV NM7 1.0.69
- Các chức năng/player/DRM hiện tại được giữ nguyên; local M3U là phần bổ sung riêng.


## Tự chọn nguồn mặc định theo thiết bị — 10/10/2026

- Trình duyệt trên Android tự mở trang chủ bằng **Nguồn mặc định 2**.
- Trình duyệt trên Windows tự mở bằng **Nguồn mặc định 2**.
- Trình duyệt trên iPhone/iPad/iPod tự mở bằng **Nguồn mặc định 1**; iPadOS bật chế độ “Yêu cầu trang web cho máy tính” cũng được nhận diện qua `MacIntel` + cảm ứng đa điểm.
- macOS, Samsung Tizen TV và thiết bị khác/không nhận diện được tiếp tục dùng **Nguồn mặc định 1**.
- Việc nhận diện diễn ra trước khi đọc cache để tránh hiển thị tạm danh sách của preset 1 trên Android. Người dùng vẫn có thể đổi preset thủ công trong hộp thoại **Nguồn mặc định**; khi quay lại Truyền hình từ nhóm Thể thao, lựa chọn hiện tại được giữ nguyên.
- Nếu API của preset 2 lỗi và không có cache preset 2 để dùng, trang báo lỗi nguồn mặc định 2 thay vì âm thầm nạp preset 1; tránh lưu nhầm dữ liệu vào cache của preset khác.
- Logic được áp dụng cho cả `web-tv/app-safari-policy.js` (entrypoint của trang hiện tại) và `web-tv/app.js`. Đã tăng cache-buster trong `index.html` để trình duyệt lấy script mới. Regression tests bao gồm Android UA/Client Hints, iPhone, iPad, iPadOS desktop mode, desktop, Samsung Tizen, preset khi điều hướng và trạng thái lỗi.
- Đã gộp vào nhánh ổn định qua [PR #18](https://github.com/phuongnm7/nm7-tv-web/pull/18); commit tính năng ban đầu `f95e80d3b8c759116d3700de5daa1a6f5f5b2d04`.
- Cập nhật `.github/workflows/cloudflare-deploy.yml` để nhánh stable kích hoạt triển khai production. Commit kích hoạt deploy: `b018f28dd163d75f2c8a46ff990532bdcdea05ec`.
- **Production Cloudflare Deploy #438: SUCCESS** — [workflow run](https://github.com/phuongnm7/nm7-tv-web/actions/runs/38010319718). Syntax check, deploy Worker, deploy YouTube reverse proxy, YouTube smoke test và production Worker smoke test đều PASS.
- Phạm vi chỉ là `phuongnm7/nm7-tv-web`; không sửa NM7 Mobile hoặc NM7 TV Android.


## YouTube gốc + AdBlock kiểu trình duyệt

Mốc này không dùng Invidious, Piped hoặc YouTube Web Shell nữa.

- Nút/menu YouTube trên mobile và web mở trực tiếp trang YouTube chính thức: https://www.youtube.com/. Bản web thường không tự cung cấp network-level AdBlock cho origin youtube.com.
- Web launcher chỉ làm nhiệm vụ điều hướng; không giả lập giao diện YouTube và không thay thế tài khoản/đăng nhập YouTube.
- Chặn quảng cáo kiểu trình duyệt không thể thực hiện đầy đủ bằng JavaScript của trang NM7 khi YouTube là origin khác. Vì vậy bộ chặn được chuyển lên native host WebView cho Samsung Tizen.
- Thư mục tizen-youtube-host/ chứa scaffold native EWK: intercept request trước khi gửi mạng, trả 204 cho các URL quảng cáo rõ ràng, và inject page-level fallback để bấm Skip/tua quảng cáo khi quảng cáo vẫn lọt qua.
- Kiến trúc này tương tự mô hình mà Cốc Cốc công khai: YouTube vẫn là YouTube gốc, còn lớp lọc nằm ở tầng trình duyệt. Cốc Cốc cho biết họ tích hợp Adblock Plus và liên tục cập nhật để xử lý anti-adblock của YouTube.
- Đây không phải mã Adblock Plus/Cốc Cốc nguyên bản và hiện chưa phải ABP core hoàn chỉnh; rule set trong native host là bộ lọc bảo thủ để không làm hỏng media CDN.

### Quan trọng với Samsung UA49M5500 / Tizen 3.0

Bản Web chạy trực tiếp trên trình duyệt TV không thể tự biến thành trình duyệt có network interception. Muốn có YouTube gốc + chặn quảng cáo ở tầng request cần chạy NM7 bên trong native Tizen host có EWK WebView.

Native host dùng các API EWK request interception và script injection tương ứng với Tizen 3.0.

### Trạng thái

- Đã đổi launcher sang YouTube gốc.
- Đã bỏ dependency Piped/Invidious khỏi Worker và frontend.
- Đã thêm native host source scaffold.
- Chưa thể tuyên bố chặn quảng cáo thành công trên UA49M5500 cho tới khi source native được build/sign và cài thử trên TV thật. Tizen SDK/firmware của thiết bị không có trong môi trường build hiện tại.
## Chạy nền trên mobile

### IPTV

- Player HTML5 hiện giữ media element khi trang chuyển sang nền thay vì tự đóng player.
- Thêm nút **◩ Chạy nền** trong bộ điều khiển mobile.
- Trên Safari iPhone/iPad, nút này dùng Picture-in-Picture theo API WebKit khi capability thực sự có; Apple mô tả PiP là cơ chế để video tiếp tục hiển thị khi người dùng chuyển sang ứng dụng khác.
- Trên Android Chrome và các browser hỗ trợ Media Session, NM7 đăng ký metadata và điều khiển Play/Pause, tua ±10/30 giây và next/previous nơi browser cung cấp lock-screen/media controls.
- Khi quay lại ứng dụng/trang, trạng thái media session được đồng bộ lại.

### YouTube gốc

- NM7 vẫn mở **YouTube chính thức** để giữ nguyên giao diện/chức năng gốc.
- NM7 không thể ép YouTube gốc phát nền từ JavaScript của website sau khi chuyển sang origin youtube.com.
- Google hiện quy định background playback trên mobile web là quyền của YouTube Premium; vì vậy phần này không được ghi nhận là đã bypass giới hạn YouTube. citeturn130962search0
- PiP/background của YouTube sẽ theo khả năng và chính sách của YouTube/browser. Đối với mobile browser, NM7 chỉ có thể giữ launcher/host ở đúng tầng mà nền tảng cho phép.

### Giới hạn

- PiP cần user gesture; browser có thể từ chối trong một số container. Đặc biệt, iOS/iPadOS Home Screen PWA có giới hạn PiP riêng đã được WebKit ghi nhận, trong khi Safari thông thường hỗ trợ PiP. citeturn839350search1turn839350search2
- Không có API web chuẩn nào cho phép NM7 ép một tab YouTube khác origin tiếp tục phát nền trái với chính sách của YouTube.
## Giao diện TV

- Giữ hình nền và phong cách thẻ kênh theo Android TV 1.0.69.
- Các nhóm ưu tiên: VTV, VTVcab, Thể Thao, SCTV khi có trong playlist.
- Thẻ kênh dùng nút HTML có thể focus và cơ chế `roving tabindex`, giúp điều hướng bằng bàn phím trình duyệt và điều khiển Samsung TV thống nhất.
- LEFT tại vị trí đầu danh sách có thể mở menu bên.
- UP/DOWN chuyển nhóm; LEFT/RIGHT chuyển kênh trong nhóm.
- OK mở phát kênh.
- Trình phát hỗ trợ Back, bộ điều khiển, tua và chuyển kênh.
- Giao diện TV lấy Android TV NM7 1.0.69 làm chuẩn tham chiếu.

## Giao diện điện thoại / responsive

- Điện thoại dùng cuộn dọc tự nhiên của trình duyệt.
- Các thẻ kênh chuyển sang lưới responsive trên màn hình nhỏ.
- Gesture cảm ứng chỉ được xử lý trong khu vực trình phát.
- Trong trình phát: vuốt trái/phải để tua, vuốt lên/xuống để chuyển kênh, chạm để hiện bộ điều khiển.
- Menu điện thoại và xử lý Back hai bước vẫn được giữ.
- Điều hướng remote/bàn phím TV được giữ nguyên.

## Quản lý nguồn

### Nguồn Truyền hình

- **Mặc định 1:** `https://nm7-tv-web.vercel.app/api/vietmitv-merge`
- **Mặc định 2 (nguồn cũ):** `https://phuongnm7-playlist.phuongnm7-iptv.workers.dev/`
- Khi mở mục **Truyền hình**, NM7 TV Web dùng Mặc định 1. Worker tự thử Mặc định 2 nếu Mặc định 1 lỗi hoặc playlist rỗng.
- Mở **Chỉnh sửa nguồn → Nguồn mặc định** để chọn thủ công **Dùng mặc định 1** hoặc **Dùng mặc định 2**, hoặc tải lại nguồn đang chọn.
- Đã xác minh qua Cloudflare Worker ngày 09/10/2026: Mặc định 1 trả 359 kênh từ đúng endpoint VietMiTV Merge; Mặc định 2 vẫn trả playlist cũ 515 kênh. Cloudflare Deploy #426 và YouTube Original E2E #112 đều PASS trên commit `ebd9906582a815173ec570059a6d17252d37bf16`. Cấu hình này chỉ áp dụng cho repository **NM7 TV Web**, không áp dụng cho NM7 Mobile hay NM7 TV Android.

### Nguồn Thể thao

Worker ưu tiên:
`https://raw.githubusercontent.com/phuongnm7/Iptv-phuongnm7/main/sports-auto.m3u?utm_source=chatgpt.com`

Nếu nguồn chính lỗi, Worker dùng:
`https://thethaonm7.phuongnm7-iptv.workers.dev/playlist.m3u`

### Thêm nguồn IPTV bằng URL

Trình duyệt dùng API cùng miền:

`/api/source?u=<URL_playlist>`

Worker lấy playlist, kiểm tra HTTP status, phân tích M3U/JSON, giải quyết URL tương đối và giữ metadata stream/header/DRM khi có. Cơ chế này tiếp tục được giữ nguyên.

### Thêm nguồn IPTV bằng tệp M3U/M3U8

Trong hộp thoại **Thêm nguồn IPTV** có nút **📁 Chọn tệp M3U**.

- Hỗ trợ `.m3u` và `.m3u8`.
- Đọc trực tiếp bằng File API của trình duyệt.
- **Không upload tệp lên máy chủ.**
- Giới hạn kích thước: **20 MB**.
- Tái sử dụng parser M3U hiện có, vì vậy metadata như `tvg-id`, `tvg-logo`, `group-title` và thông tin header/DRM được giữ khi có.
- Tên tệp được hiển thị là nguồn hiện tại trong phiên.
- Chọn tệp thành công sẽ tự đóng hộp thoại và nạp danh sách qua pipeline hiện tại.
- Remote TV trong hộp thoại hỗ trợ **LEFT/UP**, **RIGHT/DOWN** và **OK**.
- Khi reload nguồn trong cùng phiên, playlist cục bộ được áp dụng lại từ nội dung đã đọc.

Tính năng được triển khai đồng nhất trong `web-tv/app.js` và `web-tv/app-safari-policy.js`.

## Phát video

- HLS: HLS native khi phù hợp; Hls.js trên trình duyệt Chromium/MSE.
- MPEG-TS/FLV: mpegts.js hoặc đường FLV MSE khi trình duyệt hỗ trợ.
- DASH: Shaka Player **5.2.12**.
- ClearKey / Widevine / PlayReady dùng đường EME của trình duyệt khi thiết bị cung cấp key system tương ứng.
- URL wrapper HTTP chưa biết định dạng được probe trước khi chọn engine.
- `/api/stream` có thể rewrite playlist HLS và BaseURL/segment DASH qua same-origin proxy, đồng thời giữ metadata header.
- `/api/license` xử lý chuyển tiếp yêu cầu license DRM.
- ON Football tiếp tục dùng các nguồn DASH SeeNow và ClearKey đã chốt trong Worker/playlist.

## Bảo toàn bản hiện tại

Mốc local M3U **không thay đổi**:

- UI Android TV 1.0.69.
- Player và các control hiện có.
- Logic DRM/playback.
- Danh sách và thứ tự nhóm playlist mặc định.
- Endpoint Thể thao.
- API `/api/source`.

Chỉ thêm phần đọc và áp dụng tệp M3U cục bộ.

## Giới hạn của trình duyệt Samsung

Bản Web dùng Arrow/Enter/Back làm lớp điều khiển remote TV portable. Các phím media/chuyên dụng chỉ được dùng khi trình duyệt thực sự cung cấp sự kiện tương ứng.

## Kiểm thử và production

- Commit code triển khai `a36b3c0e798fdfc08d3584524ac00f1dc28f07a2` đã **deploy Cloudflare thành công**.
- GitHub Actions run **#250 attempt 2: SUCCESS**.
- Checkout: **SUCCESS**.
- Deploy to Cloudflare Workers: **SUCCESS**.
- Production smoke test: **SUCCESS**.
- Smoke test đã xác nhận HTML/background 1.0.69, playlist Android 1.0.69, playlist Thể thao, custom source và các marker Shaka/Safari DRM hiện có.
- Code local M3U đã được kiểm tra syntax và marker; `app.js` và `app-safari-policy.js` đồng nhất.

## Test thực tế tiếp theo

- Chrome Android: chọn tệp M3U/M3U8 và kiểm tra danh sách.
- Samsung TV/Tizen Web App: mở **Thêm nguồn IPTV**, focus nút **Chọn tệp M3U**, OK và kiểm tra điều hướng.
- Playlist có logo/group/tvg-id.
- Playlist có User-Agent/Referer/Origin.
- Playlist có metadata DRM/ClearKey.
- Chuyển giữa nguồn URL và nguồn tệp.
- Reload trang trong cùng phiên và kiểm tra source state.
- HLS, DASH/DRM, FLV và MPEG-TS sau khi nhập playlist.

## Nguyên tắc phát triển tiếp theo

Chỉ sửa phần có lỗi tái hiện rõ. Không thay đổi UI/player/DRM nếu lỗi không liên quan trực tiếp đến phần cần sửa. Mọi bản sửa tiếp theo phải cô lập để bảo vệ Android TV 1.0.69 làm chuẩn.

## 2026-10-06 — YouTube AdShield mobile: nguyên nhân đã xác định

Ảnh test mobile cho thấy quảng cáo đang được YouTube chèn và render trong player của YouTube gốc. Luồng cũ của NM7 chỉ thực hiện `location.href` sang `youtube.com`; sau khi đổi origin, JavaScript của NM7 không còn là lớp kiểm soát request của YouTube.

uBlock hiện phải xử lý cả player-response (`adPlacements`, `adSlots`, `playerAds`) và request media quảng cáo; vì vậy danh sách vài domain quảng cáo không đủ để xử lý ổn định. citeturn413338search0turn413338search2

### Hướng xử lý mới

- Android mobile: launcher NM7 thử handoff `nm7youtube://open?url=...` sang native host; nếu không có host thì quay về YouTube gốc.
- Native host được tạo riêng từ baseline NM7 TV 1.0.69, giữ YouTube là giao diện chính thức.
- Host dùng `shouldInterceptRequest()` cho URL quảng cáo rõ ràng và `WebViewCompat.addDocumentStartJavaScript()` để xử lý player response sớm. Android WebView chính thức hỗ trợ cả request interception và document-start injection. citeturn413338search7
- `youtube_adshield.js` xử lý `fetch`, `JSON.parse`, player response và DOM ad/skip; các rule được đối chiếu với bộ lọc YouTube cập nhật tháng 09/2026. citeturn413338search0

### Trạng thái

Đây chưa phải bản đã xác nhận 100% trên điện thoại thật. APK native host đang chờ một GitHub Actions runner hoạt động bình thường để build; các run vừa qua dừng lỗi rất sớm và không có log step. Không đánh dấu thành công cho tới khi cài APK lên Android và kiểm tra quảng cáo thực tế.


## 2026-10-06 — YouTube mở trực tiếp origin chính thức

Qua kiểm thử Chromium thực tế, reverse-proxy Cloudflare vẫn có thể trả về HTML/skeleton của YouTube nhưng các luồng dữ liệu phía sau bị YouTube rate-limit hoặc lỗi 401/403, dẫn tới trang đứng ở trạng thái loading. Vì vậy reverse-proxy không còn là đường mặc định của người dùng.

- web-tv/youtube.js hiện mở trực tiếp https://www.youtube.com/ hoặc URL video chính thức.
- Không đổi giao diện hay tài khoản của YouTube; người dùng nhận đúng trang YouTube chính thức của trình duyệt.
- Worker nm7-youtube-proxy vẫn được giữ để chẩn đoán/thử nghiệm và chỉ proxy khi thêm ?proxy=1; không dùng làm đường mặc định.
- Đây là thay đổi để ưu tiên tính ổn định: YouTube không bị kẹt skeleton do lớp proxy trung gian.
- Chặn quảng cáo ở tầng trình duyệt vẫn cần native browser host (như EWK trên Tizen) hoặc trình duyệt có bộ lọc riêng; JavaScript của NM7 không thể biến một tab youtube.com thành adblocker network-level.


## 2026-10-08 — Responsive mobile layout + YouTube home shortcut

- Giữ nguyên toàn bộ baseline Android TV 1.0.69, player, DRM, playlist, remote navigation và local M3U.
- Ẩn nút **Chọn ứng dụng** (button cạnh logo YouTube) khỏi thanh đầu trang chủ trên mọi chế độ; nút YouTube gốc vẫn giữ nguyên.
- Thiết bị touch/mobile ở portrait dùng lưới **3 cột**; ở landscape dùng **4 cột**. Khoảng cách và chiều cao thẻ được giảm để tận dụng diện tích màn hình, nhưng không thay đổi thứ tự kênh.
- Native Tizen YouTube host bổ sung nút nổi **⌂ NM7** trong trang YouTube gốc và phím **Home/XF86Home/XF86HomePage** để quay thẳng về trang chủ NM7.
- Browser web thuần không thể chèn nút vào youtube.com sau khi đã chuyển origin do same-origin isolation; vì vậy shortcut một chạm trong YouTube được thực hiện ở native host. Trên mobile browser thuần, nút Home/điều hướng tab vẫn thuộc quyền kiểm soát của browser.
- Chưa đánh dấu native adblock thành công: vẫn cần build/sign và E2E trên Samsung UA49M5500 Tizen 3.0.


## 2026-10-09 — VTV1 dùng nguồn từ playlist mặc định 1

### Yêu cầu và nguyên nhân

- VTV1 trên NM7 TV Web chỉ phát được khi app thử nhiều ứng viên; hai URL FPT được chèn thêm trong Worker không phát được ở lần kiểm tra của người dùng, còn URL VTVGo được chọn cuối cùng cũng không phát được.
- Lỗi nằm ở logic riêng trong Worker: `BUILTIN.vtv1hd` tự bổ sung ba URL VTV1 không lấy từ playlist mặc định, sau đó nhánh xử lý Mặc định 1 ép chọn URL VTVGo (hoặc ứng viên thứ ba).
- Cách làm đó khiến luồng VTV1 thực tế khác với URL do playlist mặc định 1 cung cấp.

### Thay đổi đã triển khai

- Xóa danh sách nguồn VTV1 hardcode khỏi `worker.js`, gồm hai URL FPT và URL VTVGo.
- Xóa mapping tự động chèn `BUILTIN.vtv1hd` cho kênh VTV1.
- Xóa nhánh ép chọn URL VTVGo/ứng viên thứ ba cho VTV1 khi tải Mặc định 1.
- VTV1 giờ giữ các ứng viên có sẵn trong playlist từ nguồn mặc định 1; Worker không tự thay URL bằng nguồn VTVGo hoặc hai URL FPT đã bị loại bỏ.
- Tăng `CACHE_SCHEMA` từ `20261009-vietmitv-defaults-1` lên `20261009-vietmitv-defaults-2` và đổi query version của `app-safari-policy.js` để trình duyệt tải script mới, tránh dùng cache danh sách kênh cũ.
- Giữ nguyên URL Mặc định 1: `https://nm7-tv-web.vercel.app/api/vietmitv-merge`.
- Giữ nguyên URL Mặc định 2, nguồn thể thao, các built-in của VTVCab, player, giao diện 1.0.69 và logic DRM không liên quan.
- Phạm vi chỉ là repository **NM7 TV Web**. Không áp dụng cho NM7 Mobile hoặc NM7 TV Android.

### Triển khai và xác minh

- Nhánh sửa: `fix/vtv1-single-source-hide-default-urls-20261009`.
- Cloudflare production: `https://nm7-tv-web.phuongnm7-iptv.workers.dev/`.
- GitHub Actions Cloudflare Deploy **#435 — SUCCESS**: [xem workflow](https://github.com/phuongnm7/nm7-tv-web/actions/runs/37931847498).
- Các bước JavaScript syntax check, Cloudflare deploy và smoke test Worker đều thành công.
- Bước deploy dedicated YouTube reverse proxy được **skip có chủ đích** trên nhánh này; không triển khai thay đổi sang Worker YouTube riêng.
- Đã xác nhận trong mã nguồn sau sửa không còn URL VTVGo nói trên, không còn danh sách VTV1 hardcode và không còn nhánh ép chọn ứng viên thứ ba.
- **Giới hạn xác minh:** smoke test xác nhận deploy và API tổng thể, không tự chứng minh VTV1 phát thành công trên TV thật. Cần kiểm tra phát lại trên thiết bị để xác nhận URL ứng viên hiện có trong playlist mặc định 1 còn hoạt động.

### URL cần phân biệt

- Trang NM7 TV Web production: `https://nm7-tv-web.phuongnm7-iptv.workers.dev/`
- API playlist Mặc định 1: `https://nm7-tv-web.phuongnm7-iptv.workers.dev/api/playlist?source=tv&default=1`
- Nguồn upstream Mặc định 1: `https://nm7-tv-web.vercel.app/api/vietmitv-merge` (đây là URL playlist, không phải URL luồng video riêng của VTV1).


### Device-based TV preset defaults (isolated Cloudflare test)
- Android browsers: TV preset 2.
- Windows browsers: TV preset 2.
- iPhone/iPad and macOS desktop browsers: TV preset 1.
- Samsung Tizen TV and other platforms: TV preset 1.
- This change is deployed only to the isolated Worker `nm7-tv-web-device-test`; it does not change the production Worker.


## 2026-10-10 — Sửa lỗi proxy HLS của SCTV4K và chẩn đoán kênh quốc tế (đã deploy)

### Kết quả chẩn đoán SCTV4K

- GitHub Actions kiểm tra ba playlist Worker production: Mặc định 1, Mặc định 2 và Thể thao. SCTV4K có một ứng viên HLS tại nguồn vietanhtv.id.vn; manifest gốc trả HTTP 200.
- URL phân đoạn video con có đuôi .ts trả lỗi HTTP 400 khi tải trực tiếp; qua Worker proxy có lúc trả HTTP 200 nhưng upstream gán sai Content-Type application/vnd.apple.mpegurl.
- Nguyên nhân trong proxy: Worker cũ chỉ nhìn Content-Type để nhận diện HLS, nên có thể đọc dữ liệu nhị phân MPEG-TS như văn bản M3U và viết lại nội dung phân đoạn. Manifest trông hợp lệ nhưng byte video đã bị thay đổi, dẫn tới màn hình đen.
- Bản sửa cô lập trong worker.js ưu tiên nhận diện các loại tài nguyên theo phần mở rộng (.ts, .m2ts, .m4s, .mp4, audio/video phụ trợ); các media segment được truyền nguyên dạng nhị phân và gán MIME tương ứng. Chỉ manifest HLS/DASH mới đi qua bước viết lại URL.
- Regression test scripts/test-worker-hls-segments.js kiểm tra cả trường hợp segment TS bị upstream gán nhầm MIME và trường hợp manifest HLS thật vẫn phải viết lại URL segment qua same-origin proxy.

### Sửa fallback trong player

- Không coi loadedmetadata, canplay, Shaka load() hoặc DASH STREAM_INITIALIZED là bằng chứng video đang phát; player chỉ ẩn trạng thái khởi động sau sự kiện playing/đã có tiến trình video.
- Startup watchdog được sửa để thử đường dự phòng nếu trạng thái “Đang mở” vẫn còn, kể cả khi readyState đã đạt mức tối thiểu nhưng chưa phát thật.
- Khi HLS native thất bại, chuyển sang proxy đúng một lần và timeout proxy cũng kiểm tra trạng thái chờ thay vì chỉ kiểm tra paused/readyState.
- Sửa các chuỗi xuống dòng bị escape hai lần khiến UI hiển thị ký tự \\n thay vì xuống dòng; khi hết nguồn, thông báo có thêm lý do lỗi ngắn để dễ chẩn đoán mà không in URL/token.

### DAZN PPV FHD

- Trong lần kiểm tra production, API playlist tv&default=1, tv&default=2 và sport lần lượt trả 255, 551 và 739 kênh; không thấy kênh mang tên DAZN trong các tập dữ liệu đó.
- Vì vậy chưa thể xác nhận nguồn |UK| DAZN PPV FHD trong ảnh có cùng URL với các playlist mặc định. Có thể đây là nguồn M3U nhập riêng hoặc nguồn khác. Không tự ý thay URL hoặc chèn ứng viên chưa xác minh; cần URL/entry M3U thực tế để kết luận nguyên nhân của kênh này.

### Kiểm thử và phạm vi

- GitHub Actions Web Browser Validation #303 PASS, gồm kiểm tra cú pháp, test chọn preset, fallback player và kiểm tra proxy bảo toàn bytes của segment.
- Đã merge PR #19 vào nhánh `stable/nm7-tv-web-2026-10-09`, commit `034de12128fba712cb51af388c491ed434c0ae33`.
- Cloudflare Deploy #442: **SUCCESS** — https://github.com/phuongnm7/nm7-tv-web/actions/runs/38021648048. JavaScript syntax, deploy Worker, deploy YouTube reverse proxy, YouTube smoke test và production Worker smoke test đều PASS.
- Chẩn đoán sau triển khai #10: https://github.com/phuongnm7/nm7-tv-web/actions/runs/38021737310. Hai segment SCTV4K trả HTTP 200 với `Content-Type: video/mp2t`; workflow ghi `SCTV4K_PROXY_SEGMENT_MIME_PASS` và che toàn bộ path stream.
- Phạm vi chỉ NM7 TV Web. Không sửa NM7 Mobile/Android hoặc đổi URL playlist.
- Giới hạn kiểm thử: Playwright browser E2E cho HLS fixture vẫn fail ở `hls.js bufferAddCodecError` trên runner CI; regression test proxy nhị phân và syntax/regression suite đều PASS. Cần tiếp tục xác minh phát trực tiếp trên trình duyệt/thiết bị người dùng.
- Kênh `|UK| DAZN PPV FHD` chưa có trong playlist mặc định 1, mặc định 2 hoặc playlist Thể thao; cần entry M3U/URL của nguồn tùy chỉnh để xác định đúng kênh này.

## 2026-10-10 — Vòng sửa tiếp theo theo video SCTV4K và nguồn kênh quốc tế

### SCTV4K chờ 15 giây mới phát

- Video 224587 cho thấy player khởi chạy nguồn trực tiếp, giữ màn hình chờ, đến watchdog 15 giây mới chuyển qua proxy; sau khi proxy tải media thì hình mới xuất hiện.
- Nguyên nhân trong logic cũ: lỗi HLS ở tầng mạng/CORS có thể bị HLS.js retry/backoff thay vì chuyển proxy ngay; watchdog chung là 15 giây.
- Sửa ở app.js và app-safari-policy.js: khi HLS phát sinh lỗi mạng trực tiếp hoặc HTTP 4xx/5xx thì chuyển sang đường còn lại ngay, không chờ hết watchdog; timeout khởi động HLS giảm xuống 8 giây.
- Cập nhật query cache-buster trong index.html để trình duyệt tải player mới.

### Kênh từ nguồn M3U người dùng thêm vào không phát

- Video 224588 cho thấy kênh quốc tế ban đầu hiện “Đang xác định định dạng”, sau đó thử proxy và kết thúc “Video error”.
- Probe cũ chỉ dùng HEAD. Một số nhà cung cấp chặn HEAD hoặc trả Content-Type không hữu ích; player vì thế có thể nhận nhầm link HLS thành URL video HTTP thường.
- Worker /api/probe hiện dùng User-Agent, Referer và header tùy chỉnh của candidate; nếu HEAD không dùng được hoặc không xác định được loại stream, thử GET Range có giới hạn và nhận diện HLS/DASH từ Content-Type, phần mở rộng hoặc phần đầu manifest.
- Cả parser M3U trong Worker và player hiện đọc tag #EXTHTTP JSON. User-Agent, Referer/Referrer, Origin và header bổ sung được giữ trong candidate để tiếp tục gửi cho manifest/segment qua proxy.
- DASH MPD khi phát qua proxy hiện viết BaseURL và segment URL tuyệt đối qua endpoint cùng miền /api/dash-resource; endpoint giải quyết URL upstream, giữ header tùy chỉnh và trả media segment dạng nhị phân. Điều này tránh để segment DASH rời khỏi proxy khi nhà cung cấp yêu cầu Referer/Origin/User-Agent.

### Kiểm thử

- Thêm scripts/test-custom-m3u-headers-probe.js: kiểm tra EXTHTTP được phân tích, HEAD bị từ chối thì GET Range nhận diện được HLS và các header được truyền.
- Thêm scripts/test-worker-dash-proxy.js: kiểm tra BaseURL/SegmentURL DASH được viết lại cùng miền, giữ nguyên bytes media và gửi custom headers.
- Mở rộng scripts/test-playback-startup-fallback.js để kiểm tra chuyển proxy HLS ngay, timeout HLS ngắn hơn và parser M3U cục bộ.
- Regression suite chạy trên nhánh fix/fast-hls-fallback-custom-m3u-headers-20261010. Không thay URL playlist mặc định; không sửa NM7 Mobile hoặc NM7 TV Android.
- Ghi chú E2E: runner Playwright hiện không có decoder H.264 tích hợp (MediaSource.isTypeSupported trả false). Bài E2E được chỉnh để kiểm tra việc tải manifest/segment HTTP 200 trong môi trường thiếu codec, và vẫn buộc playback thật nếu codec H.264 có sẵn.
