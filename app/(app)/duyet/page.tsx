"use client";

import { useStore } from "@/lib/store";
import { PageHeader, EmptyState } from "@/components/ui";
import { TaskCard } from "@/components/TaskCard";

export default function ReviewCenterPage() {
  const { tasks, currentUser } = useStore();
  const isManager = currentUser.permission === "manager";

  if (!isManager) {
    return (
      <EmptyState
        icon="🔒"
        title="Không có quyền truy cập"
        desc="Trang này chỉ dành cho Quản lý / Account."
      />
    );
  }

  const reviewTasks = tasks.filter((t) => t.status === "cho_duyet");

  return (
    <div className="animate-in">
      <PageHeader
        title="Duyệt nhanh"
        subtitle="Danh sách các công việc đang chờ duyệt. Hãy kiểm tra và đóng task để team đi tiếp."
      />

      {reviewTasks.length === 0 ? (
        <EmptyState
          icon="🎉"
          title="Tất cả đã duyệt xong!"
          desc="Không còn task nào đang kẹt ở trạng thái Chờ duyệt."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {reviewTasks.map((t) => (
            <TaskCard key={t.id} task={t} />
          ))}
        </div>
      )}
    </div>
  );
}
