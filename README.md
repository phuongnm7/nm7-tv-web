# NM7 TV Web 1.0.69

Phiên bản Web của NM7 TV được xây dựng theo giao diện và hành vi của bản Android TV **1.0.69**.

## Mốc kiểm thử hiện tại

- Ngày cập nhật: **06/10/2026**
- Nhánh: `fix/safari-drm-final-20261005`
- Mốc triển khai hiện tại: `a36b3c0e798fdfc08d3584524ac00f1dc28f07a2`
- Cloudflare Worker: `https://nm7-tv-web.phuongnm7-iptv.workers.dev/`
- Nơi triển khai: **Cloudflare Workers**
- Bản hiện tại đang trong giai đoạn kiểm thử thực tế dài hơn. Không thay đổi các phần UI không liên quan cho đến khi phát hiện lỗi có thể tái hiện.

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
- Các thẻ kênh chuyển sang lưới responsive trên màn hình nhỏ, không còn phải vuốt ngang riêng từng nhóm.
- Đã bỏ việc chặn sự kiện touch trên toàn bộ `#app` để tránh hiện tượng giật và tranh chấp với thao tác cuộn.
- Gesture cảm ứng chỉ được xử lý trong khu vực trình phát.
- Trong trình phát:
  - Vuốt trái/phải: tua.
  - Vuốt lên/xuống: chuyển kênh.
  - Chạm: hiện bộ điều khiển.
- Menu điện thoại và xử lý Back hai bước vẫn được giữ.
- Đường điều hướng bằng remote/bàn phím trên TV được tách riêng và giữ nguyên.

## Quản lý nguồn

### Nguồn Thể thao
- Không còn phụ thuộc duy nhất vào endpoint `thethaonm7...`.
- Worker ưu tiên nguồn:
  `https://raw.githubusercontent.com/phuongnm7/Iptv-phuongnm7/main/sports-auto.m3u?utm_source=chatgpt.com`
- Nếu nguồn trên lỗi, Worker dùng:
  `https://thethaonm7.phuongnm7-iptv.workers.dev/playlist.m3u`

### Thêm nguồn IPTV
- Có thể chọn trực tiếp tệp `.m3u` hoặc `.m3u8` bằng nút **Chọn tệp M3U**.
- Tệp được đọc cục bộ trong trình duyệt, không upload lên máy chủ.
- Parser M3U hiện có được tái sử dụng để giữ metadata kênh và thông tin header/DRM.
- Giới hạn 20 MB; tên tệp hiển thị làm nguồn hiện tại trong phiên.
- Remote TV vẫn giữ LEFT/UP, RIGHT/DOWN và OK.
- Chọn tệp thành công sẽ đóng hộp thoại và nạp danh sách qua pipeline hiện tại.

- Trước đây trình duyệt gọi trực tiếp URL playlist nên nhiều nguồn bị lỗi CORS với thông báo `Failed to fetch`.
- Hiện tại trình duyệt gọi API cùng miền `/api/source`.
- Worker lấy playlist ở phía máy chủ, phân tích M3U rồi trả JSON có CORS an toàn cho giao diện.
- URL tương đối trong playlist được tự động giải quyết theo URL nguồn gốc.
- Metadata User-Agent, Referer, Origin và DRM của playlist được giữ lại khi có.

## Phát video

- HLS: HLS native khi phù hợp; Hls.js 1.7.3 trên trình duyệt Chromium/MSE.
- MPEG-TS/FLV: mpegts.js hoặc đường FLV MSE khi trình duyệt hỗ trợ.
- DASH: Shaka Player 4.16.51 với Media Source Extensions.
- ClearKey / Widevine / PlayReady dùng đường EME của trình duyệt khi thiết bị cung cấp key system tương ứng.
- URL dạng wrapper HTTP chưa biết định dạng sẽ được probe trước khi chọn engine.
- `/api/stream` có thể rewrite playlist HLS và BaseURL/segment của DASH qua same-origin proxy, đồng thời giữ metadata header.
- `/api/license` xử lý chuyển tiếp yêu cầu license DRM.
- ON Football hiện dùng các nguồn DASH SeeNow và ClearKey đã được chốt trong Worker/playlist.

## Giới hạn của trình duyệt Samsung

Samsung công bố các phím ArrowLeft, ArrowUp, ArrowRight, ArrowDown, Enter và Back là các phím remote bắt buộc có thể nhận dưới dạng sự kiện bàn phím trong Web App. Các phím màu/chuyên dụng và một số phím playback đặc biệt phụ thuộc API sản phẩm Tizen nên không thể đảm bảo hoạt động trong trình duyệt Web thông thường.

Vì vậy bản Web dùng Arrow/Enter/Back làm lớp điều khiển remote TV portable; các phím media tùy chọn chỉ được dùng khi trình duyệt thực sự cung cấp sự kiện tương ứng.

## Kiểm thử

- Commit `a36b3c0e798fdfc08d3584524ac00f1dc28f07a2` đã triển khai production Cloudflare.
- GitHub Actions Cloudflare run #250 attempt 2: **SUCCESS**; deploy và smoke test đều **SUCCESS**.

Mốc `4fff84e7cfe495311c3623179b87b9e8a97c0acc` đã vượt qua các kiểm tra tự động hiện có:

- Kiểm tra cú pháp JavaScript và tài nguyên bắt buộc: **thành công**
- Kiểm tra điều hướng/focus trình duyệt: **thành công**
- Kiểm tra triển khai Cloudflare và smoke test Worker: **thành công**
- Kiểm tra API playlist Thể thao: **thành công, 566 kênh**
- Kiểm tra API nguồn tùy chỉnh: **thành công, 566 kênh**
- Playlist mặc định Android TV 1.0.69: **490 kênh**, đúng thứ tự nhóm đầu: VTV, VTVcab, Thể Thao, SCTV

Dự án Web tách biệt với WGT Samsung Tizen native. URL Web có thể mở trực tiếp bằng trình duyệt và không cần cài WGT.

## Nội dung đang cần test thực tế

- Chrome Android: cuộn dài, phản hồi chạm và thao tác menu.
- Samsung TV/Tizen Web App: Arrow, OK, Back và chuyển kênh.
- Cuộn qua toàn bộ danh sách kênh.
- Chuyển kênh và gesture trong trình phát.
- HLS, DASH/DRM, FLV và MPEG-TS.
- Các kênh còn chưa tương thích riêng với Samsung TV.

## Các việc để sau đợt test

Chỉ thực hiện khi có lỗi tái hiện rõ hoặc khi kết thúc vòng test hiện tại:

- Tối ưu hiệu năng render danh sách đầy đủ trên điện thoại.
- Tối ưu lazy-load logo.
- Xử lý các trường hợp focus/scroll đặc biệt.
- Tương thích thêm các định dạng stream còn lỗi trên Samsung TV.
- Dọn các workflow chẩn đoán tạm thời không còn cần thiết.

Mọi bản sửa tiếp theo nên lấy mốc ổn định hiện tại làm điểm xuất phát và cô lập đúng theo lỗi được phát hiện.
