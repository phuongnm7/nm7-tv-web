# NM7 TV Samsung Tizen 1.0.69

Đây là bản Tizen Web App cục bộ của NM7 TV Web 1.0.69.

Mục tiêu:
- Samsung Smart Remote D-pad: ← → ↑ ↓, OK, BACK.
- Tizen TV Input Device API.
- AVPlay native cho HLS/MPEG-DASH.
- AVPlay DRM path cho PlayReady/Widevine.
- UI bám layout Android TV 1.0.69.
- Dùng production API/playlist của NM7 TV.

Quan trọng: Internet Browser trên TV không cung cấp Tizen APIs; vì vậy D-pad/DRM đầy đủ phải chạy bản WGT này, không chạy URL trực tiếp trong Internet Browser.

Build:
1. Import thư mục `tizen/` vào Tizen Studio với profile `tv-samsung`.
2. Tạo/chọn Certificate Profile của máy TV.
3. Build ký package WGT.
4. Cài WGT lên Samsung TV ở Developer Mode.

Package này dùng nội dung remote từ production. `config.xml` đã khai báo `tv.inputdevice`, internet và DRM privilege.