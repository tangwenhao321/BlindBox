# Chính sách quyền riêng tư (Mẫu — vi-VN)

> **Mẫu pháp lý.** Thay thế các chỗ `{{PLACEHOLDER}}` và để luật sư tư vấn trước khi xuất bản. Không commit dữ liệu thật của người dùng vào repo.

**Phiên bản:** `{{VERSION}}`  
**Ngày có hiệu lực:** `{{EFFECTIVE_DATE}}`  
**Chủ thể xử lý dữ liệu:** `{{COMPANY_LEGAL_NAME}}` (`{{COMPANY_ADDRESS}}`)  
**Liên hệ bảo vệ dữ liệu:** `{{DPO_EMAIL}}`

## 1. Phạm vi

Chính sách này mô tả cách ứng dụng **{{APP_DISPLAY_NAME}}** (gói `{{BUNDLE_ID}}`) thu thập, sử dụng, lưu trữ và chia sẻ dữ liệu cá nhân khi bạn sử dụng dịch vụ mua hộp bí ẩn, thanh toán, kho phần thưởng và tính năng cộng đồng tại Việt Nam.

## 2. Dữ liệu chúng tôi thu thập

| Loại | Ví dụ | Mục đích |
|------|--------|----------|
| Tài khoản | Số điện thoại, biệt danh, ảnh đại diện | Đăng nhập, hồ sơ người dùng |
| Giao dịch | Mã đơn, số tiền VND, trạng thái thanh toán VNPay | Xử lý đơn, hoàn tiền, đối soát |
| Thiết bị | Mã thiết bị, token push (Expo), phiên bản app | Thông báo, bảo mật, phân tích lỗi |
| Sử dụng | Sự kiện analytics (ẩn danh hóa khi có thể) | Cải thiện sản phẩm |
| Kho & logistics | Địa chỉ giao hàng, yêu cầu ship | Giao phần thưởng vật lý |

Chúng tôi **không** lưu số thẻ ngân hàng đầy đủ; thanh toán do **VNPay** xử lý theo chính sách của họ.

## 3. Cơ sở pháp lý & mục đích

- Thực hiện hợp đồng (mua, mở hộp, giao hàng).
- Tuân thủ pháp luật (kế toán, yêu cầu cơ quan có thẩm quyền).
- Lợi ích hợp pháp (chống gian lận, giới hạn chi tiêu tự nguyện nếu bật).
- Đồng ý (marketing push, cookie không thiết yếu nếu áp dụng).

## 4. Chia sẻ với bên thứ ba

| Bên | Vai trò |
|-----|---------|
| VNPay | Cổng thanh toán |
| `{{CLOUD_HOSTING_PROVIDER}}` | Máy chủ API / DB |
| Expo / Apple / Google | Phân phối app, push |
| Sentry (`{{SENTRY_ENABLED}}`) | Báo cáo crash (ẩn PII khi cấu hình) |

Không bán dữ liệu cá nhân.

## 5. Lưu trữ & bảo mật

- Máy chủ: `{{DATA_REGION}}`.
- Thời gian lưu: `{{RETENTION_ORDERS_DAYS}}` ngày cho đơn hàng; analytics theo `security.analytics.retention-days`.
- Biện pháp: TLS, phân quyền admin OTP, nhật ký thao tác nhạy cảm.

## 6. Quyền của bạn

Theo quy định hiện hành tại Việt Nam, bạn có thể yêu cầu:

- Truy cập, chỉnh sửa, xóa tài khoản (trừ dữ liệu phải lưu theo luật).
- Rút đồng ý marketing / push trong Cài đặt app.
- Khiếu nại qua `{{DPO_EMAIL}}`.

Thời gian phản hồi mục tiêu: `{{SLA_DAYS}}` ngày làm việc.

## 7. Trẻ em

Dịch vụ không hướng tới người dưới `{{MIN_AGE}}` tuổi. Nếu phát hiện thu thập nhầm, chúng tôi sẽ xóa tài khoản.

## 8. Chuyển dữ liệu xuyên biên giới

Nếu máy chủ đặt ngoài Việt Nam (`{{DATA_REGION}}`), chúng tôi áp dụng biện pháp bảo vệ phù hợp (hợp đồng SCC hoặc tương đương).

## 9. Thay đổi chính sách

Chúng tôi thông báo trong app hoặc email khi thay đổi trọng yếu. Tiếp tục sử dụng sau ngày hiệu lực được hiểu là chấp nhận nếu pháp luật cho phép.

## 10. Liên hệ

- Email: `{{SUPPORT_EMAIL}}`
- Điện thoại: `{{SUPPORT_PHONE}}`
- Zalo OA: `{{ZALO_OA_ID}}`

---

*Bản dịch tiếng Anh (nếu cần): `{{PRIVACY_EN_URL}}`*
