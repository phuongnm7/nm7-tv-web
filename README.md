# NM7 TV Web 1.0.69

Phiên bản Web của NM7 TV được xây dựng theo giao diện và hành vi của bản Android TV **1.0.69**.

## Mốc hiện tại

- Ngày cập nhật: **06/10/2026**
- Nhánh: `fix/safari-drm-final-20261005`
- Tính năng mới nhất: **nhập nguồn IPTV bằng tệp M3U/M3U8 cục bộ**
- Cloudflare Worker: `https://nm7-tv-web.phuongnm7-iptv.workers.dev/`
- Nơi triển khai: **Cloudflare Workers**
- Chuẩn giao diện TV: Android TV NM7 1.0.69
- Các chức năng/player/DRM hiện tại được giữ nguyên; local M3U là phần bổ sung riêng.

## YouTube không quảng cáo trên Web

- Menu TV có mục **▶ YouTube không quảng cáo**.
- Nút YouTube trên giao diện mobile dùng cùng cơ chế.
- Web không nhúng SmartTube Android: SmartTube là ứng dụng native cho Android TV/TV box và không hỗ trợ Samsung Tizen hoặc iOS. Web vì vậy dùng frontend YouTube không quảng cáo chạy trực tiếp trong trình duyệt.
- Máy chủ mặc định: **Invidious** (`https://invidious.tiekoetter.com/`), với **Piped** (`https://piped.video/`) và một Invidious instance khác làm dự phòng.
- Provider mặc định có thể thay đổi bằng khóa `nm7:youtubeProvider` trong localStorage; cấu hình này giúp giữ lựa chọn máy chủ trong cùng trình duyệt.
- Tích hợp có thể nhận URL video YouTube và chuyển sang trang xem tương ứng trên frontend đã chọn.
- Đây là frontend bên thứ ba, không phải YouTube chính thức; tình trạng instance phụ thuộc nhà cung cấp và thay đổi của YouTube.

## YouTube tích hợp không quảng cáo

- Không còn dùng Invidious làm giao diện người dùng.
- NM7 TV Web có một YouTube Web Shell riêng với bố cục kiểu YouTube: thanh tìm kiếm, trang chủ/thịnh hành, chip chủ đề, lưới thumbnail, trang xem, video liên quan và toàn màn hình.
- Nút YouTube không quảng cáo trong menu TV và nút YouTube trên mobile mở shell này.
- Cloudflare Worker cung cấp các endpoint `/api/youtube/search`, `/api/youtube/trending`, `/api/youtube/streams/<videoId>` và tự động thử nhiều Piped API backend khi một backend lỗi.
- Video được lấy từ stream backend không chứa quảng cáo YouTube; player của NM7 phát HLS/progressive stream qua `/api/stream`.
- Giao diện shell không phụ thuộc giao diện của Piped/Invidious nên có thể giữ phong cách NM7 và tiếp tục tùy chỉnh theo màn hình Samsung TV.
- Chức năng đăng nhập/tài khoản YouTube chính thức không được giả lập. Đây là một client web độc lập dùng backend thay thế.

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
