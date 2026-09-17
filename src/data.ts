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
