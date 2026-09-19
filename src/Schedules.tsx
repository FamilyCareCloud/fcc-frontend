import { useState, type FormEvent } from "react";
import {
  dateLabel,
  day,
  localInput,
  nameOf,
  scheduleKinds,
  scheduleStatuses,
  timeLabel,
  type Schedule,
  type ScheduleStatus,
} from "./data";
import {
  errorMessage,
  schedules as schedulesApi,
  type ScheduleInput,
} from "./api";
import { Badge, Empty, Icon, Modal } from "./ui";
import type { Shared } from "./App";

export function Schedules({
  schedules,
  group,
  members,
  reload,
  notify,
}: Pick<Shared, "schedules" | "group" | "members" | "reload" | "notify">) {
  const [filter, setFilter] = useState("전체");
  const [editing, setEditing] = useState<Schedule | "new" | null>(null);
  const [deleting, setDeleting] = useState<Schedule | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const who = (id: string) => nameOf(members, id);
  const visible = schedules
    .filter(
      (s) =>
        filter === "전체" ||
        (filter === "오늘"
          ? localInput(s.scheduledAt).startsWith(day())
          : s.status === filter),
    )
    .sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt));
  async function changeStatus(s: Schedule, status: ScheduleStatus) {
    if (busy || status === s.status) return;
    setBusy(true);
    setError("");
    try {
      await schedulesApi.setStatus(group.id, s, status);
      await reload();
      notify("일정 상태를 변경했습니다.");
    } catch (e) {
      setError(errorMessage(e, "상태를 변경하지 못했습니다."));
      // 409(다른 가족이 먼저 변경)일 수 있으므로 최신 상태로 맞춥니다.
      await reload();
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!deleting || busy) return;
    setBusy(true);
    setError("");
    try {
      await schedulesApi.remove(group.id, deleting.scheduleId);
      setDeleting(null);
      await reload();
      notify("일정을 삭제했습니다.");
    } catch (e) {
      setError(errorMessage(e, "일정을 삭제하지 못했습니다."));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">FAMILY SCHEDULE</div>
          <h1>일정</h1>
          <p>병원 진료부터 가족 방문까지, 함께 챙기는 약속</p>
        </div>
        <button className="primary" onClick={() => setEditing("new")}>
          <Icon name="plus" size={18} />
          일정 등록
        </button>
      </div>
      <div className="tabs" aria-label="일정 필터">
        {["전체", "오늘", ...scheduleStatuses].map((t) => (
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
      {error && !deleting && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="record-list">
        {visible.map((s) => (
          <article className="card schedule-row" key={s.scheduleId}>
            <span className="date-tile">
              <small>{new Date(s.scheduledAt).getMonth() + 1}월</small>
              <b>{new Date(s.scheduledAt).getDate()}</b>
            </span>
            <div className="schedule-info">
              <div className="record-head">
                <h2>{s.title}</h2>
                <Badge
                  tone={
                    s.status === "완료"
                      ? "green"
                      : s.status === "취소"
                        ? "orange"
                        : "blue"
                  }
                >
                  {s.status}
                </Badge>
              </div>
              <p>
                {dateLabel(s.scheduledAt)} {timeLabel(s.scheduledAt)} · {s.kind}{" "}
                · 담당 {who(s.caregiverId)}
              </p>
            </div>
            <label className="status-control">
              <span className="sr-only">{s.title} 상태</span>
              <select
                value={s.status}
                disabled={busy}
                onChange={(e) =>
                  void changeStatus(s, e.target.value as ScheduleStatus)
                }
              >
                {scheduleStatuses.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </label>
            <div className="record-actions">
              <button
                className="icon-button"
                aria-label={`${s.title} 수정`}
                onClick={() => setEditing(s)}
              >
                <Icon name="edit" size={18} />
              </button>
              <button
                className="icon-button"
                aria-label={`${s.title} 삭제`}
                onClick={() => {
                  setError("");
                  setDeleting(s);
                }}
              >
                <Icon name="trash" size={18} />
              </button>
            </div>
          </article>
        ))}
      </div>
      {!visible.length && (
        <div className="card">
          <Empty text="해당하는 일정이 없습니다." />
        </div>
      )}
      {editing && (
        <ScheduleEditor
          initial={editing === "new" ? undefined : editing}
          groupId={group.id}
          defaultCaregiver={group.primaryCaregiverId}
          members={members}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await reload();
            notify("일정을 저장했습니다.");
          }}
        />
      )}
      {deleting && (
        <Modal
          title="일정을 삭제할까요?"
          onClose={() => {
            if (!busy) setDeleting(null);
          }}
        >
          <p className="detail-content">{deleting.title}</p>
          <p className="inline-note">
            취소 이력을 남기려면 삭제 대신 상태를 ‘취소’로 변경해 주세요.
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
              onClick={() => setDeleting(null)}
            >
              돌아가기
            </button>
            <button
              className="danger"
              disabled={busy}
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
function ScheduleEditor({
  initial,
  groupId,
  defaultCaregiver,
  members,
  onClose,
  onSaved,
}: {
  initial?: Schedule;
  groupId: string;
  defaultCaregiver: string;
  members: Shared["members"];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const caregivers = members.filter((m) => m.canCare);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [scheduledAt, setAt] = useState(
    initial ? localInput(initial.scheduledAt) : `${day()}T10:00`,
  );
  const [caregiverId, setCaregiver] = useState(
    initial?.caregiverId ?? defaultCaregiver,
  );
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
    const input: ScheduleInput = { title, kind, scheduledAt, caregiverId };
    setBusy(true);
    setError("");
    try {
      if (initial) await schedulesApi.update(groupId, initial, input);
      else await schedulesApi.create(groupId, input);
      await onSaved();
    } catch (err) {
      setError(errorMessage(err, "일정을 저장하지 못했습니다."));
      setBusy(false);
    }
  }
  return (
    <Modal
      title={initial ? "일정 수정" : "새 일정 등록"}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form onSubmit={submit} noValidate>
        <fieldset disabled={busy} className="form-fields">
          <label className="field">
            일정명
            <input
              autoFocus
              maxLength={200}
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
            <select
              value={caregiverId}
              onChange={(e) => setCaregiver(e.target.value)}
            >
              {caregivers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.role})
                </option>
              ))}
            </select>
          </label>
        </fieldset>
        {!initial && (
          <p className="micro">새 일정은 ‘예정’ 상태로 등록됩니다.</p>
        )}
        {error && (
          <p role="alert" className="error">
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
          <button className="primary" type="submit" disabled={busy}>
            {busy ? "저장 중…" : "일정 저장"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
