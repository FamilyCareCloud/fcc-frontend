import { RealHandoff } from "./RealHandoff";
import { calendarDays } from "./calendar";
import "./records-ux.css";
import { useState, type FormEvent } from "react";
import {
  eventsApi,
  fromBackendEvent,
  toBackendEventType,
  ApiError,
} from "./api";
import {
  day,
  dateLabel,
  eventTypes,
  localInput,
  memberName,
  timeLabel,
  type EventType,
} from "./data";
import { Badge, Empty, Icon, Modal } from "./ui";
import type { RealCtx } from "./RealApp";

const AUTO = "자동 분류" as const;
type RecordKind = EventType | typeof AUTO;

function errMsg(e: unknown, fallback: string) {
  if (e instanceof ApiError) {
    if (e.status === 409) return "다른 가족이 먼저 이 기록을 수정했습니다. 새로고침 후 다시 시도해 주세요.";
    if (e.status === 502) return e.message || "자동 분류에 실패했습니다. 유형을 직접 선택해 주세요.";
    return e.message || fallback;
  }
  return e instanceof Error ? e.message : fallback;
}

function RecordEditor({
  ctx,
  record,
  onClose,
  onSaved,
}: {
  ctx: RealCtx;
  record?: ReturnType<typeof fromBackendEvent> & { version: number };
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [content, setContent] = useState(record?.content ?? "");
  const [kind, setKind] = useState<RecordKind>(record?.type ?? AUTO);
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
      const iso = new Date(timestamp).toISOString();
      if (record) {
        await eventsApi.update(ctx.token, ctx.groupId, record.eventId, {
          content: content.trim(),
          timestamp: iso,
          version: record.version,
          ...(kind !== AUTO ? { type: toBackendEventType(kind) } : {}),
        });
      } else {
        await eventsApi.create(ctx.token, ctx.groupId, {
          content: content.trim(),
          timestamp: iso,
          ...(kind === AUTO ? { analyze: true } : { type: toBackendEventType(kind) }),
        });
      }
      await onSaved();
      onClose();
    } catch (e) {
      setError(errMsg(e, "저장에 실패했습니다. 입력 내용을 유지했으니 다시 시도해 주세요."));
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
        <fieldset disabled={busy} className="form-fields">
          <div className="form-row">
            <label className="field">
              기록 유형
              <select value={kind} onChange={(e) => setKind(e.target.value as RecordKind)}>
                <option value={AUTO}>자동 분류 (AI)</option>
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
                max={localInput(new Date().toISOString())}
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
              {content.length} / 2,000자{kind === AUTO ? " · AI가 자동으로 유형을 분류합니다." : ""}
            </small>
          </label>
          <div className="record-photo"><button type="button" className="secondary" disabled><Icon name="plus" size={17}/>사진 첨부 · 준비 중</button><small>사진과 함께 기록하는 기능을 준비하고 있어요.</small></div>
        </fieldset>
        {error && (
          <p id="record-error" className="error" role="alert">
            {error}
          </p>
        )}
        <div className="actions">
          <button type="button" className="secondary" disabled={busy} onClick={onClose}>
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

export function RealRecords({ ctx, showHandoff, onHandoff }: { ctx: RealCtx; showHandoff: boolean; onHandoff: (open: boolean) => void }) {
  const events = ctx.group.events
    .map((e) => ({ ...fromBackendEvent(e), version: e.version }))
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
  const [period, setPeriod] = useState("오늘");
  const [type, setType] = useState("전체");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [detail, setDetail] = useState<(typeof events)[number] | null>(null);
  const [editing, setEditing] = useState<(typeof events)[number] | null>(null);
  const [openNew, setOpenNew] = useState(false);
  const [deleting, setDeleting] = useState<(typeof events)[number] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const invalidRange = !!(from && to && from > to);
  const today = day();
  const weekStart = calendarDays(today, "week")[0];
  const latest = [...ctx.group.handoffs].sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt))[0];
  const filtered = events.filter((e) => {
    const d = localInput(e.timestamp).slice(0, 10);
    const inPeriod = period === "오늘" ? d === today : period === "이번 주" ? d >= weekStart && d <= today : d < weekStart;
    return inPeriod && (type === "전체" || e.type === type) && (!from || d >= from) && (!to || d <= to);
  });
  const dates = [...new Set(filtered.map(e=>localInput(e.timestamp).slice(0,10)))].sort().reverse();
  const saved = async () => {
    await ctx.reload();
    ctx.notify("돌봄 기록을 저장했습니다.");
  };
  async function remove() {
    if (!deleting || busy) return;
    setBusy(true);
    setError("");
    try {
      await eventsApi.remove(ctx.token, ctx.groupId, deleting.eventId);
      setDeleting(null);
      await ctx.reload();
      ctx.notify("돌봄 기록을 삭제했습니다.");
    } catch (e) {
      setError(errMsg(e, "삭제에 실패했습니다. 다시 시도해 주세요."));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">가족이 함께 남기는 돌봄 이야기</div>
          <h1>돌봄 기록</h1>
          <p>{ctx.group.elder?.name ?? "고령자"} 님의 일상을 가족의 기록으로 이어갑니다.</p>
        </div>
        <button className="primary" onClick={() => setOpenNew(true)}>
          <Icon name="plus" size={18} />
          기록 작성
        </button>
      </div>
      <div className="records-mode"><button className={!showHandoff ? "active" : ""} aria-pressed={!showHandoff} onClick={()=>onHandoff(false)}>돌봄 기록</button><button className={showHandoff ? "active" : ""} aria-pressed={showHandoff} onClick={()=>onHandoff(true)}><Icon name="spark" size={16}/>브리핑·인수인계</button></div>
      {showHandoff ? <section className="records-handoff"><RealHandoff ctx={ctx}/></section> : <div className="records-layout"><div className="records-column">
      <div className="records-period" aria-label="기록 기간">{["오늘","이번 주","지난 기록"].map(p=><button key={p} aria-pressed={period===p} className={period===p?"active":""} onClick={()=>{setPeriod(p);setFrom("");setTo("");}}>{p}</button>)}</div>
      <p className="records-period-note">{period === "오늘" ? dateLabel(today) : period === "이번 주" ? weekStart + " ~ " + today + " · 일요일부터 오늘까지" : weekStart + " 이전의 기록과 처리 이력"}</p>
      <details className="records-filter"><summary>상세 필터 · 유형과 날짜</summary>
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
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label>
          종료 날짜
          <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
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
      </details>
      {invalidRange && (
        <p className="error" role="alert">
          종료 날짜는 시작 날짜 이후로 선택해 주세요.
        </p>
      )}
      <p className="list-count">
        총 <b>{invalidRange ? 0 : filtered.length}</b>개의 기록 · 날짜 최신순, 같은 날짜 안에서는 시간순
      </p>
      <div className="record-list">
        {!invalidRange &&
          dates.map(date => <section className="records-day" key={date}><h2>{dateLabel(date)}</h2>{filtered.filter(e=>localInput(e.timestamp).slice(0,10)===date).sort((a,b)=>Date.parse(a.timestamp)-Date.parse(b.timestamp)).map((e) => (
            <article className="card record" key={e.eventId}>
              <button
                className="record-main"
                onClick={() => setDetail(e)}
                aria-label={`${e.type} 기록 상세: ${e.content}`}
              >
                <span className="record-head">
                  <Badge tone={e.type === "특이사항" ? "orange" : "blue"}>{e.type}</Badge>
                  <small>
                    {memberName(ctx.members, e.createdBy)} · {dateLabel(e.timestamp)} · {timeLabel(e.timestamp)}
                  </small>
                </span>
                <p>{e.content}</p>
                <small>
                  {memberName(ctx.members, e.createdBy)} 작성 · {dateLabel(e.createdAt)} {timeLabel(e.createdAt)}
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
          ))}</section>)}
      </div>
      {(!filtered.length || invalidRange) && (
        <div className="card">
          <Empty text={events.length ? "선택한 조건에 맞는 기록이 없습니다." : undefined}>
            <button className="secondary" onClick={() => setOpenNew(true)}>
              첫 기록 남기기
            </button>
          </Empty>
        </div>
      )}
      </div><aside className="records-brief card"><span className="records-brief-icon"><Icon name="spark" size={25}/></span><p className="eyebrow">다음 보호자에게 전하는 이야기</p><h2>돌봄 브리핑</h2><p>{latest ? [latest.healthSummary, latest.lifeSummary].filter(Boolean).join(" ") || "생성된 인수인계의 상세 내용을 확인해 주세요." : "가족이 남긴 기록을 모아, 다음 돌봄에 필요한 내용을 함께 확인해요."}</p>{latest ? <small>최근 생성 · {dateLabel(latest.createdAt)} {timeLabel(latest.createdAt)}</small> : <small>아직 생성된 인수인계가 없어요.</small>}<button className="soft-button" onClick={()=>onHandoff(true)}>브리핑·인수인계 열기 <Icon name="arrow" size={16}/></button><div className="records-tip"><Icon name="heart" size={17}/><p>식사, 산책, 작은 변화까지.<br/>짧은 기록도 가족에게 도움이 돼요.</p></div></aside></div>}
      {(openNew || editing) && (
        <RecordEditor
          ctx={ctx}
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
            <dd>{memberName(ctx.members, detail.createdBy)}</dd>
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
          <p className="detail-content">삭제 후 되돌릴 수 없습니다.</p>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="actions">
            <button disabled={busy} className="secondary" onClick={() => setDeleting(null)}>
              취소
            </button>
            <button disabled={busy} className="danger" onClick={() => void remove()}>
              {busy ? "삭제 중…" : "삭제"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
