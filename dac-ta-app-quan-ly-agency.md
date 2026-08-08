# Đặc tả sản phẩm — App quản lý công việc Agency (nội bộ)

> Bản v2 — dùng làm tài liệu tham chiếu khi vibecoding. Mọi quyết định dưới đây đã được chốt qua thảo luận; phần "Sau này / Phase 2, 3" là chủ ý để lại, không phải bỏ quên.

---

## 1. Tổng quan

App nội bộ giúp một team marketing/agency nhỏ quản lý công việc trên nhiều khách hàng, thấy được tình trạng công việc và lịch bận/rảnh của nhau theo thời gian thực.

**Đối tượng dùng:** team nội bộ, dưới 10 người.
**Khách hàng đang phục vụ (6):** phân phối bất động sản, homestay lưu trú, điện thoại, spa dưỡng sinh, nội thất, cho thuê & quản lý tài sản. App không quan tâm khách thuộc ngành gì — chỉ thấy "khách → job → task".
**Nền tảng:** web app dùng như app trên điện thoại (PWA), thiết kế mobile-first.

### Ba nỗi đau cần giải quyết
1. Không biết ai đang quá tải.
2. Job trôi deadline, mất kiểm soát.
3. Duyệt bài với khách quá loạn (rải rác Zalo/email).

### Có chủ ý KHÔNG làm (ở giai đoạn này)
- **Tính lãi/lỗ theo job (profitability).** Nặng và ít giá trị với team nhỏ. Không làm.
- Chấm giờ chi tiết (timesheet khắt khe). Thay bằng "độ nặng" ước lượng thô.

---

## 2. Nguyên tắc thiết kế (đọc trước khi code)

Đây là các "lằn ranh" giữ cho app không phình to và không chết yểu:

1. **Một nguồn dữ liệu, nhiều lăng kính.** Mọi job + task nằm một chỗ, rồi "chiếu" ra các góc nhìn khác nhau (deadline, tải nhân sự, chờ duyệt). Không tạo dữ liệu trùng lặp cho từng màn.
2. **Tạo task phải nhanh nhất có thể.** Tên + người + deadline là đủ để lưu; mọi thứ khác điền sau. *Rủi ro lớn nhất của app loại này không phải code, mà là team lười nhập liệu rồi quay về Zalo.*
3. **Đừng thêm bảng thừa cho tới khi thật sự đau.** Giữ data model gọn.
4. **Minh bạch để phối hợp, không phải để soi.** Hiển thị trạng thái công việc và mức bận/rảnh, KHÔNG giám sát từng phút. KPI nghiêng về KẾT QUẢ công việc, không phải ĐẾM hoạt động. Nếu team cảm thấy bị soi, họ sẽ bỏ dùng.
5. **Giao diện đẹp, truyền cảm hứng — đây là ưu tiên hàng đầu.** Không để mặc định. Đầu tư có chủ đích: hệ màu nhất quán + 1 màu nhấn có cá tính, typography cân nhắc kỹ, khoảng thở rộng, empty state đẹp, chuyển động mượt khi kéo thả. Đây là thứ khiến team muốn mở app mỗi ngày.
6. **Responsive thật sự — đẹp trên CẢ desktop lẫn mobile.** Không phải chỉ mobile-first. Mobile: một cột + thanh điều hướng đáy. Desktop: sidebar trái + vùng nội dung rộng, Kanban trải nhiều cột cạnh nhau (desktop toả sáng ở kéo-thả).

---

## 3. Phân quyền & vai trò

Tách hai khái niệm ĐỘC LẬP (đừng trộn):

### 3.1 Chức năng (`roles`) — cái "mũ" đội, CÓ THỂ NHIỀU
Ví dụ: account, content leader, designer, media. Một người đội được nhiều mũ cùng lúc (ví dụ: vừa account vừa content leader). Mang tính thông tin, dùng để lọc/gợi ý phân việc. Lưu dạng mảng.

### 3.2 Quyền (`permission`) — được THẤY và LÀM gì, chỉ 2 mức
| Mức | Thấy gì | Làm gì thêm |
|---|---|---|
| **Quản lý (manager)** | Thấy hết | Quản lý đầu sản phẩm, xem số liệu & KPI của TOÀN BỘ nhân sự, xem KPI mọi job |
| **Nhân sự (staff)** | Thấy KPI của các job MÌNH đang làm | Cập nhật task & trạng thái của mình |

> Nhân sự chỉ thấy KPI job của mình (tạo động lực), KHÔNG thấy KPI người khác (tránh so bì).

---

## 4. Data model

Postgres (Supabase). Bốn bảng lõi + bảng KPI + bảng phụ.

### 4.1 `clients` — Khách hàng
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | uuid (PK) | |
| name | text | Tên khách |
| account_id | uuid (FK → users) | Account phụ trách chính |
| note | text | Ghi chú tự do |
| created_at | timestamptz | |

### 4.2 `jobs` — Job / Campaign
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | uuid (PK) | |
| client_id | uuid (FK → clients) | |
| name | text | Tên job |
| type | text | Nhãn tự do: campaign, retainer tháng, mở bán… (đa ngành nên để mềm) |
| status | text | pitch / đang chạy / chờ duyệt / done |
| note | text | |
| created_at | timestamptz | |

### 4.3 `tasks` — Công việc
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | uuid (PK) | |
| job_id | uuid (FK → jobs) | |
| title | text | Bắt buộc |
| assignee_id | uuid (FK → users) | Bắt buộc |
| kind | text | content / design / media / account |
| weight | int (1–3) | Độ nặng: 1 nhẹ, 2 vừa, 3 nặng. Dùng tính tải, KHÔNG log giờ. |
| deadline | date | Bắt buộc |
| depends_on_task_id | uuid (FK → tasks) \| null | "Chờ task kia xong mới tới lượt". Dùng cho chuỗi bàn giao editor→content→ads. Khi task phụ thuộc chuyển done → thông báo "tới lượt bạn" cho assignee của task này. |
| status | text | Trạng thái công việc (xem 6.2) |
| completed_at | timestamptz \| null | Thời điểm chuyển sang done. Cần để tính "tỷ lệ đúng hạn" (so với deadline). |
| approval_status | text \| null | Chỉ có với task cần khách duyệt (mục 7) |
| created_at | timestamptz | |

> Chỉ 3 trường bắt buộc để lưu: `title`, `assignee_id`, `deadline`. Còn lại điền sau.

### 4.4 `users` — Thành viên team
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | uuid (PK) | |
| name | text | |
| roles | text[] | NHIỀU chức năng: account, content leader, designer… (xem 3.1) |
| permission | text | manager / staff (xem 3.2) |
| presence | text | Trạng thái cá nhân (mục 5) |
| status_note | text \| null | Dòng trạng thái nhỏ tuỳ chọn |
| last_active_at | timestamptz | Để hiển thị "hoạt động X giờ trước" |

### 4.5 `metrics` — KPI (thiết kế "bất-khả-tri về nguồn")
Một bảng linh hoạt để chứa mọi chỉ số, dù đến từ task, nhập tay, hay API sau này.
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | uuid (PK) | |
| job_id | uuid (FK → jobs) \| null | KPI gắn với job… |
| user_id | uuid (FK → users) \| null | …hoặc gắn với nhân sự |
| name | text | Tên chỉ số: reach, engagement, leads, tỷ lệ đúng hạn… |
| target | numeric \| null | Mục tiêu |
| actual | numeric | Thực đạt |
| period | text | Kỳ: tuần/tháng/quý |
| source | text | `auto` (tính từ task) / `manual` (nhập tay) / `api` (tích hợp — Phase 3) |
| updated_at | timestamptz | |

> **Điểm mấu chốt:** cột `source` cho phép một chỉ số hôm nay nhập tay (`manual`), sau này tự động đổ vào (`api`), mà KHÔNG phải đập đi làm lại cấu trúc.

#### KPI cụ thể đã chốt

**A. KPI nhân sự — tự động từ `tasks` (source = auto):**
| Chỉ số | Cách tính |
|---|---|
| Số task/content hoàn thành | Đếm task `status = done` trong kỳ (lọc `kind = content` nếu chỉ đếm content) |
| Tỷ lệ đúng hạn | (task done có `completed_at <= deadline`) ÷ (tổng task done trong kỳ) × 100% |
| Số job đang gánh | Đếm số `job_id` khác nhau mà người đó còn task chưa done (snapshot hiện tại, không theo kỳ) |

**B. KPI kết quả theo job — nhập tay trước (source = manual, sau này api):**
| Chỉ số | Đơn vị |
|---|---|
| Reach / lượt tiếp cận | số, theo kỳ |
| Lượt xem video | số, theo kỳ |
| Leads / khách quan tâm | số, theo kỳ |

> Có chủ ý KHÔNG đo "tương tác (like/comment/share)" — dễ ảo, khó quy ra giá trị. Reach/view/leads sát kết quả kinh doanh hơn.

### 4.6 Bảng phụ (làm khi cần)
- `comments` — bình luận gắn vào task. Lấp khe hở "trao đổi một nơi, việc một nơi".
- `approvals` — lịch sử vòng duyệt nếu muốn lưu vết (làm sau).

> **Nguyên tắc quan trọng:** trạng thái CON NGƯỜI (`users.presence`) và trạng thái TASK (`tasks.status`) là hai thứ khác nhau, hai bảng khác nhau. Đừng trộn.

---

## 5. Trạng thái nhân sự (Presence)

Kiểu "presence + custom status" của Slack. **Chỉ đổi được trong app** (đã bỏ phương án widget Shortcut iPhone vì cài đặt lằng nhằng).

### 5.1 Trạng thái đặt sẵn (bấm 1 phát, có màu + icon)
| Trạng thái | Màu đèn |
|---|---|
| Online | Xanh lá |
| Đang làm content | Xanh dương |
| Đang đi quay | Vàng/cam |
| Gặp khách / họp | Hồng |
| Bận – đừng làm phiền | (tuỳ chọn thêm) |
| Offline | Xám ("hoạt động X giờ trước") |

### 5.2 Dòng trạng thái nhỏ tuỳ chọn (`status_note`)
Ô text ngắn: "Ở BĐS Hoàng Gia, về lúc 3h". Cho đồng đội biết *khi nào liên lạc được* mà không cần hỏi.

### 5.3 Logic
- **Tự chuyển Online** khi mở app/đang thao tác; **tự về Offline** sau một khoảng không hoạt động.
- Trạng thái "đi quay / làm content / gặp khách" thì chọn tay.
- **Chỉ một trạng thái tại một thời điểm.** Muốn diễn tả nhiều thứ thì dùng `status_note`.

---

## 6. Các màn hình

Thanh điều hướng dưới cùng (team nhỏ, không nhồi thêm):

| Màn | Vai trò |
|---|---|
| **Hôm nay** | Màn chính, mở lên đầu tiên mỗi sáng |
| **Công việc** | Kanban task theo trạng thái |
| **Nhân sự** | Tải công việc + trạng thái + KPI (manager thấy tất cả, staff thấy của mình) |
| **Khách** | Khách → job → task |

### 6.1 Màn "Hôm nay"
- **3 ô "nhiệt kế":** Quá hạn (đỏ) · Sắp tới hạn (vàng) · Chờ bạn duyệt (xanh).
- **Danh sách "Cần xử lý hôm nay":** sắp theo độ khẩn, viền trái tô màu, gắn tag khách + người phụ trách.
- **Chuông thông báo** có badge số.

### 6.2 Màn "Công việc" (Kanban) — *phác chi tiết sau*
- Kéo thả task theo cột trạng thái. Realtime.

### 6.3 Màn "Nhân sự"
- Mỗi người: số task đang mở + tổng độ nặng (tổng `weight`).
- Trạng thái bận/rảnh + KPI (theo phân quyền ở mục 3).

### 6.4 Màn "Khách"
- 6 khách → job → task.

---

## 7. Luồng duyệt bài với khách

```
Draft → Nội bộ duyệt → Gửi khách → Khách sửa → Khách OK
```
- **Phase 1:** account tự cập nhật thủ công.
- **Phase 2:** cổng chia sẻ cho khách (link xem nháp, comment, bấm Duyệt).

---

## 8. Realtime
- **Supabase Realtime** subscribe theo bảng. Bật cho `tasks` và `users`.
- Là thứ khiến "ai cũng thấy việc/lịch của nhau" thành hiện thực.

---

## 9. Thông báo (TRONG Phase 1 — là động lực adoption chính)

Ba trigger:
1. **Khi được giao** — task gán cho bạn → thông báo ngay.
2. **Khi tới lượt (bàn giao)** — task mà bạn phụ thuộc (`depends_on_task_id`) chuyển done → "tới lượt bạn". Dùng cho chuỗi editor→content→ads.
3. **Buổi sáng (digest)** — ~8h sáng mỗi người nhận checklist task hôm nay. Cần **cron / scheduled Edge Function** trên Supabase.

Kênh gửi:
- **Chính: Web Push qua PWA.** Miễn phí, đẩy được cả khi app đóng. Vì là công cụ làm việc của chính team → ngày đầu bắt cả team cài PWA một lần là dùng được (khác khách hàng). Chạy tốt Android + iPhone đã cài PWA (iOS 16.4+, VN ngoài EU nên OK).
- **Dự phòng (tuỳ chọn): Zalo ZNS.** Gửi qua API, nhận ~99,9%, ~220đ/tin thành công, không cần follow OA trước. Cần tạo & duyệt mẫu tin; từ 01/01/2026 gộp vào ZBS Template Message. Dùng cho iPhone chưa cài PWA hoặc thông báo tối quan trọng — không bắt buộc từ đầu.
- Chi phí kỹ thuật web push: service worker + đăng ký push + cron 8h sáng. Là việc thật nhưng có lối mòn.

> **Sửa lời khuyên cũ:** trước từng nói "làm Zalo trước, đừng dựa web push" — đó là cho gửi KHÁCH HÀNG. Với NHÂN SỰ NỘI BỘ (kiểm soát được việc cài app), web push thành kênh chính hợp lý và miễn phí.

---

## 10. Kéo số liệu social media tự động — feasibility (Phase 3)

**Verdict: khả thi về kỹ thuật, nhưng rào cản cao & tốn công bảo trì → xếp Phase 3. Giai đoạn đầu NHẬP TAY.**

Facebook/Instagram:
- Cần app Meta developer + OAuth 2.0 + tài khoản nối Facebook Page.
- Truy cập Page của KHÁCH (không phải của mình) → cần Advanced Access → phải qua App Review + Business Verification, ~4–6 tuần.
- Page phải ≥ 100 like, số liệu cập nhật mỗi 24h, chỉ lưu 2 năm.
- API đổi phiên bản mỗi quý, định kỳ khai tử metric → bảo trì liên tục.

TikTok/YouTube: mỗi nền tảng có quy trình duyệt developer riêng; TikTok khó xin hơn.

Đường tắt: "unified API" bên thứ ba (trả phí) bỏ qua App Review — nhưng tốn phí hằng tháng + phụ thuộc trung gian.

**Cách làm đúng:** nhờ cột `metrics.source`, bắt đầu bằng nhập tay vài con số chính mỗi tuần/tháng (hoặc import CSV). Khi quy trình ổn và thấy rõ giá trị mới đầu tư API — không phải sửa lại cấu trúc.

---

## 11. Tech stack
| Lớp | Lựa chọn | Lý do |
|---|---|---|
| DB + Realtime + Auth | **Supabase** (Postgres) | Realtime sẵn, auth, query SQL rõ ràng, miễn phí mức team nhỏ |
| Frontend | Web **responsive** (desktop + mobile), sau đóng gói **PWA** | Đẹp trên cả hai; PWA để cài ra màn hình chính (Phase 2) |
| Thông báo | **Web Push (PWA)** làm chính + cron 8h sáng; Zalo ZNS dự phòng | Nội bộ nên push miễn phí là đủ; ZNS bảo đảm khi cần |

---

## 12. Lộ trình

### MVP (Phase 1) — CHỐT: 3 trụ + thông báo, làm cho chắc và ĐẸP
Trọng tâm: giao việc · thấy tình trạng job · thấy tình trạng nhân sự. Ưu tiên cao nhất là giao diện đẹp + responsive (desktop lẫn mobile).
- [ ] Bảng lõi: clients, jobs, tasks (có `depends_on_task_id`), users (roles[] + permission). *(chưa cần bảng metrics)*
- [ ] Phân quyền manager/staff (mức tối thiểu để phân biệt quyền xem).
- [ ] **Giao việc:** tạo task nhanh (tên + người + job + deadline), gán người. Tạo được chuỗi bàn giao (editor→content→ads) qua `depends_on`.
- [ ] **Tình trạng job:** màn "Công việc" (Kanban) realtime — task xong / đang làm / tồn.
- [ ] **Tình trạng nhân sự:** màn "Nhân sự" — tải (số task + tổng độ nặng) + presence + status_note.
- [ ] Màn "Khách": khách → job → task (điều hướng cơ bản).
- [ ] **Thông báo:** web push khi được giao + khi tới lượt (handoff) + digest 8h sáng (cron). ZNS dự phòng để sau.
- [ ] Đóng gói PWA (cần cho web push): service worker + đăng ký push.
- [ ] Giao diện responsive: sidebar trên desktop / nav đáy trên mobile; hệ thiết kế chỉn chu, empty state đẹp, kéo-thả mượt.

### Phase 2
- [ ] Màn "Hôm nay" (3 ô nhiệt kế + danh sách cần xử lý).
- [ ] KPI nhân sự tự động: số task/content hoàn thành, tỷ lệ đúng hạn, số job đang gánh (cần cột `completed_at` + bảng metrics).
- [ ] KPI job nhập tay: reach, lượt xem, leads (source = manual).
- [ ] Trạng thái duyệt bài thủ công.
- [ ] Zalo ZNS làm kênh thông báo dự phòng.

### Phase 3
- [ ] Cổng duyệt bài cho khách (link chia sẻ, comment, bấm Duyệt).
- [ ] Bảng comments gắn task.
- [ ] Tích hợp API social kéo số liệu tự động (metrics.source = api).

---

## 13. Rủi ro cần canh
1. **Team không nhập liệu** → app thành nghĩa địa. Chống: tạo task cực nhanh, noti về Zalo.
2. **Biến thành công cụ soi năng suất** (nhất là qua KPI) → team phản kháng. Chống: KPI về kết quả, không đếm hoạt động; staff chỉ thấy KPI của mình.
3. **Sa đà thêm tính năng** → phình to. Chống: bám nguyên tắc mục 2.
4. **Lao vào tích hợp social/push iOS quá sớm** → tốn công, kết quả thấp. Chống: nhập tay + Zalo trước.
