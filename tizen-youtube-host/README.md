# NM7 TV — YouTube gốc + AdBlock host cho Samsung Tizen 3.0

Thư mục này là native host dành cho Samsung Smart TV/Tizen 3.x. Mục tiêu là mở **YouTube chính thức** trong EWK WebView nhưng đặt bộ lọc quảng cáo ở tầng native request interception, cùng kiến trúc với trình duyệt tích hợp adblock.

## Vì sao cần native host?

Trang Web thuần của NM7 chỉ có thể chạy JavaScript trong origin của NM7. Khi đã điều hướng sang `https://www.youtube.com/`, JavaScript của NM7 không còn quyền đọc/chỉnh DOM hoặc chặn resource của YouTube. Samsung Tizen 3.0 có EWK request interception, cho phép host nhận request trước khi engine gửi ra mạng.

## Thành phần

- `src/main.c`: tạo cửa sổ TV + EWK WebView, mở URL NM7 và đăng ký request interceptor.
- `src/nm7_adblock.c/.h`: bộ lọc URL tối thiểu cho domain/path quảng cáo rõ ràng.
- `assets/youtube-skip.js`: lớp bổ trợ cho các trường hợp quảng cáo đã lọt qua request filter; bấm nút Skip và tua qua ad khi trình phát cho phép.
- `tizen-manifest.xml`: manifest native TV.

## Lưu ý quan trọng

Đây **chưa phải bản sao Adblock Plus hoàn chỉnh**. Cốc Cốc công khai rằng họ tích hợp công nghệ Adblock Plus và cập nhật liên tục để xử lý anti-adblock của YouTube. Bộ lọc trong thư mục này là implementation độc lập, dùng cùng ý tưởng "browser-layer filtering + page-level fallback"; không sao chép mã proprietary của Cốc Cốc.

YouTube có thể thay đổi URL ad/anti-adblock. Vì vậy danh sách rule phải được cập nhật theo thực tế. Không nên chặn `googlevideo.com` theo domain chung vì video nội dung và quảng cáo có thể dùng chung hạ tầng phân phối.

## Build

Cần Samsung Tizen Studio/Samsung TV SDK có EWK header và library tương ứng của đúng profile TV. Thiết bị thật Tizen 3.0 phải được dùng để kiểm thử.

Repo web hiện tại không có Tizen SDK trong GitHub Actions, nên phần native host được cung cấp dưới dạng source scaffold và **chưa được tuyên bố đã build/đóng gói WGT thành công**.

Sau khi build/sign native host:

1. Build và ký gói native TPK rồi cài lên TV theo chế độ Developer hoặc tài khoản ký hợp lệ.
2. Chạy ứng dụng.
3. Host mở `https://nm7-tv-web.phuongnm7-iptv.workers.dev/`.
4. Chọn **YouTube**. Web sẽ điều hướng trong cùng WebView tới `https://www.youtube.com/`.
5. Request interception hoạt động xuyên suốt navigation.

## Fallback page script

Script chỉ là fallback UX, không thay thế network adblock. Nó không cố sửa API nội bộ của YouTube; chỉ quan sát DOM cho các nút Skip/overlay và xử lý chúng khi khả dụng.
