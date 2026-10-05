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


## Phục hồi Safari SCTV22 — sửa nguyên nhân gốc — 05/10/2026

Video kiểm thử cho thấy SCTV22 không thất bại ngay khi mở: hình chạy ổn định đến khoảng **9,4 giây**, sau đó chuyển đột ngột sang `Video error · thử proxy`. Điều này chứng minh lỗi nằm trong quá trình phát live sau khi phiên đã khởi tạo, không phải chỉ do thiếu URL.

Đã xác định thêm nguyên nhân gốc trong player:

- `startShaka()` trước đây đăng ký request filter và **ép mọi HTTP MPD/segment qua /api/stream**, ngay cả khi `S.proxyAttempt=false`. Với SCTV22, đường Cloudflare tới upstream hiện bị HTTP 403; vì vậy UI có thể ghi “trực tiếp” nhưng media request thực tế vẫn đi qua proxy và chết sau khi buffer ban đầu hết.
- Với Apple + DASH + ClearKey, request filter hiện **giữ nguyên URL direct**; chỉ proxy khi thật sự cần ở các loại stream khác.
- Apple + DASH + ClearKey không còn rơi sang nhánh `thử proxy` khi timeout/video error. Player sẽ retry streaming tại chỗ rồi tái tạo Shaka trực tiếp cùng candidate tối đa 2 lần.
- `retryStreaming()` đã được xử lý đúng kiểu Promise thay vì coi Promise là boolean.
- Apple ClearKey DASH được tắt ABR (`abr.enabled=false`) để tránh adaptive representation switch trên live MSE/WebCrypto.
- Bổ sung `manifest.retryParameters`, `streaming.retryParameters` và DRM retry để giảm lỗi segment tạm thời.
- Bump schema cache thành `20261005-drm-final-1` để **loại bỏ toàn bộ playlist localStorage cũ** của các bản thử trước, tránh SCTV22 bị mở bằng metadata DRM stale.
- Shaka nâng lên **5.2.12**, bản phát hành 25/09/2026 có các sửa DASH/DRM/live-network liên quan trực tiếp đến trường hợp này.

### Nguyên tắc cuối cho SCTV22 trên Apple

Không dùng Cloudflare proxy như đường DRM chính. Safari/iPad phải lấy MPD, init/media segment và ClearKey trực tiếp từ nguồn khi nguồn cho phép; Cloudflare chỉ phục vụ HTML/API playlist và các stream cần proxy.

### Mốc code

- `f932408a223a9aa55b0101381f6d28e058e93929`: sửa request path direct/proxy, cache schema và recovery.
- `dd72918a8c0bc2c2dd3f041bb1839b6a41afbada`: Shaka 5.2.12 + cache-bust player.
- `55bedcfb1dc622915ada361f7a3cdbd8afedb531`: cập nhật smoke test Cloudflare.


## Phân tích video mới và sửa VTVcab3 — 05/10/2026

Video `00-58-34` cho thấy đúng trình tự lỗi: **VTVcab 3 - ON Sports HD** → mở nguồn đầu → hình thực tế là **ON Vie Giải Trí** → chuyển sang nguồn 2 → đúng hình ON Sports → sau đó xuất hiện `Đang khôi phục DRM · lần 1/3` và màn hình đen. Đây là bằng chứng nguồn HLS built-in trước đây bị map sai, đồng thời recovery `waiting/stalled` kích hoạt quá sớm.

Đã sửa:

- Không còn gọi `retryStreaming()` ngay khi video phát event `waiting` hoặc `stalled`; thay bằng stall watchdog, chỉ hard-restart khi currentTime thực sự không tiến triển trong khoảng 6 giây.
- Apple + DASH ClearKey ưu tiên đúng candidate DRM trước HLS sibling; nếu DRM hết hard-recovery budget thì mới chuyển sang HLS không DRM.
- HLS built-in cho `vtvcab3hd` được thay từ endpoint `/hls/vtvcab3/` đã cho nội dung sai trong video sang `https://856175157.r.vtvcdn.com/ondrm/THETHAO_HD/m30_index.m3u8`, nguồn được các playlist công khai hiện hành ghi cho **ON Sports HD Server 3**. 
- Candidate HLS fallback được giữ `forceProxy=true` để Worker có thể giữ User-Agent cần thiết và rewrite segment URI same-origin.
- Thêm workflow `diagnose-vtvcab3-playback.yml` để kiểm tra trực tiếp và qua Cloudflare endpoint của ON Sports.
- `app.js` đã được kiểm tra syntax thành công sau bản sửa.

Các thay đổi này chỉ tác động vào đường phát VTVcab/DRM và recovery; giao diện 1.0.69 không bị thay đổi.

## Phân tích video 07:43 và ổn định live DRM — 05/10/2026

Video `video_2026-10-05_07-43-35.mp4` (125,4 giây) cho thấy rõ đây không phải lỗi Safari không hỗ trợ DRM. ON Sports 50fps, SCTV15 và SCTV17 đều phát được hình trong các khoảng ngắn rồi lặp chu kỳ **phát khoảng 6–7 giây → mất hình/rebuffer khoảng 4–5 giây → tự recovery → phát lại**. Ở ON Sports, video ghi rõ `Đang tự khôi phục DRM · lần 1/3`, sau đó lần 3/3. Đây là dấu hiệu player đang can thiệp quá mạnh vào một live pipeline đã có thể giải mã.

Đã sửa theo nguyên nhân gốc:

- Không còn coi mọi Shaka `NETWORK`/`STREAMING` error là lỗi DRM cần gọi `retryStreaming()`. Shaka tự xử lý retry segment bằng `streaming.retryParameters`; application chỉ can thiệp với lỗi MediaSource/video thực sự.
- Apple ClearKey DASH được đặt **defaultPresentationDelay = 8s**, `bufferingGoal = 18s`, `rebufferingGoal = 6s`, `bufferBehind = 25s`, `segmentPrefetchLimit = 2`, `updateIntervalSeconds = 2`, `startAtSegmentBoundary = true`.
- ABR được **bật lại** cho Apple DRM và giới hạn tối đa `1280x720/60fps`, bắt đầu với `defaultBandwidthEstimate = 1.5 Mbps` và chuyển bitrate chậm hơn. Đây thay thế bản trước đã khóa ABR, vốn không phù hợp với live 50fps.
- Startup watchdog cho Apple DASH DRM tăng lên 30 giây để không cắt ngang quá trình tạo session/buffer ban đầu.
- VTVcab3/ON Sports không còn được ưu tiên bởi HLS endpoint sai đã xuất hiện ON Vie Giải Trí trong video.
- Giữ DASH/ClearKey direct trên Safari; không chuyển Cloudflare proxy cho Apple DRM vì upstream hiện trả 403/530 từ edge của chúng ta.
- Cache-bust player cuối: `app.js?v=20261005-drm-stable-final3`.

### Production verification

Cloudflare deployment mới nhất đã `success`, smoke test production đã `success`, xác nhận Shaka 5.2.12 và các marker của cấu hình live DRM mới.

Bản test production:
`https://nm7-tv-web.phuongnm7-iptv.workers.dev/?v=20261005-drm-stable-final3`

Lưu ý: chưa có khả năng điều khiển một thiết bị iPad Safari thật trong môi trường CI, nên việc xác nhận cuối cùng phải dựa trên playback thực tế trên iPad. Nhưng bản production hiện tại đã đúng với mô hình lỗi quan sát từ video và loại bỏ cơ chế recovery gây gián đoạn trước đó.
