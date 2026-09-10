import test from "node:test";
import assert from "node:assert/strict";
import { createMockCareApi } from "./src/data.ts";

const makeStorage = () => {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
};
const input = {
  type: "생활",
  content: "테스트용 가상 기록",
  timestamp: "2026-09-10T08:30:00+09:00",
};

test("records survive a new API instance; edit preserves author and creation time", async () => {
  const storage = makeStorage();
  const api = createMockCareApi(storage, 0);
  await api.reset(true);
  const saved = await api.save(input);
  const reloaded = createMockCareApi(storage, 0);
  assert.equal((await reloaded.list())[0].eventId, saved.eventId);
  const edited = await reloaded.save(
    { ...input, content: "수정된 가상 기록" },
    saved.eventId,
  );
  assert.equal(edited.createdBy, saved.createdBy);
  assert.equal(edited.createdAt, saved.createdAt);
  assert.equal(edited.timestamp, "2026-09-09T23:30:00.000Z");
  assert.equal((await api.list()).length, 1);
  await api.remove(saved.eventId);
  assert.deepEqual(await api.list(), []);
});
test("failed save leaves prior records untouched and retry succeeds once", async () => {
  const api = createMockCareApi(makeStorage(), 0);
  await api.reset(true);
  api.failNext("save");
  await assert.rejects(api.save(input), /입력 내용을 유지/);
  assert.deepEqual(await api.list(), []);
  await api.save(input);
  assert.equal((await api.list()).length, 1);
});
test("blank content, invalid date and missing edit target are rejected", async () => {
  const api = createMockCareApi(makeStorage(), 0);
  await api.reset(true);
  await assert.rejects(
    api.save({ ...input, content: "  " }),
    /돌봄 내용을 입력/,
  );
  await assert.rejects(
    api.save({ ...input, timestamp: "invalid" }),
    /발생 시각/,
  );
  await assert.rejects(api.save(input, "missing"), /찾을 수 없습니다/);
  assert.deepEqual(await api.list(), []);
});
test("load failure is recoverable and does not erase stored records", async () => {
  const api = createMockCareApi(makeStorage(), 0);
  const before = await api.list();
  api.failNext("load");
  await assert.rejects(api.list(), /불러올 수 없습니다/);
  assert.deepEqual(await api.list(), before);
});
test("damaged local storage is not silently overwritten", async () => {
  let raw = '[{"invalid":true}]';
  const api = createMockCareApi(
    {
      getItem: () => raw,
      setItem: (_key, value) => {
        raw = value;
      },
    },
    0,
  );
  await assert.rejects(api.list(), /가상 기록을 읽을 수 없습니다/);
  await assert.rejects(api.save(input), /가상 기록을 읽을 수 없습니다/);
  assert.equal(raw, '[{"invalid":true}]');
  await api.reset(true);
  assert.deepEqual(await api.list(), []);
});
test("records are ordered by event time rather than creation time", async () => {
  const api = createMockCareApi(makeStorage(), 0);
  await api.reset(true);
  const recent = await api.save({
    ...input,
    timestamp: "2026-09-10T10:00:00+09:00",
  });
  await api.save({ ...input, timestamp: "2026-09-08T10:00:00+09:00" });
  assert.equal((await api.list())[0].eventId, recent.eventId);
});
