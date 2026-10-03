# NM7 TV Samsung Tizen 1.0.69

Bản Samsung TV chính thức phải chạy dưới dạng Tizen Web App (WGT), không chạy trong Internet Browser.

Đã tích hợp:
- D-pad: LEFT/RIGHT/UP/DOWN
- OK / BACK
- Samsung TVInputDevice registration cho media/channel keys
- AVPlay native cho HLS/DASH
- PlayReady/Widevine DRM path
- Giao diện TV theo Android TV 1.0.69
- VTVcab 3/6/16/18 dùng resolver logo giống Android 1.0.69

Cách cài:
1. Mở Tizen Studio.
2. Import thư mục tizen.
3. Chọn TV-Samsung profile.
4. Tạo Certificate Profile của TV.
5. Build/Sign WGT.
6. Cài WGT lên TV bằng Developer Mode + SDB.

Web URL vẫn tồn tại cho PC/Browser. Tuy nhiên Browser không phải môi trường để kiểm thử D-pad/DRM native của Samsung.