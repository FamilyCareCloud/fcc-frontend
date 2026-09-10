export const eventTypes = [
  "병원",
  "복약",
  "식사",
  "생활",
  "일정",
  "특이사항",
] as const;
export type EventType = (typeof eventTypes)[number];
export type CareEvent = {
  eventId: string;
  elderId: string;
  createdBy: string;
  type: EventType;
  content: string;
  timestamp: string;
  createdAt: string;
};
export type EventInput = Pick<CareEvent, "type" | "content" | "timestamp">;
export type Schedule = {
  scheduleId: string;
  title: string;
  scheduledAt: string;
  caregiverId: string;
  status: "예정" | "완료" | "취소";
  kind: string;
};
export type Member = {
  id: string;
  name: string;
  relation: string;
  color: string;
};
export const members: Member[] = [
  { id: "demo-me", name: "김지은", relation: "딸", color: "blue" },
  { id: "demo-brother", name: "김민수", relation: "아들", color: "green" },
  { id: "demo-aunt", name: "김정희", relation: "동생", color: "purple" },
];
export const memberName = (list: Member[], id: string) =>
  list.find((m) => m.id === id)?.name ?? "알 수 없는 보호자";
export function day(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export const localInput = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
export const dateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });
export const timeLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
export const seedEvents = (): CareEvent[] => [
  {
    eventId: "demo-1",
    elderId: "demo-elder",
    createdBy: "demo-me",
    type: "식사",
    content:
      "아침 식사로 잡곡밥과 된장국을 드셨어요. 평소와 비슷한 양을 드셨습니다.",
    timestamp: new Date(`${day()}T08:30`).toISOString(),
    createdAt: new Date(`${day()}T08:40`).toISOString(),
  },
  {
    eventId: "demo-2",
    elderId: "demo-elder",
    createdBy: "demo-me",
    type: "복약",
    content: "아침 식사 후 처방받은 약을 드신 것을 확인했어요.",
    timestamp: new Date(`${day()}T09:00`).toISOString(),
    createdAt: new Date(`${day()}T09:05`).toISOString(),
  },
  {
    eventId: "demo-3",
    elderId: "demo-elder",
    createdBy: "demo-brother",
    type: "생활",
    content:
      "집 앞 공원에서 함께 20분 정도 산책했어요. 꽃이 많이 피었다며 좋아하셨어요.",
    timestamp: new Date(`${day()}T10:30`).toISOString(),
    createdAt: new Date(`${day()}T11:00`).toISOString(),
  },
  {
    eventId: "demo-4",
    elderId: "demo-elder",
    createdBy: "demo-aunt",
    type: "병원",
    content:
      "정기 내과 진료를 다녀왔어요. 약 변경은 없고, 다음 진료 때 혈액검사가 예정되어 있어요.",
    timestamp: new Date(`${day(-1)}T14:00`).toISOString(),
    createdAt: new Date(`${day(-1)}T15:00`).toISOString(),
  },
  {
    eventId: "demo-5",
    elderId: "demo-elder",
    createdBy: "demo-brother",
    type: "특이사항",
    content:
      "저녁 식사를 평소보다 조금 남기셨어요. 다음 식사 때 드시는 양을 함께 확인해 주세요.",
    timestamp: new Date(`${day(-1)}T18:30`).toISOString(),
    createdAt: new Date(`${day(-1)}T18:45`).toISOString(),
  },
];
export const seedSchedules = (): Schedule[] => [
  {
    scheduleId: "s1",
    title: "저녁 복약 확인",
    scheduledAt: `${day()}T19:00`,
    caregiverId: "demo-me",
    status: "예정",
    kind: "기타",
  },
  {
    scheduleId: "s2",
    title: "가족과 함께하는 점심",
    scheduledAt: `${day(2)}T12:00`,
    caregiverId: "demo-brother",
    status: "예정",
    kind: "가족 방문",
  },
  {
    scheduleId: "s3",
    title: "내과 정기 진료 · 혈액검사",
    scheduledAt: `${day(5)}T10:00`,
    caregiverId: "demo-aunt",
    status: "예정",
    kind: "병원",
  },
];
const KEY = "fcc.demo.care-events.v1";
export type Store = Pick<Storage, "getItem" | "setItem">;
const validEvent = (v: unknown): v is CareEvent => {
  if (!v || typeof v !== "object") return false;
  const e = v as CareEvent;
  return (
    typeof e.eventId === "string" &&
    typeof e.elderId === "string" &&
    typeof e.createdBy === "string" &&
    typeof e.content === "string" &&
    eventTypes.includes(e.type) &&
    Number.isFinite(Date.parse(e.timestamp)) &&
    Number.isFinite(Date.parse(e.createdAt))
  );
};
export function createMockCareApi(storage: Store, delay = 300) {
  let failure: "load" | "save" | null = null;
  const wait = async (op: "load" | "save") => {
    await new Promise((r) => setTimeout(r, delay));
    if (failure === op) {
      failure = null;
      throw new Error(
        op === "load"
          ? "돌봄 기록을 불러올 수 없습니다."
          : "저장에 실패했습니다. 입력 내용을 유지했으니 다시 시도해 주세요.",
      );
    }
  };
  const read = (): CareEvent[] => {
    const raw = storage.getItem(KEY);
    if (raw === null) return seedEvents();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.every(validEvent))
      throw new Error(
        "저장된 가상 기록을 읽을 수 없습니다. 시연 도구에서 초기화해 주세요.",
      );
    return parsed;
  };
  const write = (events: CareEvent[]) =>
    storage.setItem(KEY, JSON.stringify(events));
  return {
    failNext(op: "load" | "save") {
      failure = op;
    },
    async list() {
      await wait("load");
      return read().sort(
        (a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp),
      );
    },
    async save(input: EventInput, id?: string) {
      await wait("save");
      if (!input.content.trim()) throw new Error("돌봄 내용을 입력해 주세요.");
      if (
        !eventTypes.includes(input.type) ||
        !Number.isFinite(Date.parse(input.timestamp))
      )
        throw new Error("유형과 발생 시각을 확인해 주세요.");
      const all = read();
      const existing = id ? all.find((e) => e.eventId === id) : undefined;
      if (id && !existing) throw new Error("수정할 기록을 찾을 수 없습니다.");
      const event: CareEvent = {
        eventId: existing?.eventId ?? crypto.randomUUID(),
        elderId: "demo-elder",
        createdBy: existing?.createdBy ?? "demo-me",
        createdAt: existing?.createdAt ?? new Date().toISOString(),
        type: input.type,
        content: input.content.trim(),
        timestamp: new Date(input.timestamp).toISOString(),
      };
      write(
        existing
          ? all.map((e) => (e.eventId === id ? event : e))
          : [...all, event],
      );
      return event;
    },
    async remove(id: string) {
      await wait("save");
      write(read().filter((e) => e.eventId !== id));
    },
    async reset(empty = false) {
      write(empty ? [] : seedEvents());
    },
  };
}
// Temporary mock contract. Replace this boundary after the backend contract is agreed.
// A production build never enables the prototype unless explicitly opted in.
export const demoEnabled =
  import.meta.env?.DEV || import.meta.env?.VITE_ENABLE_DEMO === "true";
let mockApi: ReturnType<typeof createMockCareApi> | undefined;
export const getCareApi = () => {
  if (!demoEnabled) throw new Error("실제 API 연결이 필요합니다.");
  mockApi ??= createMockCareApi(window.localStorage);
  return mockApi;
};
