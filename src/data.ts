// 화면에서 쓰는 한글 라벨/모델과 백엔드(API v0.2) 응답 사이의 변환 계층입니다.
// 부수효과와 환경 의존이 없는 순수 함수만 두어 node 테스트에서 그대로 불러올 수 있습니다.

// ── 기록 유형 ────────────────────────────────────────────────
// 사용자가 직접 고를 수 있는 유형(백엔드 eventTypes 중 UI에 노출하는 6종).
export const eventTypes = [
  "병원",
  "복약",
  "식사",
  "생활",
  "일정",
  "특이사항",
] as const;
export type EventType = string;
const eventCodes: Record<string, string> = {
  병원: "hospital",
  복약: "medication",
  식사: "meal",
  생활: "life",
  일정: "schedule",
  특이사항: "observation",
};
const eventLabels: Record<string, string> = {
  ...Object.fromEntries(Object.entries(eventCodes).map(([k, v]) => [v, k])),
  homecoming: "귀가",
  care_center: "돌봄센터",
  handover: "교대",
  approval: "승인",
};
export const eventCode = (label: string) => eventCodes[label];
export const eventLabel = (code: string) => eventLabels[code] ?? code;

// ── 일정 종류/상태 ──────────────────────────────────────────
export const scheduleKinds = [
  "병원",
  "검사",
  "가족 방문",
  "돌봄센터",
  "복약",
  "기타",
] as const;
const kindCodes: Record<string, string> = {
  병원: "hospital",
  검사: "examination",
  "가족 방문": "visit",
  돌봄센터: "care_center",
  복약: "medication",
  기타: "other",
};
const kindLabels = Object.fromEntries(
  Object.entries(kindCodes).map(([k, v]) => [v, k]),
);
export const kindCode = (label: string) => kindCodes[label] ?? "other";
export const kindLabel = (code: string) => kindLabels[code] ?? code;

export type ScheduleStatus = "예정" | "완료" | "취소";
export const scheduleStatuses: ScheduleStatus[] = ["예정", "완료", "취소"];
const statusCodes: Record<ScheduleStatus, string> = {
  예정: "scheduled",
  완료: "completed",
  취소: "cancelled",
};
const statusLabels = Object.fromEntries(
  Object.entries(statusCodes).map(([k, v]) => [v, k]),
) as Record<string, ScheduleStatus>;
export const statusCode = (label: ScheduleStatus) => statusCodes[label];
export const statusLabel = (code: string): ScheduleStatus =>
  statusLabels[code] ?? "예정";

// ── 모델 ────────────────────────────────────────────────────
export type ApiEvent = {
  id: string;
  elderId: string | null;
  type: string;
  content: string;
  timestamp: string;
  createdAt: string;
  createdBy: string;
  source?: string;
  version: number;
  warning?: string;
};
export type CareEvent = {
  eventId: string;
  elderId: string;
  createdBy: string;
  type: EventType;
  content: string;
  timestamp: string;
  createdAt: string;
  version: number;
  /** 교대·일정 등록 같은 시스템 이력. 수정/삭제할 수 없습니다. */
  system: boolean;
};
export const toEvent = (e: ApiEvent): CareEvent => ({
  eventId: e.id,
  elderId: e.elderId ?? "",
  createdBy: e.createdBy,
  type: eventLabel(e.type),
  content: e.content,
  timestamp: e.timestamp,
  createdAt: e.createdAt,
  version: e.version,
  system: e.source === "system",
});

export type ApiSchedule = {
  id: string;
  title: string;
  type: string;
  scheduledAt: string;
  caregiverId: string;
  status: string;
  version: number;
};
export type Schedule = {
  scheduleId: string;
  title: string;
  scheduledAt: string;
  caregiverId: string;
  status: ScheduleStatus;
  kind: string;
  version: number;
};
export const toSchedule = (s: ApiSchedule): Schedule => ({
  scheduleId: s.id,
  title: s.title,
  scheduledAt: s.scheduledAt,
  caregiverId: s.caregiverId,
  status: statusLabel(s.status),
  kind: kindLabel(s.type),
  version: s.version,
});

export type ApiMember = {
  memberId: string;
  userId: string;
  role: "owner" | "caregiver" | "elder";
  joinedAt: string;
  name: string;
};
export type Member = {
  id: string;
  name: string;
  role: string;
  canCare: boolean;
  isOwner: boolean;
  color: string;
};
const colors = ["blue", "green", "purple", "orange"];
const roleLabels = { owner: "소유자", caregiver: "보호자", elder: "고령자" };
export const toMember = (m: ApiMember, index: number): Member => ({
  id: m.userId,
  name: m.name,
  role: roleLabels[m.role] ?? m.role,
  canCare: m.role !== "elder",
  isOwner: m.role === "owner",
  color: colors[index % colors.length],
});
export const nameOf = (members: Member[], id: string | null | undefined) =>
  members.find((m) => m.id === id)?.name ?? "알 수 없는 보호자";

export type Elder = { id: string; name: string; birthDate: string | null; note: string };
export type Assignment = {
  id: string;
  userId: string;
  startedAt: string;
  endedAt?: string;
};
export type Group = {
  id: string;
  name: string;
  elder: Elder | null;
  primaryCaregiverId: string;
  nextCaregiverId: string | null;
  assignments: Assignment[];
};

export type EvidenceItem = { text: string; quote?: string };
export type HandoffSections = {
  health: EvidenceItem[];
  life: EvidenceItem[];
  schedules: EvidenceItem[];
  followUp: EvidenceItem[];
};
export type ApiHandoff = {
  id: string;
  fromCaregiverId: string;
  toCaregiverId: string;
  fromDate: string;
  toDate: string;
  createdAt: string;
  mode?: string;
  healthSummary: string;
  lifeSummary: string;
  scheduleSummary: string;
  followUp: string;
  evidence?: Partial<
    Record<
      "healthSummary" | "lifeSummary" | "scheduleSummary" | "followUp",
      EvidenceItem[]
    >
  >;
  acknowledgements: { userId: string; acknowledgedAt: string }[];
  regeneratesId: string | null;
};
export type HandoffResult = {
  id: string;
  from: string;
  to: string;
  fromCaregiverId: string;
  toCaregiverId: string;
  createdAt: string;
  mode: string;
  sections: HandoffSections;
  confirmed: boolean;
  regeneratesId: string | null;
};
const lines = (summary: string): EvidenceItem[] =>
  summary
    .split("\n")
    .map((text) => text.trim())
    .filter(Boolean)
    .map((text) => ({ text }));
export const toHandoff = (h: ApiHandoff): HandoffResult => {
  const pick = (
    key: "healthSummary" | "lifeSummary" | "scheduleSummary" | "followUp",
  ) => h.evidence?.[key] ?? lines(h[key] ?? "");
  return {
    id: h.id,
    from: localInput(h.fromDate).slice(0, 10),
    to: localInput(h.toDate).slice(0, 10),
    fromCaregiverId: h.fromCaregiverId,
    toCaregiverId: h.toCaregiverId,
    createdAt: h.createdAt,
    mode: h.mode ?? "",
    sections: {
      health: pick("healthSummary"),
      life: pick("lifeSummary"),
      schedules: pick("scheduleSummary"),
      followUp: pick("followUp"),
    },
    confirmed: h.acknowledgements.some((a) => a.userId === h.toCaregiverId),
    regeneratesId: h.regeneratesId,
  };
};

// ── 날짜 ────────────────────────────────────────────────────
const pad = (n: number) => String(n).padStart(2, "0");
export function day(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
/** ISO 시각을 `datetime-local` 입력값(브라우저 로컬 시간)으로 바꿉니다. */
export const localInput = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
/** `datetime-local` 입력값을 시간대가 포함된 ISO 8601로 바꿉니다. 백엔드는 시간대를 요구합니다. */
export const toIso = (local: string) => new Date(local).toISOString();
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
/** 인수인계 기간(로컬 날짜 2개)을 API의 fromDate/toDate로 바꿉니다. 종료일은 그날 끝, 단 현재를 넘지 않습니다. */
export function handoffRange(from: string, to: string, now = new Date()) {
  const end = new Date(`${to}T23:59:59`);
  return {
    fromDate: new Date(`${from}T00:00:00`).toISOString(),
    toDate: (end > now ? now : end).toISOString(),
  };
}
