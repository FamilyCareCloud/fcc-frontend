import { ScheduleCalendar, CalendarToolbar } from "./ScheduleCalendar";
import { calendarDays, type CalendarView } from "./calendar";
import "./schedule-calendar.css";
import { useEffect, useState, type FormEvent } from "react";
import {
  approvalsApi,
  fromBackendSchedule,
  scheduleKinds,
  schedulesApi,
  toBackendScheduleType,
  toBackendStatus,
  ApiError,
  type Approval,
  type ApprovalAction,
} from "./api";
import { dateLabel, day, localInput, memberName, timeLabel, type Schedule } from "./data";
import { Badge, Empty, Icon, Modal } from "./ui";
import type { RealCtx } from "./RealApp";

function errMsg(e: unknown, fallback: string) {
  if (e instanceof ApiError) {
    if (e.status === 409) return "다른 가족이 먼저 이 일정을 수정했습니다. 새로고침 후 다시 시도해 주세요.";
    return e.message || fallback;
  }
  return e instanceof Error ? e.message : fallback;
}

const APPROVAL_ACTION_LABEL: Record<ApprovalAction, string> = {
  cancel: "취소",
  reschedule: "일정 변경",
};
export function RealSchedules({ ctx }: { ctx: RealCtx }) {
  const schedules = ctx.group.schedules.map((s) => ({
    ...fromBackendSchedule(s),
    version: s.version,
  }));
  const isCurrentCaregiver = ctx.group.primaryCaregiverId === ctx.session.user.userId;
  const [view, setView] = useState<CalendarView>("day");
  const [selectedDate, setSelectedDate] = useState(day);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [filter, setFilter] = useState("전체");
  const [editing, setEditing] = useState<(typeof schedules)[number] | "new" | null>(null);
  const [deleting, setDeleting] = useState<(typeof schedules)[number] | null>(null);
  const [requesting, setRequesting] = useState<(typeof schedules)[number] | null>(null);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loadApprovals = () => {
    approvalsApi
      .list(ctx.token, ctx.groupId)
      .then(setApprovals)
      .catch(() => {});
  };
  useEffect(loadApprovals, [ctx.token, ctx.groupId]);

  const filtered = schedules.filter(s => filter === "전체" || s.status === filter);
  const range = calendarDays(selectedDate, view);
  const visible = filtered.filter(s => {
    const key = localInput(s.scheduledAt).slice(0,10);
    return view === "month" ? key.slice(0,7) === selectedDate.slice(0,7) : range.includes(key);
  }).sort((a,b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt));
  const detail = schedules.find(s => s.scheduleId === detailId);
  const pending = approvals.filter((a) => a.status === "pending");

  async function changeStatus(s: (typeof schedules)[number], status: Schedule["status"]) {
    setError("");
    try {
      await schedulesApi.update(ctx.token, ctx.groupId, s.scheduleId, {
        status: toBackendStatus(status),
        version: s.version,
      });
      await ctx.reload();
      ctx.notify("일정 상태를 변경했습니다.");
    } catch (e) {
      setError(errMsg(e, "상태 변경에 실패했습니다."));
    }
  }

  async function remove() {
    if (!deleting || busy) return;
    setBusy(true);
    setError("");
    try {
      await schedulesApi.remove(ctx.token, ctx.groupId, deleting.scheduleId);
      setDeleting(null);
      await ctx.reload();
      ctx.notify("일정을 삭제했습니다.");
    } catch (e) {
      setError(errMsg(e, "삭제에 실패했습니다."));
    } finally {
      setBusy(false);
    }
  }

  async function decide(id: string, decision: "approve" | "reject" | "call") {
    try {
      await approvalsApi.decide(ctx.token, ctx.groupId, id, decision);
      loadApprovals();
      await ctx.reload();
      ctx.notify("승인 요청을 처리했습니다.");
    } catch (e) {
      setError(errMsg(e, "승인 처리에 실패했습니다."));
    }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">가족과 함께 챙기는 하루</div>
          <h1>일정</h1>
          <p>병원 진료부터 가족 방문까지, 함께 챙기는 약속</p>
        </div>
        <button className="primary" onClick={() => setEditing("new")}>
          <Icon name="plus" size={18} />
          일정 추가하기
        </button>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {isCurrentCaregiver && pending.length > 0 && (
        <section className="card section-gap">
          <div className="section-head">
            <h2>
              <Icon name="file" />
              결재 대기함
            </h2>
            <Badge tone="orange">{pending.length}건 대기</Badge>
          </div>
          {pending.map((a) => {
            const target = schedules.find((s) => s.scheduleId === a.scheduleId);
            return (
              <div className="history-item" key={a.id}>
                <span>
                  <strong>{target?.title ?? "삭제된 일정"}</strong> ·{" "}
                  {APPROVAL_ACTION_LABEL[a.requestedAction]}
                  {a.proposedAt ? ` · ${dateLabel(a.proposedAt)} ${timeLabel(a.proposedAt)}` : ""}
                  {a.contactRequestedAt && <Badge tone="orange">연락 요청됨</Badge>}
                  <br />
                  <small>{a.reason}</small>
                </span>
                <span className="button-row">
                  <button className="secondary" onClick={() => void decide(a.id, "reject")}>
                    거절
                  </button>
                  <button className="secondary" onClick={() => void decide(a.id, "call")}>
                    연락 필요
                  </button>
                  <button className="primary" onClick={() => void decide(a.id, "approve")}>
                    승인
                  </button>
                </span>
              </div>
            );
          })}
        </section>
      )}
      <CalendarToolbar date={selectedDate} view={view} onDate={setSelectedDate} onView={setView} />
      <div className="cal-filter-row"><div className="tabs" aria-label="일정 필터">
        {["전체", "예정", "완료", "취소"].map((t) => (
          <button
            key={t}
            aria-pressed={filter === t}
            className={filter === t ? "selected" : ""}
            onClick={() => setFilter(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="cal-legend"><span><i className="medical"/>진료·검사</span><span><i className="medication"/>복약</span><span><i className="daily"/>기타 일정</span></div></div>
      <section className="card cal-panel">
        <div className="cal-summary"><strong>{view === "day" ? "선택한 날짜" : view === "week" ? "선택한 주" : "선택한 달"}의 일정 <b>{visible.length}건</b></strong><span>{view === "week" ? "이전·다음 시간 버튼으로 시간대를 바꿔 보세요." : "일정을 누르면 상세 내용을 확인할 수 있어요."}</span></div>
        <ScheduleCalendar date={selectedDate} view={view} schedules={filtered} onSelectDate={d=>{setSelectedDate(d);setView("day");}} onSelectEvent={setDetailId}/>
      </section>
      <h2 className="cal-list-title">{view === "day" ? "하루" : "선택한 기간"} 일정 목록</h2>
      <div className="record-list">
        {visible.map((s) => {
          const myPending = approvals.find((a) => a.scheduleId === s.scheduleId && a.status === "pending");
          return (
            <article className="card schedule-row" key={s.scheduleId}>
              <span className="date-tile">
                <small>{new Date(s.scheduledAt).getMonth() + 1}월</small>
                <b>{new Date(s.scheduledAt).getDate()}</b>
              </span>
              <div className="schedule-info">
                <div className="record-head">
                  <h2>{s.title}</h2>
                  <Badge
                    tone={s.status === "완료" ? "green" : s.status === "취소" ? "orange" : "blue"}
                  >
                    {s.status}
                  </Badge>
                  {myPending && <Badge tone="orange">{APPROVAL_ACTION_LABEL[myPending.requestedAction]} 요청 중</Badge>}
                </div>
                <p>
                  {dateLabel(s.scheduledAt)} {timeLabel(s.scheduledAt)} · {s.kind} · 담당{" "}
                  {memberName(ctx.members, s.caregiverId)}
                </p>
              </div>
              {isCurrentCaregiver ? (
                <label className="status-control">
                  <span className="sr-only">{s.title} 상태</span>
                  <select
                    value={s.status}
                    onChange={(e) => void changeStatus(s, e.target.value as Schedule["status"])}
                  >
                    {["예정", "완료", "취소"].map((status) => (
                      <option key={status}>{status}</option>
                    ))}
                  </select>
                </label>
              ) : (
                !myPending && (
                  <button className="secondary" onClick={() => setRequesting(s)}>
                    취소·변경 요청
                  </button>
                )
              )}
              <div className="record-actions">
                <button className="icon-button" aria-label={`${s.title} 수정`} onClick={() => setEditing(s)}>
                  <Icon name="edit" size={18} />
                </button>
                <button className="icon-button" aria-label={`${s.title} 삭제`} onClick={() => setDeleting(s)}>
                  <Icon name="trash" size={18} />
                </button>
              </div>
            </article>
          );
        })}
      </div>
      {!visible.length && (
        <div className="card">
          <Empty text="해당하는 일정이 없습니다." />
        </div>
      )}
      {detail && <Modal title="일정 상세" onClose={()=>setDetailId(null)}>
        <Badge tone="green">{detail.kind} · {detail.status}</Badge><h3 className="cal-detail-title">{detail.title}</h3>
        <p>{dateLabel(detail.scheduledAt)} {timeLabel(detail.scheduledAt)}</p><p>담당 보호자 · {memberName(ctx.members,detail.caregiverId)}</p>
        <div className="actions"><button className="secondary" onClick={()=>setDetailId(null)}>닫기</button><button className="primary" onClick={()=>{setEditing(detail);setDetailId(null);}}>수정하기</button></div>
      </Modal>}
      {editing && (
        <ScheduleEditor
          ctx={ctx}
          initial={editing === "new" ? undefined : editing}
          selectedDate={selectedDate}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await ctx.reload();
            ctx.notify("일정을 저장했습니다.");
          }}
        />
      )}
      {requesting && (
        <ApprovalRequestModal
          ctx={ctx}
          schedule={requesting}
          onClose={() => setRequesting(null)}
          onSaved={() => {
            setRequesting(null);
            loadApprovals();
            ctx.notify("승인 요청을 보냈습니다.");
          }}
        />
      )}
      {deleting && (
        <Modal title="일정을 삭제할까요?" onClose={() => setDeleting(null)}>
          <p className="detail-content">{deleting.title}</p>
          <p className="inline-note">취소 이력을 남기려면 삭제 대신 상태를 '취소'로 변경해 주세요.</p>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="actions">
            <button disabled={busy} className="secondary" onClick={() => setDeleting(null)}>
              돌아가기
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

function ScheduleEditor({
  selectedDate,
  ctx,
  initial,
  onClose,
  onSaved,
}: {
  ctx: RealCtx;
  initial?: Schedule & { version: number };
  selectedDate: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [scheduledAt, setAt] = useState(initial ? localInput(initial.scheduledAt) : `${selectedDate}T10:00`);
  const [caregiverId, setCaregiver] = useState(initial?.caregiverId ?? ctx.members[0]?.id ?? "");
  const [kind, setKind] = useState(initial?.kind ?? "병원");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!title.trim() || !scheduledAt || !caregiverId) {
      setError("일정명, 날짜·시간, 담당 보호자를 입력해 주세요.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const iso = new Date(scheduledAt).toISOString();
      if (initial) {
        await schedulesApi.update(ctx.token, ctx.groupId, initial.scheduleId, {
          title: title.trim(),
          scheduledAt: iso,
          caregiverId,
          type: toBackendScheduleType(kind),
          version: initial.version,
        });
      } else {
        await schedulesApi.create(ctx.token, ctx.groupId, {
          title: title.trim(),
          scheduledAt: iso,
          caregiverId,
          type: toBackendScheduleType(kind),
        });
      }
      await onSaved();
    } catch (e) {
      setError(errMsg(e, "저장에 실패했습니다."));
      setBusy(false);
    }
  }
  return (
    <Modal title={initial ? "일정 수정" : "새 일정 등록"} onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <label className="field">
          일정명
          <input
            autoFocus
            maxLength={100}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 내과 정기 진료"
            required
          />
        </label>
        <div className="form-row">
          <label className="field">
            종류
            <select value={kind} onChange={(e) => setKind(e.target.value)}>
              {scheduleKinds.map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
          </label>
          <label className="field">
            날짜·시간
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setAt(e.target.value)}
              required
            />
          </label>
        </div>
        <label className="field">
          담당 보호자
          <select value={caregiverId} onChange={(e) => setCaregiver(e.target.value)}>
            {ctx.members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.relation})
              </option>
            ))}
          </select>
        </label>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <div className="actions">
          <button type="button" className="secondary" disabled={busy} onClick={onClose}>
            취소
          </button>
          <button className="primary" type="submit" disabled={busy}>
            {busy ? "저장 중…" : "일정 저장"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ApprovalRequestModal({
  ctx,
  schedule,
  onClose,
  onSaved,
}: {
  ctx: RealCtx;
  schedule: Schedule;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [action, setAction] = useState<ApprovalAction>("cancel");
  const [reason, setReason] = useState("");
  const [proposedAt, setProposedAt] = useState(localInput(schedule.scheduledAt));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!reason.trim()) {
      setError("요청 사유를 입력해 주세요.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await approvalsApi.create(ctx.token, ctx.groupId, {
        scheduleId: schedule.scheduleId,
        action,
        reason: reason.trim(),
        ...(action === "reschedule" ? { proposedAt: new Date(proposedAt).toISOString() } : {}),
      });
      onSaved();
    } catch (e) {
      setError(errMsg(e, "요청을 보내지 못했습니다."));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={`"${schedule.title}" 취소·변경 요청`} onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <label className="field">
          요청 종류
          <select value={action} onChange={(e) => setAction(e.target.value as ApprovalAction)}>
            <option value="cancel">취소</option>
            <option value="reschedule">일정 변경</option>
          </select>
        </label>
        {action === "reschedule" && (
          <label className="field">
            변경 희망 일시
            <input
              type="datetime-local"
              value={proposedAt}
              onChange={(e) => setProposedAt(e.target.value)}
              required
            />
          </label>
        )}
        <label className="field">
          사유
          <textarea
            autoFocus
            value={reason}
            maxLength={500}
            onChange={(e) => setReason(e.target.value)}
            required
          />
        </label>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <div className="actions">
          <button type="button" className="secondary" disabled={busy} onClick={onClose}>
            취소
          </button>
          <button className="primary" type="submit" disabled={busy}>
            {busy ? "요청 중…" : "요청 보내기"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
