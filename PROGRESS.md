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
