# NM7 TV Web — Stable Baseline

**Trạng thái:** BẢN ỔN ĐỊNH HIỆN TẠI  
**Ngày chốt:** 10/10/2026  
**Repository:** `phuongnm7/nm7-tv-web`  
**Baseline branch:** `stable/nm7-tv-web-2026-10-09`  
**Production:** https://nm7-tv-web.phuongnm7-iptv.workers.dev/  
**UI reference:** NM7 TV Android 1.0.69

## Commit/runtime đã xác minh

- **Mã nguồn ổn định được deploy và smoke-test:** `a5a3a6377a2001e296441d3110d0de9ea4a85bd5`.
- **Cloudflare Deploy:** [Workflow #38064641220 — SUCCESS](https://github.com/phuongnm7/nm7-tv-web/actions/runs/38064641220).
- Trong lần chạy này, syntax check, regression test nguồn Thể thao, regression test menu iPad nằm ngang, Cloudflare Worker deploy và smoke test production đều thành công.
- Các cập nhật tài liệu sau mốc này có thể làm HEAD của nhánh stable tiến thêm một commit tài liệu. Trừ khi được ghi rõ là thay đổi runtime, đó không phải thay đổi mã ứng dụng đang được xác minh tại đây.

## Phần thuộc baseline

- Giao diện TV chuẩn NM7 Android 1.0.69 và layout responsive.
- Nguồn Truyền hình preset 1/preset 2 cùng chọn mặc định theo thiết bị.
- Nguồn Thể thao ưu tiên Worker playlist động; GitHub Raw là fallback; `refresh=1` bỏ qua cache nội bộ.
- Nhập nguồn URL qua Worker Service Binding cho upstream thể thao và nhập tệp M3U/M3U8 cục bộ (tối đa 20 MB, không upload tệp).
- Sửa menu ☰ iPad nằm ngang khi Safari ở desktop mode.
- Player/fallback HLS, DASH/DRM, FLV, MPEG-TS, proxy HLS/segment và logic Stalker/Xtream đã có trong Worker.
- YouTube launcher chính thức, Mobile Background/PiP capability-aware và smoke tests tương ứng.
- Quy tắc cấu hình của `worker.js` và `wrangler.toml`, bao gồm `PLAYLIST_SOURCE` và `THETHAO_SOURCE`.

## Quy tắc bắt buộc cho các bản tiếp theo

1. Tạo branch tính năng/lỗi từ **HEAD mới nhất** của `stable/nm7-tv-web-2026-10-09`.
2. Không phát triển trực tiếp lên stable. Giữ thay đổi nhỏ, cô lập và chỉ sửa phần thuộc yêu cầu.
3. Không lấy code của NM7 TV Android hoặc NM7 Mobile làm nền; không chỉnh hai repository đó trong phạm vi NM7 TV Web.
4. Runtime NM7 TV Web được triển khai bằng **Cloudflare Workers**. URL Vercel VietMiTV Merge chỉ là nguồn playlist preset 1 hiện có; không được hiểu là chỉ thị deploy ứng dụng lên Vercel.
5. Chạy syntax checks, các regression tests liên quan và workflow Cloudflare production. Lưu link commit/run trong `PROGRESS.md` và cập nhật `README.md`.
6. Chỉ chốt/move stable sau khi deploy và smoke test thành công; nói rõ thiết bị/kênh nào đã kiểm tra thực tế và nội dung nào chỉ được kiểm tra tự động.
7. Bảo vệ hành vi đang hoạt động: không đổi preset, URL nguồn, giao diện, DRM, proxy hoặc workflow nằm ngoài phạm vi yêu cầu.

## Link vận hành

- Production NM7 TV Web: https://nm7-tv-web.phuongnm7-iptv.workers.dev/
- Nhánh stable: https://github.com/phuongnm7/nm7-tv-web/tree/stable/nm7-tv-web-2026-10-09
- Workflow deploy đã xác minh: https://github.com/phuongnm7/nm7-tv-web/actions/runs/38064641220
- Tiến độ chi tiết: [PROGRESS.md](PROGRESS.md)
- README sử dụng và phát triển: [README.md](README.md)

