# NM7 TV Web 1.0.69

Web App dành cho Samsung TV Internet browser.

## Baseline
- Yêu cầu của dự án: lấy NM7 Android TV 1.0.69 làm chuẩn.
- Tại thời điểm triển khai, repo Android kết nối được chưa có source/commit/branch 1.0.69; mốc có thể kiểm chứng gần nhất là **1.0.68** trên `fix/1.0.68-vtvcab-4logos-exact`.
- Vì vậy branch này dùng **Android 1.0.68 làm technical baseline** và đánh số Web build là **1.0.69**, không giả nhận đây là mã nguồn Android 1.0.69.

## Playback architecture
- HLS: hls.js 0.14.17.
- MPEG-DASH: dash.js 3.0.0 (bundle từ Samsung PlayerHTMLDash sample).
- M3U parser: giữ tvg-id, group, logo, `#EXTVLCOPT`, URL `|headers`, KODIPROP manifest/DRM metadata.
- HTTP HLS/DASH: same-origin proxy với User-Agent/Referer/Origin/Cookie/Range.
- DASH ClearKey: hỗ trợ KID:KEY và license URL.
- Automatic candidate fallback + retry.
- Playlist cache local + refresh nền.
- TV navigation: D-pad LEFT/RIGHT/UP/DOWN/OK/BACK; RIGHT ở cuối hàng wrap về đầu.

## Browser limitation
Android 1.0.68 còn hỗ trợ RTSP/RTMP/UDP bằng native stack. Web browser không thể phát trực tiếp các giao thức đó bằng HTML5; muốn phủ các nguồn này cần một gateway chuyển sang HLS/DASH/WebRTC. Web build này tối ưu toàn bộ HTTP(S) HLS/DASH/MP4 và các stream HTTP phù hợp, không giả nhận RTSP/RTMP/UDP là đã hỗ trợ.

## Required checks
- VTV1 seenow MPD: `https://livevlisctcdnw.seenow.vn/livesnv2/VTV1_HD/manifest.mpd`
- ON Football seenow MPD: `https://livevlisctcdnw.seenow.vn/mean/BONGDA_HD/manifest.mpd`
- ON Sports: dùng URL thực tế từ playlist; không hard-code URL chưa được xác nhận.
- Test trên desktop Chrome trước, sau đó test Internet browser của Samsung UA49M5500.
