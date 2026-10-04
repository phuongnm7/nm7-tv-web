# NM7 TV Web — Tiến độ dự án

## Mốc hiện tại

- Ngày: **04/10/2026**
- Nhánh: `feat/tvdrm-player-integration-20261004`
- Mốc ổn định để kiểm thử: `4fff84e7cfe495311c3623179b87b9e8a97c0acc`
- Cloudflare Worker: `https://nm7-tv-web.phuongnm7-iptv.workers.dev/`
- Chuẩn giao diện TV: Android TV NM7 1.0.69
- Nền tảng triển khai: **Cloudflare Workers**
- Không chuyển dự án sang Vercel.

## Trạng thái

Bản hiện tại đã xử lý ổn hai lỗi được phát hiện trong quá trình test điện thoại:

1. Chọn **Thể thao** trong menu từng báo `Không tải được playlist: HTTP 504`.
2. Chọn **Thêm nguồn IPTV** từng báo `Không tải được nguồn: Failed to fetch`.

Hai lỗi này đã được sửa và đưa vào cùng một mốc kiểm thử. Giao diện responsive hiện tại vẫn được giữ nguyên để tránh làm ảnh hưởng bản đang tạm ổn.

## Thay đổi giao diện mobile

- Cuộn dọc native của trình duyệt.
- Lưới kênh responsive thay cho từng hàng vuốt ngang.
- Không còn chặn touch trên toàn bộ `#app`.
- Gesture chỉ xử lý trong player.
- Vuốt trái/phải trong player để tua.
- Vuốt lên/xuống trong player để chuyển kênh.
- Chạm player để hiện điều khiển.
- Menu mobile và Back hai bước vẫn được giữ.
- Điều hướng remote/bàn phím TV không bị thay đổi.

## Sửa lỗi nguồn Thể thao

Worker đã chuyển từ mô hình chỉ dùng một endpoint sang mô hình có nguồn chính và nguồn dự phòng:

**Nguồn chính**
`https://raw.githubusercontent.com/phuongnm7/Iptv-phuongnm7/main/sports-auto.m3u?utm_source=chatgpt.com`

**Nguồn dự phòng**
`https://thethaonm7.phuongnm7-iptv.workers.dev/playlist.m3u`

Khi nguồn chính lỗi, Worker tự thử nguồn dự phòng thay vì trả 504 ngay cho giao diện.

## Sửa lỗi Thêm nguồn IPTV

Nguyên nhân gốc là trình duyệt trước đây dùng:

`fetch(url)`

trực tiếp tới playlist tùy ý. Nhiều server M3U không cấp CORS nên Android Chrome báo `Failed to fetch` dù URL vẫn tồn tại.

Đã đổi thành:

`/api/source?u=<URL_playlist>`

Worker thực hiện:

1. Lấy playlist từ server.
2. Kiểm tra HTTP status.
3. Phân tích M3U hoặc JSON.
4. Giải quyết URL tương đối theo URL nguồn.
5. Giữ metadata stream và DRM.
6. Trả danh sách kênh qua API same-origin có CORS.

## Phát video

- HLS / DASH / DRM / FLV / MPEG-TS vẫn giữ các đường phát hiện tại.
- ON Football tiếp tục dùng nguồn DASH SeeNow và ClearKey đang được chốt.
- Các thay đổi quản lý nguồn không thay đổi logic player đang được test.

## Kiểm thử đã xác nhận

Mốc `4fff84e7cfe495311c3623179b87b9e8a97c0acc`:

- GitHub Actions browser validation: **thành công**
- Cloudflare deploy + smoke test: **thành công**
- API playlist Thể thao: **thành công — 566 kênh**
- API nguồn tùy chỉnh: **thành công — 566 kênh**
- Playlist Android 1.0.69 mặc định: **thành công — 490 kênh**
- Thứ tự nhóm đầu của playlist mặc định: **VTV → VTVcab → Thể Thao → SCTV**

## Các commit liên quan

- `8617103b1cb9a23e9a349d980b4251ba7cd0b5d4`: thêm nguồn Thể thao dự phòng và API gateway nguồn.
- `997ffcf86d74d2cca881a39ad3b27d1ec9e2b44b`: chuyển Thêm nguồn IPTV sang `/api/source`.
- `4fff84e7cfe495311c3623179b87b9e8a97c0acc`: bổ sung smoke test cho playlist Thể thao và nguồn tùy chỉnh.
- Các commit tài liệu trước đó đã được hợp nhất vào cùng mốc kiểm thử hiện tại.

## Giai đoạn test hiện tại

Giữ nguyên mốc `4fff84e7cfe495311c3623179b87b9e8a97c0acc` để test thực tế trên:

- Android Chrome.
- Samsung TV/Tizen Web App.
- Màn hình dọc/ngang.
- Menu, Back, cuộn dài.
- Chuyển kênh và gesture player.
- HLS, DASH/DRM, FLV và MPEG-TS.

Chỉ tiếp tục sửa khi phát hiện lỗi có thể tái hiện rõ. Bản sửa tiếp theo phải bắt đầu từ mốc ổn định này và chỉ tác động vào phần liên quan.

## Việc để sau khi test

- Tối ưu render/lazy-load danh sách lớn trên mobile.
- Xử lý edge case focus/scroll.
- Bổ sung tương thích stream còn lỗi trên Samsung TV.
- Dọn các workflow chẩn đoán tạm thời.

## Quy tắc bàn giao

Không lấy một bản thử nghiệm mới làm baseline khi vòng test hiện tại chưa kết thúc. Khi có lỗi mới, tạo bản sửa cô lập từ mốc ổn định hiện tại để có thể xác định chính xác nguyên nhân và tránh làm hỏng các phần đang hoạt động tốt.

## Sửa lỗi playback đa nền tảng — 04/10/2026

- Phát hiện **On Sports 50fps** bị chờ 15 giây vì player thử candidate DASH + ClearKey trước, sau đó mới retry proxy rồi mới chuyển sang candidate HLS.
- Đã đổi cơ chế khởi động: nếu candidate đầu là **DASH + DRM** và có candidate **HLS**, player chọn HLS ngay khi mở kênh; không chờ watchdog 15 giây.
- Trên **iPad/iPhone**, các candidate DASH + ClearKey được bỏ qua nếu không có đường HLS tương thích.
- Trên iPad/iPhone, **HLS/HTTP ưu tiên qua /api/stream proxy** để giữ User-Agent/Referer và tránh khác biệt CORS giữa Safari và Chrome.
- Với các entry thể thao có biến thể cùng trận như **[flv] / [hls] / [hls 2]**, iPad tự bổ sung HLS sibling và ưu tiên HLS thay vì bắt người dùng chọn thủ công.
- Nguyên nhân tương thích đã được đối chiếu với ma trận của Shaka: Safari không có ClearKey trong ma trận DRM; Shaka cũng ghi rõ DASH không được hỗ trợ trên iOS theo đường hiện tại. HLS native là đường tương thích chính trên Apple.
- Các commit sửa playback:
  - `808538671c0a93a377ec383d232ffcc6dcc98e25`: ưu tiên HLS khi mở kênh + nhận diện Apple/DASH-ClearKey.
  - `45c9f01bdbac6786dff94bc1f4b44578ebdc8f4c`: iPad ưu tiên HLS/HTTP qua proxy.
  - `32287b39d0606d7f67bc5f46e1b5ed0c8f3eded1`: tự tìm HLS sibling cho biến thể thể thao.

### Ghi chú kiểm thử

- Cloudflare deploy của commit `808538...` đã **deploy thành công**, nhưng smoke test thất bại do test cũ đang kỳ vọng thứ tự nhóm `Thể Thao` không còn khớp dữ liệu thực tế (`HTV Thể Thao`, `On Sports 50fps`, `SCTV15 HD`, `SCTV17 HD`, `SCTV22`, `VTV6 HD`).
- `Web Browser Validation` của `808538...` đã **success**.
- Commit mới nhất `32287b39...` đã kích hoạt lại toàn bộ workflow và đang được kiểm tra; chưa coi là mốc ổn định cuối cùng cho đến khi vòng test kết thúc.
## Hiệu chỉnh iPad sau test thực tế — 04/10/2026

- Bản `aa0a45a...` đã cho thấy đúng lỗi hồi quy: ép HLS trên iPad qua proxy ngay từ lần thử đầu làm nhiều kênh HLS native đang chạy được bị lỗi.
- Đã phục hồi chiến lược **native HLS trước** trên iPad/iPhone; chỉ chuyển sang `/api/stream` khi native HLS phát lỗi.
- Giữ nguyên **HLS-first khi mở On Sports 50fps** nếu playlist có candidate HLS không DRM; không chủ động mở DASH+ClearKey trước.
- `index.html` đã thêm query version cho `app.js` để tránh dùng JavaScript player cũ từ cache.
- Workflow deploy Cloudflare của commit `11bcc366...` đã **success**, gồm deploy và smoke test.
- Khi test lại cần dùng URL có query mới, ví dụ `https://nm7-tv-web.phuongnm7-iptv.workers.dev/tv?v=20261004-apple-hls`, để buộc trình duyệt lấy HTML/player mới.

## Web iOS DRM — hướng ClearKey qua WebCrypto — 04/10/2026

- Phát hiện quan trọng: Shaka Player 5.2.1 đã thêm **ClearKey playback in Safari through WebCrypto**; bản ổn định hiện tại là **5.2.12**.
- Đã nâng NM7 Web từ Shaka `4.16.51` lên `5.2.12`.
- Đã bỏ chặn cứng iPhone/iPad đối với DASH + ClearKey để Shaka có cơ hội dùng ManagedMediaSource/WebCrypto trên iOS/iPadOS.
- Đã cấu hình Shaka không ép native HLS khi đang xử lý DRM DASH.
- Các kênh HLS không DRM trên iOS vẫn dùng native HLS; không lặp lại lỗi hồi quy ép toàn bộ HLS qua proxy.
- On Sports 50fps vẫn ưu tiên candidate HLS thật nếu có; Worker đã enrich cả JSON playlist để bổ sung candidate built-in.
- Đã bổ sung smoke test deploy: kiểm tra HTML phải chứa Shaka 5.2.12 và On Sports phải có URL `.m3u8` thật.
- Trạng thái: commit mới nhất `82cd9c932a13a4d32810555bcd812bf2ac026dc4`; chờ GitHub Actions/Cloudflare smoke test xác nhận.
## Ổn định DRM iPhone/iPad — 04/10/2026

- Commit triển khai hiện tại: `98cdb4692e7cdaded99ac544799a972f77df7df0`.
- Cloudflare deploy + smoke test: **SUCCESS**.
- Web Browser Validation (Node syntax/assets): **SUCCESS**.
- Shaka Player: **5.2.12**.
- iPhone/iPad ClearKey DRM tiếp tục dùng **DASH + Shaka WebCrypto**; không chuyển sang native iOS app và không giải mã/bypass DRM ở server.
- Với **DASH + DRM trên Apple**, candidate được **proxy-first** để giữ redirect token/CDN segment cùng một đường same-origin; HLS không DRM vẫn native-first.
- Live DRM recovery đã được nâng cấp: retry network/streaming/MSE lỗi tại chỗ; resync về live edge khi live bị treo; tự reload lại Shaka/MSE cùng candidate khi retry nhẹ không đủ; giới hạn recovery theo burst và tự reset budget sau khi phát ổn định; dọn event listener cũ khi đổi candidate để tránh tích lũy handler.
- Cấu hình live DASH trên Apple được tăng buffer an toàn, giữ `returnToEndOfLiveWindowWhenOutside`, polling manifest theo nhịp 2 giây và giới hạn ABR TV360 ở 3.5 Mbps.
- Phân tích TV360 1–10 xác nhận các endpoint DASH DRM đang trả MPD dynamic, cập nhật khoảng 2 giây, cửa sổ khoảng 30 giây, và các ladder chính là H.264/AAC. Một lượt kiểm tra thực tế đã lấy được init/media segment với HTTP 200.
- Đã bổ sung xử lý ClearKey base64url có padding để tránh bỏ sót KID/KEY hợp lệ.
- Diagnostics cho nguồn SeeNow cũ vẫn có thể báo HTTP 403 từ upstream; đây là tình trạng nguồn, không phải bằng chứng player DRM mới bị lỗi.
- Khi test thực tế bằng Safari, URL cache-bust hiện tại:
  `https://nm7-tv-web.phuongnm7-iptv.workers.dev/?v=20261004-ios-drm-recovery`
  Có thể thêm `&debug=1` để xem log rolling gồm mã lỗi Shaka, category/data, buffer và codec.
