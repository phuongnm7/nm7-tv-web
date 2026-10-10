# NM7 TV Web — Bản ổn định

NM7 TV Web là giao diện IPTV trên trình duyệt, lấy giao diện/hành vi của **NM7 TV Android 1.0.69** làm chuẩn. Tài liệu này mô tả bản ổn định hiện tại; nhật ký chẩn đoán theo từng ngày nằm trong [PROGRESS.md](PROGRESS.md).

## Mốc chính thức hiện tại

| Hạng mục | Giá trị |
|---|---|
| Repository | [phuongnm7/nm7-tv-web](https://github.com/phuongnm7/nm7-tv-web) |
| Nhánh stable | `stable/nm7-tv-web-2026-10-09` |
| Mã ứng dụng đã deploy/xác minh | `a5a3a6377a2001e296441d3110d0de9ea4a85bd5` |
| Production | https://nm7-tv-web.phuongnm7-iptv.workers.dev/ |
| Lần deploy/smoke test gần nhất đạt | [Cloudflare workflow #38064641220 — SUCCESS](https://github.com/phuongnm7/nm7-tv-web/actions/runs/38064641220) |
| Baseline UI | NM7 TV Android 1.0.69 |
| Ngày chốt trạng thái | 10/10/2026 |

**Đây là mốc chuẩn cho các phiên bản kế tiếp.** Mọi nhánh phát triển mới phải được tạo từ HEAD mới nhất của `stable/nm7-tv-web-2026-10-09`. Không lấy nhánh thử nghiệm cũ làm nền và không lấy repository NM7 Android/Mobile làm nền.

## Phạm vi triển khai và kiến trúc

Ứng dụng NM7 TV Web được phục vụ bởi **Cloudflare Workers**:

- `worker.js`: định tuyến request, xử lý playlist API, nhập nguồn và proxy stream.
- `wrangler.toml`: cấu hình Worker `nm7-tv-web`, static assets và Service Bindings.
- `web-tv/index.html`: giao diện chính và các asset.
- `web-tv/app-safari-policy.js`: script player đang được trang chính nạp.
- `web-tv/app.js`: script ứng dụng được duy trì song song; khi sửa logic chung cần kiểm tra các thay đổi liên quan ở cả hai file.
- `web-tv/youtube.js`: launcher điều hướng YouTube.
- `web-tv/mobile-background.js`: Media Session/Picture-in-Picture khi browser hỗ trợ.
- `.github/workflows/cloudflare-deploy.yml`: tự động chạy kiểm thử, deploy Cloudflare và smoke test production.
- `scripts/test-sport-playlist-refresh.js`, `scripts/test-ipad-landscape-menu.js`: regression tests cho các lỗi đã sửa gần nhất.

Lưu ý rõ về Vercel: URL `https://nm7-tv-web.vercel.app/api/vietmitv-merge` còn được dùng làm **upstream playlist của Truyền hình preset 1**. Đây không phải nơi chạy giao diện NM7 TV Web; không triển khai ứng dụng lên Vercel và không thay đổi dự án Vercel khi xử lý NM7 TV Web.

## Tính năng trong bản ổn định

### Giao diện và điều khiển

- Giao diện TV theo chuẩn NM7 TV Android 1.0.69, có nhóm kênh, logo, danh sách và menu tùy chọn.
- Hỗ trợ bố cục responsive cho điện thoại/iPad.
- Điều hướng bằng phím remote TV và focus cho các thành phần giao diện.
- Nút menu ☰ ở góc trên bên trái hoạt động trên iPad nằm ngang, gồm trường hợp Safari dùng “Yêu cầu trang web cho máy tính”. Bản sửa nhận diện iPadOS Macintosh/MacIntel bằng nhiều điểm chạm và tải script mới qua cache-buster.
- Có launcher YouTube chính thức; NM7 Web không thay thế giao diện hoặc tài khoản YouTube.

### Nguồn Truyền hình

Có hai preset và lựa chọn mặc định theo thiết bị:

- **Android và Windows:** mặc định preset 2.
- **iPhone/iPad/iPod:** mặc định preset 1; iPadOS desktop mode được nhận diện.
- **Thiết bị khác:** mặc định preset 1 nếu không có quy tắc cụ thể khác.

API:
- `/api/playlist?source=tv&default=1` — preset 1 (VietMiTV Merge).
- `/api/playlist?source=tv&default=2` — preset 2 (nguồn playlist truyền hình khác đã cấu hình trong Worker).

VTV1 của preset 1 dùng nguồn đã cấu hình trong playlist preset này. Không tự ý thêm lại VTVGO hoặc đổi nguồn mặc định khi không có yêu cầu.

### Nguồn Thể thao

- Nguồn chính là playlist động: `https://thethaonm7.phuongnm7-iptv.workers.dev/playlist.m3u`.
- Nguồn GitHub Raw `sports-auto.m3u` chỉ là dự phòng.
- Mỗi lần mở hoặc tải lại Thể thao sử dụng `refresh=1` để bỏ qua cache playlist nội bộ của Worker NM7 Web.
- Service Binding `THETHAO_SOURCE` giải quyết lỗi gọi Worker nguồn qua URL `workers.dev` bằng Fetch API thông thường.
- API làm mới: `/api/playlist?source=sport&refresh=1`.

Số lượng kênh là dữ liệu động. Smoke test ngày 10/10/2026 ghi nhận 1.028 kênh ở đường nguồn tùy chỉnh; không được coi con số này là số lượng cố định hoặc cam kết mọi kênh đều đang phát.

### Thêm nguồn IPTV

- Thêm nguồn qua URL bằng `/api/source?u=<URL_playlist_đã_encode>`.
- Có hỗ trợ nhập tệp `.m3u` và `.m3u8` cục bộ, giới hạn 20 MB.
- Tệp cục bộ được trình duyệt đọc qua File API, không upload nội dung lên server.
- Parser giữ metadata có trong nguồn như `tvg-id`, `tvg-logo`, `group-title`, URL stream, header và metadata DRM trong giới hạn dữ liệu nguồn cung cấp.
- Worker xử lý đường tải nguồn, URL tương đối và các header M3U được hỗ trợ. Một URL có thể vẫn thất bại nếu upstream yêu cầu xác thực, chặn môi trường Cloudflare hoặc thay đổi định dạng.

### Playback và proxy

Các nhánh phát hiện có trong baseline gồm HLS, DASH/DRM, FLV và MPEG-TS; khả năng sử dụng từng nhánh phụ thuộc browser, codec, DRM/giấy phép, header và chính sách của nhà cung cấp.

- Shaka Player 5.2.12.
- hls.js 1.7.3.
- flv.js 1.6.2.
- mpegts.js 1.8.2.
- Worker có các đường proxy/điều phối manifest và segment cho các trường hợp được hỗ trợ.
- Sửa lỗi ưu tiên proxy HLS/segment của SCTV4K và đường TCP streaming có điều kiện cho một dạng nguồn Stalker/Xtream; logic này có regression checks và được giữ trong nhánh stable.
- `/api/stream` là entrypoint proxy stream được sử dụng trong các luồng hỗ trợ.

**Giới hạn:** smoke test về parser, HTTP status hoặc manifest không chứng minh mọi kênh chạy được trên mọi thiết bị. Safari/iOS không được coi là hỗ trợ mọi nguồn DASH/DRM ClearKey; những nguồn đó có thể cần nguồn HLS/FairPlay hợp lệ hoặc ứng dụng chính thức của nhà cung cấp.

### Chạy nền và YouTube

- IPTV dùng Media Session và Picture-in-Picture khi browser/OS cung cấp API tương ứng.
- PiP, khóa màn hình và phát nền phụ thuộc khả năng và chính sách của thiết bị.
- Nút YouTube mở trang YouTube chính thức.
- `tizen-youtube-host/` là scaffold/native EWK host phục vụ nghiên cứu lọc request. Chưa tuyên bố YouTube ad-free hoàn chỉnh trên Samsung Tizen cho tới khi build/sign/install và kiểm tra E2E trên TV thật.

## API chính

| Endpoint | Mục đích |
|---|---|
| `GET /api/playlist?source=tv&default=1` | Truyền hình preset 1 |
| `GET /api/playlist?source=tv&default=2` | Truyền hình preset 2 |
| `GET /api/playlist?source=sport&refresh=1` | Làm mới nguồn Thể thao, bỏ qua cache |
| `GET /api/source?u=<URL_đã_encode>` | Nhập playlist tùy chỉnh |
| `/api/stream` | Proxy/điều phối các stream được hỗ trợ |

## Kiểm thử và xác nhận production gần nhất

Workflow [#38064641220](https://github.com/phuongnm7/nm7-tv-web/actions/runs/38064641220) chạy trên nhánh stable đã **SUCCESS**:

- JavaScript syntax check: `app-safari-policy.js`, `app.js`, `youtube.js`.
- `SPORT_PLAYLIST_REFRESH_TESTS_OK`.
- `IPAD_LANDSCAPE_MENU_REGRESSION_TESTS_OK`.
- Deploy Cloudflare Worker và YouTube proxy.
- Production smoke tests cho nguồn Truyền hình mặc định, nhóm kênh, player/Safari policy, YouTube launcher, nút menu iPad, nguồn Thể thao và nhập nguồn tùy chỉnh.
- Source-import smoke test: `CLOUDFLARE_TARGET_SOURCE_SMOKE_OK channels=1028 fetchMode=nm7-ua` tại thời điểm chạy.

Người dùng đã xác nhận bằng kiểm tra thực tế rằng nguồn Thể thao cập nhật được và menu ☰ trên iPad nằm ngang xuất hiện. Những xác nhận này không thay thế cho kiểm tra các kênh khác sau này nếu thay đổi code playback hoặc nguồn.

## Quy trình phát triển tiếp theo

1. Tạo nhánh `feature/*` hoặc `fix/*` từ HEAD mới nhất của `stable/nm7-tv-web-2026-10-09`.
2. Trước khi sửa, xác định file và hành vi thực sự liên quan; giữ thay đổi cô lập, không làm sạch/tái cấu trúc phần không liên quan.
3. Chạy các kiểm thử liên quan. Tối thiểu với player/UI: `node --check web-tv/app-safari-policy.js`, `node --check web-tv/app.js`, `node --check web-tv/youtube.js`; test nguồn Thể thao và menu iPad:
   - `node scripts/test-sport-playlist-refresh.js`
   - `node scripts/test-ipad-landscape-menu.js`
4. Chạy workflow Cloudflare đầy đủ và kiểm tra URL production sau deploy. Phân biệt rõ code đã sửa, deploy có thành công, smoke test nào đã qua và những gì cần test trên thiết bị thật.
5. Chỉ đưa bản mới thành mốc stable sau khi kiểm thử liên quan đạt và đã xác nhận không làm hỏng hành vi hiện tại.
6. Không chỉnh NM7 TV Android, NM7 Mobile, hay cấu hình deploy Vercel. Không thay nguồn/preset mặc định ngoài phạm vi yêu cầu.

## Tài liệu liên quan

- [Tiến độ và nhật ký chẩn đoán chi tiết](PROGRESS.md)
- [Quy định mốc ổn định](STABLE_BASELINE.md)
- [Nhánh stable](https://github.com/phuongnm7/nm7-tv-web/tree/stable/nm7-tv-web-2026-10-09)
- [Workflow Cloudflare gần nhất đã thành công](https://github.com/phuongnm7/nm7-tv-web/actions/runs/38064641220)


## Mục Bản tin (nhánh tính năng)

Nhánh `feature/getout-ban-tin-20261010` bổ sung trang Bản tin độc lập tại `/web-tv/ban-tin.html`, với các nhóm Highlights 24h, video thể thao ON Plus và trang trận đấu BongTV. Danh sách được lấy qua endpoint giới hạn nguồn `/api/news`; khi chọn nội dung, NM7 mở trang video gốc trong trình xem nhúng và có nút mở nguồn nếu nhà cung cấp chặn iframe. Đây là bản tích hợp thử nghiệm, chưa triển khai production; cần xác minh khả năng nhúng và độ ổn định từng nguồn trên thiết bị đích.
