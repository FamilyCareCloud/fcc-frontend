import test from "node:test";
import assert from "node:assert/strict";
import {
  eventCode,
  eventLabel,
  handoffRange,
  kindCode,
  kindLabel,
  statusCode,
  statusLabel,
  toEvent,
  toHandoff,
  toIso,
  toMember,
  toSchedule,
  nameOf,
} from "./src/data.ts";

test("event types map both ways; unknown backend types keep their code", () => {
  for (const [label, code] of [
    ["병원", "hospital"],
    ["복약", "medication"],
    ["식사", "meal"],
    ["생활", "life"],
    ["일정", "schedule"],
    ["특이사항", "observation"],
  ]) {
    assert.equal(eventCode(label), code);
    assert.equal(eventLabel(code), label);
  }
  assert.equal(eventLabel("homecoming"), "귀가");
  assert.equal(eventLabel("brand_new"), "brand_new");
  assert.equal(eventCode("자동"), undefined);
});

test("schedule kinds and statuses round-trip", () => {
  for (const kind of ["병원", "검사", "가족 방문", "돌봄센터", "복약", "기타"])
    assert.equal(kindLabel(kindCode(kind)), kind);
  assert.equal(kindCode("알 수 없음"), "other");
  for (const s of ["예정", "완료", "취소"])
    assert.equal(statusLabel(statusCode(s)), s);
});

test("toEvent flags system history and toSchedule converts labels", () => {
  const base = {
    id: "e1",
    elderId: "el",
    type: "meal",
    content: "아침",
    timestamp: "2026-09-10T00:00:00.000Z",
    createdAt: "2026-09-10T00:01:00.000Z",
    createdBy: "u1",
    version: 2,
  };
  assert.equal(toEvent({ ...base, source: "system" }).system, true);
  const e = toEvent({ ...base, source: "caregiver" });
  assert.deepEqual([e.eventId, e.type, e.system, e.version], ["e1", "식사", false, 2]);
  const s = toSchedule({
    id: "s1",
    title: "진료",
    type: "care_center",
    scheduledAt: "2026-09-12T01:00:00.000Z",
    caregiverId: "u1",
    status: "cancelled",
    version: 3,
  });
  assert.deepEqual([s.scheduleId, s.kind, s.status, s.version], ["s1", "돌봄센터", "취소", 3]);
});

test("members: elder role cannot be assigned care; unknown ids get a safe name", () => {
  const list = [
    toMember({ memberId: "m1", userId: "u1", role: "owner", joinedAt: "", name: "지은" }, 0),
    toMember({ memberId: "m2", userId: "u2", role: "elder", joinedAt: "", name: "영숙" }, 1),
  ];
  assert.equal(list[0].isOwner, true);
  assert.equal(list[1].canCare, false);
  assert.equal(nameOf(list, "u1"), "지은");
  assert.equal(nameOf(list, "zzz"), "알 수 없는 보호자");
});

test("toHandoff prefers evidence, falls back to summary lines, and reads acknowledgement", () => {
  const api = {
    id: "h1",
    fromCaregiverId: "u1",
    toCaregiverId: "u2",
    fromDate: "2026-09-01T00:00:00+09:00",
    toDate: "2026-09-08T00:00:00+09:00",
    createdAt: "2026-09-08T01:00:00.000Z",
    healthSummary: "a\nb",
    lifeSummary: "",
    scheduleSummary: "",
    followUp: "확인",
    evidence: { healthSummary: [{ text: "a", quote: "원문" }] },
    acknowledgements: [{ userId: "u1", acknowledgedAt: "x" }],
    regeneratesId: null,
  };
  const r = toHandoff(api);
  assert.deepEqual(r.sections.health, [{ text: "a", quote: "원문" }]);
  assert.deepEqual(r.sections.followUp, [{ text: "확인" }]);
  assert.deepEqual(r.sections.life, []);
  assert.equal(r.confirmed, false); // 인수 보호자(u2)가 아닌 사람의 확인은 무시
  const acked = toHandoff({
    ...api,
    acknowledgements: [{ userId: "u2", acknowledgedAt: "x" }],
  });
  assert.equal(acked.confirmed, true);
});

test("timestamps sent to the API always carry a timezone; handoff range never exceeds now", () => {
  assert.match(toIso("2026-09-10T08:30"), /Z$/);
  const now = new Date("2026-09-10T12:00:00");
  const r = handoffRange("2026-09-03", "2026-09-10", now);
  assert.equal(r.toDate, now.toISOString()); // 오늘의 끝이 아니라 현재
  assert.equal(r.fromDate, new Date("2026-09-03T00:00:00").toISOString());
  const past = handoffRange("2026-09-01", "2026-09-05", now);
  assert.equal(past.toDate, new Date("2026-09-05T23:59:59").toISOString());
});
