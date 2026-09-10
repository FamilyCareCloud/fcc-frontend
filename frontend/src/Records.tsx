import { useState, type FormEvent } from "react";
import {
  dateLabel,
  eventTypes,
  getCareApi,
  localInput,
  memberName,
  timeLabel,
  type CareEvent,
  type EventInput,
  type EventType,
} from "./data";
import { Badge, Empty, Icon, Modal } from "./ui";
import type { Shared } from "./App";

export function RecordEditor({
  record,
  onClose,
  onSaved,
  elder,
}: {
  record?: CareEvent;
  onClose: () => void;
  onSaved: () => Promise<void>;
  elder: string;
}) {
  const [content, setContent] = useState(record?.content ?? "");
  const [type, setType] = useState<EventType>(record?.type ?? "생활");
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
      await getCareApi().save(
        { type, content, timestamp } satisfies EventInput,
        record?.eventId,
      );
      await onSaved();
      onClose();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "저장에 실패했습니다. 입력 내용을 유지했으니 다시 시도해 주세요.",
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
          {elder} 님의 가상 돌봄 기록입니다. 이 브라우저에만 저장됩니다.
        </div>
        <fieldset disabled={busy} className="form-fields">
          <div className="form-row">
            <label className="field">
              기록 유형
              <select
                value={type}
                onChange={(e) => setType(e.target.value as EventType)}
              >
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
              {content.length} / 2,000자 · AI 자동 분류는 추후 연결됩니다.
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
  elder,
}: Pick<Shared, "events" | "reload" | "notify" | "elder"> & {
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
  const [resetMode, setResetMode] = useState<"empty" | "seed" | null>(null);
  const invalidRange = !!(from && to && from > to);
  const filtered = events.filter((e) => {
    const d = localInput(e.timestamp).slice(0, 10);
    return (
      (type === "전체" || e.type === type) &&
      (!from || d >= from) &&
      (!to || d <= to)
    );
  });
  const saved = async () => {
    await reload();
    notify("가상 돌봄 기록을 저장했습니다.");
  };
  async function remove() {
    if (!deleting || busy) return;
    setBusy(true);
    setError("");
    try {
      await getCareApi().remove(deleting.eventId);
      setDeleting(null);
      await reload();
      notify("가상 돌봄 기록을 삭제했습니다.");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "삭제에 실패했습니다. 다시 시도해 주세요.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function reset() {
    if (!resetMode || busy) return;
    setBusy(true);
    setError("");
    try {
      await getCareApi().reset(resetMode === "empty");
      await reload();
      setResetMode(null);
      notify("가상 기록을 초기화했습니다.");
    } catch {
      setError(
        "가상 기록 초기화에 실패했습니다. 브라우저 저장 권한을 확인해 주세요.",
      );
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
                  {memberName(e.createdBy)} 작성 · {dateLabel(e.createdAt)}{" "}
                  {timeLabel(e.createdAt)}
                </small>
              </button>
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
      <details className="demo-tools">
        <summary>시연 도구 · 가상 데이터 및 오류 상태 확인</summary>
        <div>
          <button
            onClick={() => {
              getCareApi().failNext("save");
              notify(
                "다음 기록 저장이 한 번 실패합니다. 작성 또는 수정 후 저장해 보세요.",
              );
            }}
          >
            다음 저장 실패시키기
          </button>
          <button
            onClick={() => {
              getCareApi().failNext("load");
              void reload();
            }}
          >
            조회 실패 확인
          </button>
          <button
            onClick={() => {
              setError("");
              setResetMode("empty");
            }}
          >
            빈 목록 만들기
          </button>
          <button
            onClick={() => {
              setError("");
              setResetMode("seed");
            }}
          >
            예시 기록으로 초기화
          </button>
        </div>
        <p>
          가상 기록은 새로고침 후에도 이 브라우저에 남습니다. 다른 시연 정보는
          새로고침하면 초기화됩니다.
        </p>
      </details>
      {(openNew || editing) && (
        <RecordEditor
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
            <dd>{memberName(detail.createdBy)}</dd>
            <dt>작성 시각</dt>
            <dd>
              {dateLabel(detail.createdAt)} {timeLabel(detail.createdAt)}
            </dd>
          </dl>
          <div className="actions">
            <button
              className="secondary"
              onClick={() => {
                setEditing(detail);
                setDetail(null);
              }}
            >
              수정
            </button>
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
            이 브라우저의 가상 기록을 삭제합니다. 삭제 후 되돌릴 수 없습니다.
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
      {resetMode && (
        <Modal
          title={
            resetMode === "empty"
              ? "가상 기록을 모두 비울까요?"
              : "예시 기록으로 되돌릴까요?"
          }
          onClose={() => {
            if (!busy) setResetMode(null);
          }}
        >
          <p className="detail-content">
            직접 작성한 가상 기록도 초기화됩니다.
          </p>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="actions">
            <button
              className="secondary"
              disabled={busy}
              onClick={() => setResetMode(null)}
            >
              취소
            </button>
            <button
              className="danger"
              disabled={busy}
              onClick={() => void reset()}
            >
              초기화
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
