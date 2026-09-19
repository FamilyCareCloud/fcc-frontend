import { useState, type FormEvent } from "react";
import {
  dateLabel,
  eventTypes,
  localInput,
  nameOf,
  timeLabel,
  type CareEvent,
  type EventType,
} from "./data";
import { errorMessage, events as eventsApi } from "./api";
import { Badge, Empty, Icon, Modal } from "./ui";
import type { Shared } from "./App";

export function RecordEditor({
  record,
  groupId,
  onClose,
  onSaved,
  elder,
}: {
  record?: CareEvent;
  groupId: string;
  onClose: () => void;
  onSaved: (warning?: string) => Promise<void>;
  elder: string;
}) {
  const [content, setContent] = useState(record?.content ?? "");
  // 빈 값이면 서버가 내용을 분석해 유형을 자동 분류합니다. 새 기록의 기본값입니다.
  const [type, setType] = useState<EventType>(record?.type ?? "");
  const [timestamp, setTimestamp] = useState(
    localInput(record?.timestamp ?? new Date().toISOString()),
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError("");
    if (!content.trim()) {
      setError("돌봄 내용을 입력해 주세요.");
      return;
    }
    if (!timestamp || !Number.isFinite(Date.parse(timestamp))) {
      setError("발생 시각을 입력해 주세요.");
      return;
    }
    setBusy(true);
    try {
      let warning: string | undefined;
      if (record)
        await eventsApi.update(groupId, record, { type, content, timestamp });
      else
        warning = (
          await eventsApi.create(groupId, { type, content, timestamp })
        ).warning;
      await onSaved(warning);
      onClose();
    } catch (e) {
      setError(
        errorMessage(
          e,
          "저장에 실패했습니다. 입력 내용을 유지했으니 다시 시도해 주세요.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={record ? "돌봄 기록 수정" : "돌봄 기록 남기기"}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form onSubmit={submit} noValidate>
        <div className="inline-note">
          {elder} 님의 돌봄 기록입니다. 가족 그룹 구성원에게 공유됩니다.
        </div>
        <fieldset disabled={busy} className="form-fields">
          <div className="form-row">
            <label className="field">
              기록 유형
              <select
                value={type}
                onChange={(e) => setType(e.target.value as EventType)}
              >
                {!record && <option value="">자동 분류 (AI)</option>}
                {eventTypes.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label className="field">
              발생 시각
              <input
                type="datetime-local"
                required
                value={timestamp}
                onChange={(e) => setTimestamp(e.target.value)}
              />
            </label>
          </div>
          <label className="field">
            돌봄 내용{" "}
            <textarea
              autoFocus
              value={content}
              maxLength={2000}
              onChange={(e) => setContent(e.target.value)}
              placeholder="식사는 어떠셨나요? 병원에 다녀온 내용이나 함께한 일상을 남겨 주세요."
              required
              aria-invalid={!!error}
              aria-describedby="record-error"
            />
            <small>
              {content.length} / 2,000자 · 유형을 '자동 분류'로 두면 AI가 유형을 정합니다.
            </small>
          </label>
        </fieldset>
        {error && (
          <p id="record-error" className="error" role="alert">
            {error}
          </p>
        )}
        <div className="actions">
          <button
            type="button"
            className="secondary"
            disabled={busy}
            onClick={onClose}
          >
            취소
          </button>
          <button type="submit" className="primary" disabled={busy}>
            {busy ? "저장 중…" : "기록 저장"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function Records({
  events,
  reload,
  notify,
  openNew,
  setOpenNew,
  group,
  members,
  me,
}: Pick<
  Shared,
  "events" | "reload" | "notify" | "group" | "members" | "me"
> & {
  openNew: boolean;
  setOpenNew: (v: boolean) => void;
}) {
  const [type, setType] = useState("전체");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [detail, setDetail] = useState<CareEvent | null>(null);
  const [editing, setEditing] = useState<CareEvent | null>(null);
  const [deleting, setDeleting] = useState<CareEvent | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const elder = group.elder?.name ?? "돌봄 대상자";
  const who = (id: string) => nameOf(members, id);
  const mine = (e: CareEvent) => !e.system && e.createdBy === me.userId;
  const invalidRange = !!(from && to && from > to);
  const filtered = events.filter((e) => {
    const d = localInput(e.timestamp).slice(0, 10);
    return (
      (type === "전체" || e.type === type) &&
      (!from || d >= from) &&
      (!to || d <= to)
    );
  });
  const saved = async (warning?: string) => {
    await reload();
    notify(warning ?? "돌봄 기록을 저장했습니다.");
  };
  async function remove() {
    if (!deleting || busy) return;
    setBusy(true);
    setError("");
    try {
      await eventsApi.remove(group.id, deleting.eventId);
      setDeleting(null);
      await reload();
      notify("돌봄 기록을 삭제했습니다.");
    } catch (e) {
      setError(errorMessage(e, "삭제에 실패했습니다. 다시 시도해 주세요."));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">CARE TIMELINE</div>
          <h1>돌봄 기록</h1>
          <p>{elder} 님의 일상을 가족의 기록으로 이어갑니다.</p>
        </div>
        <button className="primary" onClick={() => setOpenNew(true)}>
          <Icon name="plus" size={18} />
          기록 작성
        </button>
      </div>
      <section className="card filters" aria-label="기록 필터">
        <label>
          기록 유형
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option>전체</option>
            {eventTypes.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label>
          시작 날짜
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label>
          종료 날짜
          <input
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        <button
          className="secondary"
          onClick={() => {
            setType("전체");
            setFrom("");
            setTo("");
          }}
        >
          초기화
        </button>
      </section>
      {invalidRange && (
        <p className="error" role="alert">
          종료 날짜는 시작 날짜 이후로 선택해 주세요.
        </p>
      )}
      <p className="list-count">
        총 <b>{invalidRange ? 0 : filtered.length}</b>개의 기록 · 발생 시각
        최신순
      </p>
      <div className="record-list">
        {!invalidRange &&
          filtered.map((e) => (
            <article className="card record" key={e.eventId}>
              <button
                className="record-main"
                onClick={() => setDetail(e)}
                aria-label={`${e.type} 기록 상세: ${e.content}`}
              >
                <span className="record-head">
                  <Badge tone={e.type === "특이사항" ? "orange" : "blue"}>
                    {e.type}
                  </Badge>
                  <small>
                    {dateLabel(e.timestamp)} · {timeLabel(e.timestamp)}
                  </small>
                </span>
                <p>{e.content}</p>
                <small>
                  {e.system ? "시스템 이력" : `${who(e.createdBy)} 작성`} ·{" "}
                  {dateLabel(e.createdAt)}{" "}
                  {timeLabel(e.createdAt)}
                </small>
              </button>
              {mine(e) && (
              <div className="record-actions">
                <button
                  className="icon-button"
                  aria-label={`${e.type} 기록 수정`}
                  onClick={() => setEditing(e)}
                >
                  <Icon name="edit" size={18} />
                </button>
                <button
                  className="icon-button"
                  aria-label={`${e.type} 기록 삭제`}
                  onClick={() => {
                    setError("");
                    setDeleting(e);
                  }}
                >
                  <Icon name="trash" size={18} />
                </button>
              </div>
              )}
            </article>
          ))}
      </div>
      {(!filtered.length || invalidRange) && (
        <div className="card">
          <Empty
            text={
              events.length ? "선택한 조건에 맞는 기록이 없습니다." : undefined
            }
          >
            <button className="secondary" onClick={() => setOpenNew(true)}>
              첫 기록 남기기
            </button>
          </Empty>
        </div>
      )}
      {(openNew || editing) && (
        <RecordEditor
          groupId={group.id}
          elder={elder}
          record={editing ?? undefined}
          onClose={() => {
            setOpenNew(false);
            setEditing(null);
          }}
          onSaved={saved}
        />
      )}
      {detail && (
        <Modal title="돌봄 기록 상세" onClose={() => setDetail(null)}>
          <Badge>{detail.type}</Badge>
          <p className="detail-content section-gap">{detail.content}</p>
          <dl className="detail-meta">
            <dt>발생 시각</dt>
            <dd>
              {dateLabel(detail.timestamp)} {timeLabel(detail.timestamp)}
            </dd>
            <dt>작성자</dt>
            <dd>{detail.system ? "시스템" : who(detail.createdBy)}</dd>
            <dt>작성 시각</dt>
            <dd>
              {dateLabel(detail.createdAt)} {timeLabel(detail.createdAt)}
            </dd>
          </dl>
          <div className="actions">
            {mine(detail) && (
              <button
                className="secondary"
                onClick={() => {
                  setEditing(detail);
                  setDetail(null);
                }}
              >
                수정
              </button>
            )}
            <button className="primary" onClick={() => setDetail(null)}>
              닫기
            </button>
          </div>
        </Modal>
      )}
      {deleting && (
        <Modal
          title="돌봄 기록을 삭제할까요?"
          onClose={() => {
            if (!busy) setDeleting(null);
          }}
        >
          <p className="detail-content">
            이 돌봄 기록을 삭제합니다. 삭제 후 되돌릴 수 없습니다.
          </p>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="actions">
            <button
              disabled={busy}
              className="secondary"
              onClick={() => setDeleting(null)}
            >
              취소
            </button>
            <button
              disabled={busy}
              className="danger"
              onClick={() => void remove()}
            >
              {busy ? "삭제 중…" : "삭제"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
