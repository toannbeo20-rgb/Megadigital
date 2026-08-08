# Roadmap — App quản lý Agency → Workspace của team

> Bản cập nhật sau khi chốt hướng "biến app thành workspace có ngữ cảnh"
> (content + brief + chat gắn vào task/job, KHÔNG clone Zalo/Notion/Docs).
> Tham chiếu nguyên tắc: `dac-ta-app-quan-ly-agency.md` (mục 2 & 13).
> Nguyên tắc vàng: **mọi thứ là "lăng kính" gắn vào khách → job → task, không tạo không gian rời rạc.**

---

## 0. Trạng thái hiện tại (ĐÃ XONG)

- [x] 4 bảng lõi (clients, jobs, tasks, users) + `comments` + `depends_on_task_id` + `approval_status`.
- [x] Auth Supabase + RLS + phân quyền manager/staff.
- [x] Tạo task nhanh, Kanban realtime, chuỗi bàn giao (handoff).
- [x] Màn Hôm nay (3 nhiệt kế), Nhân sự (presence + tải), Khách.
- [x] **Web Push đầu-cuối** (VAPID, subscribe/send, trigger giao task + handoff).

**Nợ kỹ thuật còn lại từ Phase 1 gốc** (nên trả sớm, xen vào M1):
- [ ] Persist notifications (hiện in-memory, mất khi reload) → bảng `notifications`.
- [ ] Digest thông báo ~8h sáng (Supabase cron / Edge Function).

---

## Nguyên tắc sắp thứ tự

Sắp theo **giá trị giữ chân team** (adoption), rẻ trước — đắt sau. Mỗi chặng phải trả lời được:
*"Cái này có khiến team bớt quay về Zalo không?"* Nếu không → hạ ưu tiên.

Thước đo xuyên suốt (KHÔNG đếm hoạt động — tránh rủi ro #2):
- **% bài duyệt trọn vẹn trong app** (không rớt ra Zalo).
- **Thời gian brief → khách OK**.

---

## M1 — Chất keo giữ chân: @mention + threaded comments + persist noti
> Rẻ nhất, tận dụng ngay hệ push vừa dựng. Là lý do đầu tiên để mở app thay vì Zalo.

**Tính năng**
- [ ] Comment realtime hiển thị đầy đủ trên trang task (đã có bảng `comments` + realtime, cần UI thread).
- [ ] **@mention** người trong comment → bắn web push cho người được nhắc.
- [ ] Bảng `notifications` (persist) → chuông không mất khi reload; đánh dấu đã đọc lưu server.
- [ ] Digest 8h sáng (cron) đọc từ `notifications` + task hôm nay.

**Delta data model**
```
comments: thêm  mentions uuid[]   (danh sách user_id được @)
notifications (MỚI):
  id, user_id, type, text, task_id?, job_id?, content_id?, read, created_at
```

**Định nghĩa hoàn thành:** nhắn @ ai đó trong task → họ nhận push + thấy trong chuông kể cả sau reload.

---

## M2 — Brief có cấu trúc
> Account nhập một chỗ, hết cảnh copy brief rải rác Zalo/email. Đầu vào của chuỗi bàn giao.

**Tính năng**
- [ ] Nâng `tasks.brief` (text) → brief có cấu trúc nhẹ: *mục tiêu · đối tượng · thông điệp chính · định dạng · link tham khảo*.
- [ ] Giữ nguyên tắc #2: **3 trường bắt buộc để tạo task; brief điền sau**, không ép.
- [ ] Hiển thị brief gọn ở đầu trang task để người thực thi đọc nhanh.

**Delta data model**
```
tasks.brief:  giữ cột text làm fallback; thêm brief_data jsonb
              { objective, audience, key_message, format, refs[] }
(dùng jsonb để mềm, không đẻ bảng mới — đúng nguyên tắc #3)
```

**Định nghĩa hoàn thành:** account tạo task + điền brief cấu trúc; designer/content mở task thấy đủ input, không phải hỏi lại Zalo.

---

## M3 — Content artifact + pipeline duyệt  ★ khác biệt lớn nhất
> Đánh trúng nỗi đau #3. Đây là "vũ khí" mà Zalo/Docs không có: content dính vào job, chạy đúng vòng duyệt.

**Tính năng**
- [ ] Content (caption/bài/kịch bản) là **artifact có phiên bản** đính vào task.
- [ ] Chạy qua `approval_status` sẵn có: `draft → noi_bo → gui_khach → khach_sua → khach_ok`.
- [ ] Rich text nhẹ (markdown là đủ — KHÔNG co-edit realtime kiểu Google Docs).
- [ ] Thread comment gắn thẳng vào từng content (tái dùng `comments` với `content_id`).
- [ ] Lịch sử phiên bản để lần vết "khách sửa gì".

**Delta data model**
```
contents (MỚI):
  id, task_id, title, body (markdown), version int,
  approval_status, created_by, updated_at
comments: thêm  content_id uuid?   (thread theo content)
```

**Định nghĩa hoàn thành:** một bài đi trọn draft → nội bộ duyệt → gửi khách → khách OK **hoàn toàn trong app**, không rớt ra Zalo.

---

## M4 — AI draft content từ brief
> Thứ khiến team *thích* soạn trong app. Tận dụng stack hiện đại + brief cấu trúc ở M2.

**Tính năng**
- [ ] Nút "Gợi ý bản nháp" trên content → gọi Claude, lấy `brief_data` làm input, sinh nháp v1.
- [ ] Người viết chỉnh sửa tiếp (AI là điểm khởi đầu, không thay người).
- [ ] Tùy chọn, không ép — giữ đường soạn tay bình thường.

**Kỹ thuật:** route handler server-side gọi Anthropic API (giữ API key ở env server, không lộ client).

**Định nghĩa hoàn thành:** từ brief bấm 1 nút ra nháp v1 hợp lý; rút ngắn thời gian brief → bản nháp đầu.

---

## M5 — KPI (từ Phase 2 gốc, giữ nguyên chủ đích)
> Chỉ làm sau khi luồng việc + content đã chạy mượt, để KPI phản ánh KẾT QUẢ chứ không đếm hoạt động.

- [ ] KPI nhân sự tự động (source=auto): số task/content hoàn thành, tỷ lệ đúng hạn, số job đang gánh.
- [ ] KPI job nhập tay (source=manual): reach, view, leads.
- [ ] Bảng `metrics` theo thiết kế "bất-khả-tri về nguồn" (đặc tả 4.5).
- [ ] **Staff chỉ thấy KPI của mình** (chống rủi ro #2 — so bì/soi).

---

## M6+ — Về sau (Phase 3 gốc)
- [ ] Cổng duyệt cho khách (link chia sẻ, khách comment + bấm Duyệt) — mở rộng tự nhiên từ M3.
- [ ] Zalo ZNS làm kênh noti dự phòng.
- [ ] Tích hợp API social kéo số liệu (metrics.source=api).

---

## Ranh giới — TUYỆT ĐỐI KHÔNG làm (chống phình — rủi ro #3)

| Cám dỗ | Vì sao bỏ |
|---|---|
| Chat chung / DM tự do | Clone Zalo → thua + loãng ngữ cảnh. Tán gẫu cứ để ở Zalo. |
| Soạn thảo co-edit realtime kiểu Google Docs | Vô đáy công sức, ít giá trị cho team <10. |
| Kho file / drive nội bộ | Link Drive/Zalo là đủ. |
| Video call, lịch họp | Đã có công cụ khác. |

> Mọi comment/content/brief đều PHẢI gắn vào một task/job/content cụ thể. Không có "không gian trôi nổi".

---

## Tóm tắt thứ tự build

```
M1  @mention + thread + persist noti + digest   ← rẻ, giữ chân ngay
M2  Brief cấu trúc                               ← đầu vào sạch
M3  Content artifact + pipeline duyệt  ★         ← khác biệt lớn nhất
M4  AI draft từ brief                            ← khiến team thích dùng
M5  KPI (kết quả, không đếm hoạt động)
M6+ Cổng khách · ZNS · API social
```
