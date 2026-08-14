"use client";

// Store trung tâm — "một nguồn dữ liệu, nhiều lăng kính" (mục 2, đặc tả).
// Đã kết nối Supabase: fetch thật, mutation thật, realtime subscribe.
// Nếu env chưa cấu hình → fallback về mock data để dev offline.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { BriefData, Client, Content, Job, Presence, Priority, Task, TaskStatus, User, Comment } from "./types";
import { mockClients, mockJobs, mockTasks, mockUsers } from "./mock-data";
import { sendLocalNotification, sendPushToUsers } from "./pwa";
import { getSupabaseBrowser, isSupabaseConfigured } from "./supabase/client";

export interface Notification {
  id: string;
  text: string;
  taskId?: string;
  createdAt: number;
  read: boolean;
}

// Map bản ghi notifications từ DB → shape dùng ở UI
function mapNoti(row: {
  id: string;
  text: string;
  task_id?: string | null;
  created_at: string;
  read: boolean;
}): Notification {
  return {
    id: row.id,
    text: row.text,
    taskId: row.task_id ?? undefined,
    createdAt: new Date(row.created_at).getTime(),
    read: row.read,
  };
}

interface NewTaskInput {
  title: string;
  assignee_id: string;
  client_id?: string | null;
  job_id?: string | null;
  deadline: string;
  kind?: Task["kind"];
  priority?: Priority | null;
  format?: string | null;
  depends_on_task_id?: string | null;
  brief?: string | null;
  brief_data?: BriefData | null;
}

interface StoreValue {
  users: User[];
  clients: Client[];
  jobs: Job[];
  tasks: Task[];
  comments: Comment[];
  notifications: Notification[];
  currentUser: User;
  loading: boolean;
  setCurrentUser: (id: string) => void;
  addTask: (input: NewTaskInput) => Promise<void>;
  moveTask: (taskId: string, status: TaskStatus) => Promise<void>;
  updateTask: (taskId: string, patch: Partial<Omit<Task, "id" | "created_at">>) => Promise<void>;
  addClient: (input: { 
    name: string; 
    account_id?: string; 
    note?: string;
    contact_person?: string;
    phone?: string;
    email?: string;
    industry?: string;
    tier?: string;
    status?: string;
  }) => Promise<void>;
  updateClient: (clientId: string, patch: Partial<Omit<Client, "id" | "created_at">>) => Promise<void>;
  deleteClient: (clientId: string) => Promise<void>;
  addJob: (input: { client_id: string; name: string; type?: string; note?: string }) => Promise<void>;
  updateJob: (jobId: string, patch: Partial<Omit<Job, "id" | "created_at">>) => Promise<void>;
  addComment: (taskId: string, content: string, mentions?: string[], contentId?: string | null) => Promise<void>;
  contents: Content[];
  addContent: (taskId: string, title: string, body?: string) => Promise<Content | null>;
  updateContent: (
    contentId: string,
    patch: Partial<Pick<Content, "title" | "body" | "approval_status">>,
    bumpVersion?: boolean
  ) => Promise<void>;
  setPresence: (userId: string, presence: Presence, note?: string | null) => Promise<void>;
  markAllNotisRead: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// Nếu DB chưa có cột nào đó (migration chưa chạy), lấy tên cột từ thông báo lỗi
// để tự bỏ và thử lại — giúp app không sập trước khi chạy SQL.
function missingColumn(msg: string): string | null {
  const m =
    msg.match(/column\s+(?:[\w"]+\.)?["']?(\w+)["']?\s+does not exist/i) ||
    msg.match(/Could not find the '(\w+)' column/i);
  return m ? m[1] : null;
}

// Insert/update tasks có khả năng tự bỏ cột thiếu và thử lại (tối đa 3 vòng).
async function tasksWriteResilient<T extends Record<string, unknown>>(
  run: (payload: T) => PromiseLike<{ data: unknown; error: { message: string } | null }>,
  payload: T
) {
  const p: Record<string, unknown> = { ...payload };
  for (let i = 0; i < 3; i++) {
    const res = await run(p as T);
    if (!res.error) return res;
    const col = missingColumn(res.error.message);
    if (col && col in p) {
      console.warn(`[store] Cột tasks.${col} chưa tồn tại — bỏ qua & thử lại. Hãy chạy migration mới nhất.`);
      delete p[col];
      continue;
    }
    return res;
  }
  return run(p as T);
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const supabase = getSupabaseBrowser();
  const useSupabase = isSupabaseConfigured && !!supabase;

  // --- State ---
  const [users, setUsers] = useState<User[]>(useSupabase ? [] : mockUsers);
  const [clients] = useState<Client[]>(useSupabase ? [] : mockClients);
  const [clientsState, setClientsState] = useState<Client[]>(useSupabase ? [] : mockClients);
  const [jobs, setJobs] = useState<Job[]>(useSupabase ? [] : mockJobs);
  const [tasks, setTasks] = useState<Task[]>(useSupabase ? [] : mockTasks);
  const [comments, setComments] = useState<Comment[]>([]);
  const [contents, setContents] = useState<Content[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [loading, setLoading] = useState(useSupabase);
  const realtimeRef = useRef<ReturnType<NonNullable<typeof supabase>["channel"]> | null>(null);

  // ---- Fetch initial data từ Supabase ----
  useEffect(() => {
    if (!useSupabase || !supabase) return;

    async function bootstrap() {
      setLoading(true);
      try {
        // Lấy auth user hiện tại
        const { data: { user: authUser } } = await supabase!.auth.getUser();
        if (!authUser) return;

        // Fetch toàn bộ data song song
        const [usersRes, clientsRes, jobsRes, tasksRes, commentsRes, contentsRes] = await Promise.all([
          supabase!.from("users").select("*"),
          supabase!.from("clients").select("*"),
          supabase!.from("jobs").select("*"),
          supabase!.from("tasks").select("*"),
          supabase!.from("comments").select("*"),
          supabase!.from("contents").select("*"),
        ]);

        if (usersRes.data) setUsers(usersRes.data as User[]);
        if (clientsRes.data) setClientsState(clientsRes.data as Client[]);
        if (jobsRes.data) setJobs(jobsRes.data as Job[]);
        if (tasksRes.data) setTasks(tasksRes.data as Task[]);
        if (commentsRes.data) setComments(commentsRes.data as Comment[]);
        if (contentsRes.data) setContents(contentsRes.data as Content[]);

        // currentUser = bản ghi public.users khớp auth_id
        const me = usersRes.data?.find((u: User & { auth_id?: string }) => u.auth_id === authUser.id);
        if (me) {
          setCurrentUserId(me.id);
          // Nạp thông báo đã lưu (chuông không mất khi reload)
          const { data: notiData } = await supabase!
            .from("notifications")
            .select("*")
            .eq("user_id", me.id)
            .order("created_at", { ascending: false })
            .limit(50);
          if (notiData) setNotifications(notiData.map(mapNoti));
        }
      } finally {
        setLoading(false);
      }
    }

    bootstrap();
  }, [useSupabase]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Notifications helper ----
  const pushNoti = useCallback((text: string, taskId?: string) => {
    setNotifications((prev) => [
      { id: uid(), text, taskId, createdAt: Date.now(), read: false },
      ...prev,
    ]);
  }, []);

  // ---- Realtime subscriptions ----
  useEffect(() => {
    if (!useSupabase || !supabase) return;

    // Unsubscribe cũ nếu có
    realtimeRef.current?.unsubscribe();

    const channel = supabase
      .channel("app-realtime")
      // Tasks realtime
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "tasks" }, (payload) => {
        const newTask = payload.new as Task;
        setTasks((prev) => {
          if (prev.find((t) => t.id === newTask.id)) return prev;
          return [newTask, ...prev];
        });
        // Thông báo (chuông + web push) do server xử lý qua bảng notifications + /api/push/send
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "tasks" }, (payload) => {
        setTasks((prev) =>
          prev.map((t) => (t.id === payload.new.id ? (payload.new as Task) : t))
        );
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "tasks" }, (payload) => {
        setTasks((prev) => prev.filter((t) => t.id !== payload.old.id));
      })
      // Users realtime (presence + quản lý tài khoản)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "users" }, (payload) => {
        setUsers((prev) =>
          prev.map((u) => (u.id === payload.new.id ? (payload.new as User) : u))
        );
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "users" }, (payload) => {
        setUsers((prev) => (prev.find((u) => u.id === payload.new.id) ? prev : [...prev, payload.new as User]));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "users" }, (payload) => {
        setUsers((prev) => prev.filter((u) => u.id !== payload.old.id));
      })
      // Clients realtime
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "clients" }, (payload) => {
        setClientsState((prev) => {
          if (prev.find((c) => c.id === payload.new.id)) return prev;
          return [payload.new as Client, ...prev];
        });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "clients" }, (payload) => {
        setClientsState((prev) =>
          prev.map((c) => (c.id === payload.new.id ? (payload.new as Client) : c))
        );
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "clients" }, (payload) => {
        setClientsState((prev) => prev.filter((c) => c.id !== payload.old.id));
      })
      // Jobs realtime
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "jobs" }, (payload) => {
        setJobs((prev) => {
          if (prev.find((j) => j.id === payload.new.id)) return prev;
          return [payload.new as Job, ...prev];
        });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "jobs" }, (payload) => {
        setJobs((prev) =>
          prev.map((j) => (j.id === payload.new.id ? (payload.new as Job) : j))
        );
      })
      // Comments realtime
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "comments" }, (payload) => {
        setComments((prev) => {
          if (prev.find((c) => c.id === payload.new.id)) return prev;
          return [payload.new as Comment, ...prev];
        });
      })
      // Contents realtime (M3)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "contents" }, (payload) => {
        const c = payload.new as Content;
        setContents((prev) => (prev.find((x) => x.id === c.id) ? prev : [c, ...prev]));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "contents" }, (payload) => {
        setContents((prev) => prev.map((x) => (x.id === payload.new.id ? (payload.new as Content) : x)));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "contents" }, (payload) => {
        setContents((prev) => prev.filter((x) => x.id !== payload.old.id));
      })
      // Notifications realtime (chỉ của mình)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${currentUserId}` },
        (payload) => {
          const n = mapNoti(payload.new as Parameters<typeof mapNoti>[0]);
          setNotifications((prev) => (prev.find((x) => x.id === n.id) ? prev : [n, ...prev]));
        }
      )
      .subscribe();

    realtimeRef.current = channel;
    return () => { channel.unsubscribe(); };
  }, [useSupabase, currentUserId, pushNoti]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- currentUser ----
  const currentUser = useMemo(
    () => users.find((u) => u.id === currentUserId) ?? users[0] ?? mockUsers[0],
    [users, currentUserId]
  );

  // ---- Notifications helper (đã chuyển lên trên) ----

  // ---- Mutations ----

  const addTask = useCallback(async (input: NewTaskInput) => {
    const newTask: Omit<Task, "id" | "created_at"> = {
      client_id: input.client_id ?? null,
      job_id: input.job_id ?? null,
      title: input.title,
      assignee_id: input.assignee_id,
      kind: input.kind ?? null,
      priority: input.priority ?? "trung_binh",
      format: input.format ?? null,
      deadline: input.deadline,
      depends_on_task_id: input.depends_on_task_id ?? null,
      brief: input.brief ?? null,
      brief_data: input.brief_data ?? null,
      status: "ton",
      completed_at: null,
      approval_status: null,
    };

    if (useSupabase && supabase) {
      const { data: raw, error } = await tasksWriteResilient(
        (p) => supabase.from("tasks").insert(p).select().single(),
        newTask as Record<string, unknown>
      );
      const data = raw as Task | null;
      if (error) {
        console.error("Error adding task:", error);
        alert(`Lỗi tạo task: ${error.message}`);
      } else if (data) {
        setTasks((prev) => {
          if (prev.find((t) => t.id === data.id)) return prev;
          return [data, ...prev];
        });
        // Gửi web push cho người được giao (kể cả khi họ đóng app).
        // Không gửi nếu tự giao cho chính mình.
        if (data.assignee_id && data.assignee_id !== currentUserId) {
          sendPushToUsers(
            [data.assignee_id],
            "📋 Task mới được giao",
            `"${data.title}"`,
            `/cong-viec/${data.id}`,
            `Bạn được giao: "${data.title}"`
          );
        }
      }
      // Noti trong-app xử lý qua Realtime subscriber
    } else {
      // Fallback mock
      const t: Task = { ...newTask, id: uid(), created_at: new Date().toISOString() };
      setTasks((prev) => [t, ...prev]);
      pushNoti(`Bạn được giao task mới: "${t.title}"`, t.id);
      sendLocalNotification("📋 Task mới được giao", t.title, `/cong-viec/${t.id}`).catch(() => {});
    }
  }, [useSupabase, supabase, pushNoti, currentUserId]); // eslint-disable-line react-hooks/exhaustive-deps

  const moveTask = useCallback(async (taskId: string, status: TaskStatus) => {
    if (useSupabase && supabase) {
      const { data, error } = await supabase.from("tasks").update({ status }).eq("id", taskId).select().single();
      if (error) {
        console.error("moveTask error:", error);
        alert(`Lỗi chuyển trạng thái: ${error.message}`);
      } else if (data) {
        setTasks((prev) => prev.map((t) => (t.id === taskId ? data : t)));
        // Handoff: task xong → báo "tới lượt bạn" cho assignee của các task phụ thuộc.
        if (data.status === "xong") {
          const dependents = tasks.filter((t) => t.depends_on_task_id === taskId);
          dependents.forEach((dep) => {
            if (dep.assignee_id && dep.assignee_id !== currentUserId) {
              sendPushToUsers(
                [dep.assignee_id],
                "⚡ Tới lượt bạn!",
                `"${dep.title}" đã sẵn sàng`,
                `/cong-viec/${dep.id}`,
                `Tới lượt bạn: "${dep.title}"`
              );
            }
          });
        }
      }
    } else {
      setTasks((prev) => {
        const next = prev.map((t) =>
          t.id === taskId
            ? { ...t, status, completed_at: status === "xong" ? new Date().toISOString() : null }
            : t
        );
        if (status === "xong") {
          const dependents = next.filter((t) => t.depends_on_task_id === taskId);
          dependents.forEach((dep) => {
            pushNoti(`Tới lượt bạn: "${dep.title}" đã sẵn sàng`, dep.id);
            sendLocalNotification("⚡ Tới lượt bạn!", `"${dep.title}" đã sẵn sàng`, `/cong-viec/${dep.id}`).catch(() => {});
          });
        }
        return next;
      });
    }
  }, [useSupabase, supabase, pushNoti, tasks, currentUserId]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateTask = useCallback(async (taskId: string, patch: Partial<Omit<Task, "id" | "created_at">>) => {
    if (useSupabase && supabase) {
      const { data: raw, error } = await tasksWriteResilient(
        (p) => supabase.from("tasks").update(p).eq("id", taskId).select().single(),
        patch as Record<string, unknown>
      );
      const data = raw as Task | null;
      if (error) {
        console.error("updateTask error:", error);
        alert(`Lỗi cập nhật task: ${error.message}`);
      } else if (data) {
        setTasks((prev) => prev.map((t) => (t.id === taskId ? data : t)));
      }
    } else {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                ...patch,
                completed_at:
                  patch.status === "xong"
                    ? new Date().toISOString()
                    : patch.status !== undefined
                    ? null
                    : t.completed_at,
              }
            : t
        )
      );
    }
  }, [useSupabase, supabase]); // eslint-disable-line react-hooks/exhaustive-deps

  const addClient = useCallback(async (input: { 
    name: string; 
    account_id?: string; 
    note?: string;
    contact_person?: string;
    phone?: string;
    email?: string;
    industry?: string;
    tier?: string;
    status?: string;
  }) => {
    const newClient = { 
      name: input.name, 
      account_id: input.account_id ?? null, 
      note: input.note ?? null,
      contact_person: input.contact_person ?? null,
      phone: input.phone ?? null,
      email: input.email ?? null,
      industry: input.industry ?? null,
      tier: input.tier ?? null,
      status: input.status ?? "active"
    };
    if (useSupabase && supabase) {
      const { error } = await supabase.from("clients").insert(newClient);
      if (error) {
        console.error("Error adding client:", error);
        alert(`Lỗi khi tạo khách hàng (Có thể do bạn chưa chạy lệnh SQL Update Database): ${error.message}`);
      }
    } else {
      const c: Client = { ...newClient, id: uid(), created_at: new Date().toISOString() };
      setClientsState((prev) => [c, ...prev]);
    }
  }, [useSupabase, supabase]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateClient = useCallback(async (clientId: string, patch: Partial<Omit<Client, "id" | "created_at">>) => {
    if (useSupabase && supabase) {
      await supabase.from("clients").update(patch).eq("id", clientId);
    } else {
      setClientsState((prev) => prev.map((c) => (c.id === clientId ? { ...c, ...patch } : c)));
    }
  }, [useSupabase, supabase]); // eslint-disable-line react-hooks/exhaustive-deps

  const deleteClient = useCallback(async (clientId: string) => {
    if (useSupabase && supabase) {
      await supabase.from("clients").delete().eq("id", clientId);
    } else {
      setClientsState((prev) => prev.filter((c) => c.id !== clientId));
      setJobs((prev) => prev.filter((j) => j.client_id !== clientId));
    }
  }, [useSupabase, supabase]); // eslint-disable-line react-hooks/exhaustive-deps

  const addJob = useCallback(async (input: { client_id: string; name: string; type?: string; note?: string }) => {
    const newJob = { ...input, status: "pitch" as const, type: input.type ?? null, note: input.note ?? null };
    if (useSupabase && supabase) {
      await supabase.from("jobs").insert(newJob);
    } else {
      const j: Job = { ...newJob, id: uid(), created_at: new Date().toISOString() };
      setJobs((prev) => [j, ...prev]);
    }
  }, [useSupabase, supabase]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateJob = useCallback(async (jobId: string, patch: Partial<Omit<Job, "id" | "created_at">>) => {
    if (useSupabase && supabase) {
      await supabase.from("jobs").update(patch).eq("id", jobId);
    } else {
      setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, ...patch } : j)));
    }
  }, [useSupabase, supabase]); // eslint-disable-line react-hooks/exhaustive-deps

  const addComment = useCallback(async (taskId: string, content: string, mentions: string[] = [], contentId: string | null = null) => {
    if (!content.trim()) return;
    // Không tự nhắc chính mình
    const recipients = mentions.filter((id) => id && id !== currentUserId);
    const newComment = { task_id: taskId, user_id: currentUserId, content, mentions, content_id: contentId };
    const task = tasks.find((t) => t.id === taskId);
    const meName = currentUser?.name?.replace(/\(.*?\)/g, "").trim() ?? "Ai đó";

    if (useSupabase && supabase) {
      const { error } = await supabase.from("comments").insert(newComment);
      if (error) {
        console.error("addComment error:", error);
        alert(`Lỗi thêm bình luận: ${error.message}`);
        return;
      }
      // Bắn web push cho những người được @nhắc
      if (recipients.length > 0) {
        sendPushToUsers(
          recipients,
          `💬 ${meName} nhắc bạn`,
          task ? `Trong "${task.title}": ${content}` : content,
          `/cong-viec/${taskId}`,
          `${meName} nhắc bạn${task ? ` trong "${task.title}"` : ""}`
        );
      }
    } else {
      const c: Comment = { ...newComment, id: uid(), created_at: new Date().toISOString() };
      setComments((prev) => [...prev, c]);
      // Mock: hiển thị noti in-app để demo luồng @nhắc
      recipients.forEach(() => {
        pushNoti(`${meName} nhắc bạn trong "${task?.title ?? "task"}"`, taskId);
      });
    }
  }, [useSupabase, supabase, currentUserId, tasks, users, currentUser, pushNoti]); // eslint-disable-line react-hooks/exhaustive-deps

  const addContent = useCallback(async (taskId: string, title: string, body = ""): Promise<Content | null> => {
    const base = {
      task_id: taskId,
      title: title.trim() || "Nội dung mới",
      body,
      version: 1,
      approval_status: "draft" as const,
      created_by: currentUserId || null,
    };
    if (useSupabase && supabase) {
      const { data, error } = await supabase.from("contents").insert(base).select().single();
      if (error) {
        console.error("addContent error:", error);
        alert(`Lỗi tạo nội dung (đã chạy migration_m3_content.sql chưa?): ${error.message}`);
        return null;
      }
      const c = data as Content;
      setContents((prev) => (prev.find((x) => x.id === c.id) ? prev : [c, ...prev]));
      return c;
    } else {
      const now = new Date().toISOString();
      const c: Content = { ...base, id: uid(), created_at: now, updated_at: now };
      setContents((prev) => [c, ...prev]);
      return c;
    }
  }, [useSupabase, supabase, currentUserId]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateContent = useCallback(async (
    contentId: string,
    patch: Partial<Pick<Content, "title" | "body" | "approval_status">>,
    bumpVersion = false
  ) => {
    const current = contents.find((c) => c.id === contentId);
    const nextVersion = bumpVersion ? (current?.version ?? 1) + 1 : undefined;
    const payload: Record<string, unknown> = { ...patch, updated_at: new Date().toISOString() };
    if (nextVersion) payload.version = nextVersion;

    if (useSupabase && supabase) {
      const { data, error } = await supabase.from("contents").update(payload).eq("id", contentId).select().single();
      if (error) {
        console.error("updateContent error:", error);
        alert(`Lỗi cập nhật nội dung: ${error.message}`);
      } else if (data) {
        setContents((prev) => prev.map((c) => (c.id === contentId ? (data as Content) : c)));
      }
    } else {
      setContents((prev) =>
        prev.map((c) => (c.id === contentId ? { ...c, ...patch, ...(nextVersion ? { version: nextVersion } : {}), updated_at: new Date().toISOString() } : c))
      );
    }

    // Đồng bộ cột board của task theo trạng thái duyệt của nội dung (1 task = 1 content)
    if (patch.approval_status && current) {
      const map: Record<string, TaskStatus> = {
        draft: "dang_lam",
        khach_sua: "dang_lam",
        noi_bo: "cho_duyet",
        gui_khach: "cho_duyet",
        khach_ok: "xong",
      };
      const nextTaskStatus = map[patch.approval_status];
      const task = tasks.find((t) => t.id === current.task_id);
      if (nextTaskStatus && task && task.status !== nextTaskStatus) {
        moveTask(current.task_id, nextTaskStatus);
      }
    }
  }, [useSupabase, supabase, contents, tasks, moveTask]); // eslint-disable-line react-hooks/exhaustive-deps

  const setPresence = useCallback(async (userId: string, presence: Presence, note?: string | null) => {
    const patch = { presence, status_note: note ?? null, last_active_at: new Date().toISOString() };
    if (useSupabase && supabase) {
      await supabase.from("users").update(patch).eq("id", userId);
    }
    // Luôn update local ngay để UI phản hồi tức thì (optimistic)
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, ...patch } : u))
    );
  }, [useSupabase, supabase]); // eslint-disable-line react-hooks/exhaustive-deps

  const markAllNotisRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    if (useSupabase && supabase && currentUserId) {
      supabase.from("notifications").update({ read: true }).eq("user_id", currentUserId).eq("read", false);
    }
  }, [useSupabase, supabase, currentUserId]);

  const value = useMemo<StoreValue>(
    () => ({
      users,
      clients: clientsState,
      jobs,
      tasks,
      comments,
      notifications,
      currentUser,
      loading,
      setCurrentUser: setCurrentUserId,
      addClient,
      updateClient,
      deleteClient,
      addTask,
      moveTask,
      updateTask,
      addJob,
      updateJob,
      addComment,
      contents,
      addContent,
      updateContent,
      setPresence,
      markAllNotisRead,
    }),
    [users, clientsState, jobs, tasks, comments, contents, notifications, currentUser, loading, addClient, updateClient, deleteClient, addTask, moveTask, updateTask, addJob, updateJob, addComment, addContent, updateContent, setPresence, markAllNotisRead]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
