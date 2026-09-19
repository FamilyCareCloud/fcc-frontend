import {
  eventCode,
  handoffRange,
  kindCode,
  statusCode,
  toEvent,
  toHandoff,
  toIso,
  toMember,
  toSchedule,
  type ApiEvent,
  type ApiHandoff,
  type ApiMember,
  type ApiSchedule,
  type CareEvent,
  type Elder,
  type Group,
  type HandoffResult,
  type Member,
  type Schedule,
  type ScheduleStatus,
} from "./data";

// 로컬 개발에서는 vite 프록시(`/api` → 백엔드)를 쓰므로 CORS가 필요 없습니다.
export const API_BASE: string = (
  import.meta.env?.VITE_API_BASE_URL ||
  (import.meta.env?.DEV ? "/api" : "")
).replace(/\/$/, "");

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// ── 세션 ────────────────────────────────────────────────────
export type User = { userId: string; name: string; email: string };
export type Session = { accessToken: string; expiresAt: string; user: User };
const SESSION_KEY = "fcc.session.v1";
export function loadSession(): Session | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Session;
    if (!s.accessToken || Date.parse(s.expiresAt) <= Date.now()) return null;
    return s;
  } catch {
    return null;
  }
}
let session: Session | null = null;
let onUnauthorized: () => void = () => {};
export function setSession(next: Session | null) {
  session = next;
  try {
    if (next) window.localStorage.setItem(SESSION_KEY, JSON.stringify(next));
    else window.localStorage.removeItem(SESSION_KEY);
  } catch {
    /* 저장소를 못 써도 현재 탭에서는 계속 동작합니다. */
  }
}
export const setUnauthorizedHandler = (fn: () => void) => {
  onUnauthorized = fn;
};

// ── 요청 ────────────────────────────────────────────────────
async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(session ? { Authorization: `Bearer ${session.accessToken}` } : {}),
      },
      // 백엔드는 본문이 없어도 JSON 객체를 기대하는 POST/PATCH가 있어 빈 객체를 보냅니다.
      body:
        body === undefined
          ? method === "GET" || method === "DELETE"
            ? undefined
            : "{}"
          : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.");
  }
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* 본문이 JSON이 아닌 경우 아래에서 상태 코드로 처리합니다. */
  }
  if (!res.ok) {
    const err = (data ?? {}) as { error?: string; code?: string };
    // 로그인/가입 실패의 401은 세션 만료가 아니라 입력 오류입니다.
    if (res.status === 401 && !path.startsWith("/auth/")) {
      setSession(null);
      onUnauthorized();
    }
    throw new ApiError(
      res.status,
      err.error ?? `요청에 실패했습니다. (${res.status})`,
      err.code,
    );
  }
  return data as T;
}
const get = <T>(path: string) => request<T>("GET", path);
const post = <T>(path: string, body?: unknown) => request<T>("POST", path, body);
const patch = <T>(path: string, body: unknown) => request<T>("PATCH", path, body);
const del = <T>(path: string) => request<T>("DELETE", path);
const g = (groupId: string) => `/groups/${encodeURIComponent(groupId)}`;

export const errorMessage = (e: unknown, fallback: string) =>
  e instanceof Error && e.message ? e.message : fallback;

// ── 인증 ────────────────────────────────────────────────────
export const auth = {
  register: (email: string, password: string, name: string) =>
    post<{ confirmationRequired?: boolean }>("/auth/register", {
      email,
      password,
      name,
    }),
  confirm: (email: string, code: string) =>
    post<{ confirmed: boolean }>("/auth/confirm", { email, code }),
  async login(email: string, password: string): Promise<Session> {
    const r = await post<{
      accessToken: string;
      expiresAt: string;
      user: User;
    }>("/auth/login", { email, password });
    const next: Session = {
      accessToken: r.accessToken,
      expiresAt: r.expiresAt,
      user: r.user,
    };
    setSession(next);
    return next;
  },
  async logout() {
    try {
      await post("/auth/logout", {});
    } finally {
      setSession(null);
    }
  },
  me: () => get<User>("/me"),
  rename: (name: string) => patch<User>("/me", { name }),
};

// ── 그룹·가족 ───────────────────────────────────────────────
export type GroupSummary = { id: string; name: string };
export const groups = {
  list: () => get<GroupSummary[]>("/groups"),
  create: (name: string, elderName?: string) =>
    post<Group>("/groups", elderName ? { name, elderName } : { name }),
  detail: (id: string) => get<Group>(g(id)),
  async members(id: string): Promise<Member[]> {
    return (await get<ApiMember[]>(`${g(id)}/members`)).map(toMember);
  },
  invite: (id: string, email: string, role: "caregiver" | "elder") =>
    post<{ token: string; expiresAt: string }>(`${g(id)}/invitations`, {
      email,
      role,
    }),
  accept: (token: string) =>
    post<{ groupId: string }>("/invitations/accept", { token }),
  leave: (id: string) => post(`${g(id)}/leave`, {}),
  transferOwnership: (id: string, userId: string) =>
    patch(`${g(id)}/ownership`, { userId }),
  registerElder: (
    id: string,
    elder: { name: string; birthDate: string | null; note: string },
  ) => post<Elder>(`${g(id)}/elder`, elder),
  updateElder: (
    id: string,
    elder: { name: string; birthDate: string | null; note: string },
  ) => patch<Elder>(`${g(id)}/elder`, elder),
  setNextCaregiver: (id: string, nextCaregiverId: string | null) =>
    patch(`${g(id)}/assignment`, { nextCaregiverId }),
  /** 교대. 기간 내 기록이 있으면 인수인계도 함께 생성됩니다. */
  handover: (id: string, nextCaregiverId: string) =>
    post<{ message: string; handoff: ApiHandoff | null }>(
      `${g(id)}/handover`,
      { nextCaregiverId },
    ),
};

// ── 기록 ────────────────────────────────────────────────────
export type EventInput = { type?: string; content: string; timestamp: string };
export const events = {
  async list(groupId: string): Promise<CareEvent[]> {
    const all = await get<ApiEvent[]>(`${g(groupId)}/events`);
    // 백엔드는 시간 오름차순입니다. 화면은 최신순입니다.
    return all.map(toEvent).sort(
      (a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp),
    );
  },
  /** type이 비어 있으면 서버가 자동 분류합니다. warning이 있으면 분류 실패로 수동 유형이 쓰인 것입니다. */
  async create(groupId: string, input: EventInput) {
    const code = input.type ? eventCode(input.type) : undefined;
    const r = await post<ApiEvent>(`${g(groupId)}/events`, {
      content: input.content.trim(),
      timestamp: toIso(input.timestamp),
      ...(code ? { type: code } : {}),
    });
    return { event: toEvent(r), warning: r.warning };
  },
  async update(groupId: string, prev: CareEvent, input: EventInput) {
    const code = input.type ? eventCode(input.type) : undefined;
    return toEvent(
      await patch<ApiEvent>(`${g(groupId)}/events/${prev.eventId}`, {
        content: input.content.trim(),
        timestamp: toIso(input.timestamp),
        ...(code ? { type: code } : {}),
        version: prev.version,
      }),
    );
  },
  remove: (groupId: string, id: string) =>
    del(`${g(groupId)}/events/${id}`),
};

// ── 일정 ────────────────────────────────────────────────────
export type ScheduleInput = {
  title: string;
  kind: string;
  scheduledAt: string;
  caregiverId: string;
};
export const schedules = {
  async list(groupId: string): Promise<Schedule[]> {
    return (await get<ApiSchedule[]>(`${g(groupId)}/schedules`)).map(
      toSchedule,
    );
  },
  async create(groupId: string, input: ScheduleInput) {
    return toSchedule(
      await post<ApiSchedule>(`${g(groupId)}/schedules`, {
        title: input.title.trim(),
        type: kindCode(input.kind),
        scheduledAt: toIso(input.scheduledAt),
        caregiverId: input.caregiverId,
      }),
    );
  },
  async update(groupId: string, prev: Schedule, input: ScheduleInput) {
    return toSchedule(
      await patch<ApiSchedule>(`${g(groupId)}/schedules/${prev.scheduleId}`, {
        title: input.title.trim(),
        type: kindCode(input.kind),
        scheduledAt: toIso(input.scheduledAt),
        caregiverId: input.caregiverId,
        version: prev.version,
      }),
    );
  },
  async setStatus(groupId: string, prev: Schedule, status: ScheduleStatus) {
    return toSchedule(
      await patch<ApiSchedule>(`${g(groupId)}/schedules/${prev.scheduleId}`, {
        status: statusCode(status),
        version: prev.version,
      }),
    );
  },
  remove: (groupId: string, id: string) =>
    del(`${g(groupId)}/schedules/${id}`),
};

// ── 인수인계 ────────────────────────────────────────────────
export const handoffs = {
  async list(groupId: string): Promise<HandoffResult[]> {
    // 백엔드가 생성 역순(최신 먼저)으로 돌려줍니다.
    return (await get<ApiHandoff[]>(`${g(groupId)}/handoffs`)).map(toHandoff);
  },
  async create(groupId: string, from: string, to: string) {
    return toHandoff(
      await post<ApiHandoff>(`${g(groupId)}/handoffs`, handoffRange(from, to)),
    );
  },
  async regenerate(groupId: string, id: string, from: string, to: string) {
    return toHandoff(
      await post<ApiHandoff>(
        `${g(groupId)}/handoffs/${id}/regenerate`,
        handoffRange(from, to),
      ),
    );
  },
  async acknowledge(groupId: string, id: string) {
    return toHandoff(
      await post<ApiHandoff>(`${g(groupId)}/handoffs/${id}/acknowledge`, {}),
    );
  },
};

// ── 어시스턴트 ──────────────────────────────────────────────
export type Answer = { answer: string; transcript?: string; requiresApproval?: boolean };
export const assistant = {
  ask: (groupId: string, question: string) =>
    post<Answer>(`${g(groupId)}/assistant`, { question }),
  voice: (groupId: string, audioBase64: string, mimeType?: string) =>
    post<Answer>(`${g(groupId)}/assistant/voice`, {
      audioBase64,
      ...(mimeType ? { mimeType } : {}),
    }),
};
