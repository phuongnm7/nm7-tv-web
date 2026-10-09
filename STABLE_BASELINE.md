# NM7 TV Web — Stable Baseline

**Trạng thái:** BẢN ỔN ĐỊNH GẦN NHẤT  
**Ngày chốt:** 09/10/2026  
**Repository:** `phuongnm7/nm7-tv-web`  
**Baseline branch:** `stable/nm7-tv-web-2026-10-09`  
**Production:** https://nm7-tv-web.phuongnm7-iptv.workers.dev/  
**Vercel VietMiTV Merge source:** https://nm7-tv-web.vercel.app/api/vietmitv-merge

## Mốc code đã được xác minh

- **Deployed commit:** `52a51a8447735259db92f33cf5a67748cdf94c40`
- **Cloudflare Deploy:** #428 — SUCCESS
- **YouTube Original E2E:** #114 — SUCCESS
- Baseline này bao gồm các thay đổi web hiện có đến commit đã deploy nói trên, bao gồm giao diện iPad, điều khiển player bằng cảm ứng và nguồn Truyền hình mặc định 1 là VietMiTV Merge.
- Phạm vi duy nhất: **NM7 TV Web**. Không áp dụng repository, cấu hình, build hoặc version cho NM7 Mobile hay NM7 TV Android.

## Quy tắc cho các bản tiếp theo

1. Tạo branch feature/fix mới từ `stable/nm7-tv-web-2026-10-09`, không lấy NM7 Mobile/Android làm gốc và không tự ý quay về `main`/baseline khác.
2. Giữ nguyên chức năng đang có; chỉ thay đổi phần nằm trong phạm vi yêu cầu mới.
3. Chạy JavaScript syntax check, Cloudflare deploy smoke tests và YouTube Original E2E trước khi coi bản mới là đã kiểm tra.
4. Chỉ nâng mốc stable sau khi production deploy thành công và người dùng xác nhận các chức năng liên quan vẫn hoạt động.
5. Không sửa trực tiếp nhánh stable cho các tính năng mới. Giữ nhánh này làm gốc sạch để rollback/so sánh.

Lưu ý: sau khi ghi tài liệu, HEAD của nhánh stable có thể có commit tài liệu riêng; **mã ứng dụng nền tảng** vẫn tương ứng với deployed commit `52a51a8447735259db92f33cf5a67748cdf94c40`. Mọi thay đổi code tiếp theo phải bắt đầu từ nhánh stable này.
