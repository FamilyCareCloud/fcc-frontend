import { useState, type FormEvent } from "react";
import {
  dateLabel,
  day,
  memberName,
  members,
  timeLabel,
  type Schedule,
} from "./data";
import { Badge, Empty, Icon, Modal } from "./ui";
import type { Shared } from "./App";

export function Schedules({
  schedules,
  setSchedules,
  notify,
}: Pick<Shared, "schedules" | "setSchedules" | "notify">) {
  const [filter, setFilter] = useState("전체");
  const [editing, setEditing] = useState<Schedule | "new" | null>(null);
  const [deleting, setDeleting] = useState<Schedule | null>(null);
  const visible = schedules
    .filter(
      (s) =>
        filter === "전체" ||
        (filter === "오늘"
          ? s.scheduledAt.startsWith(day())
          : s.status === filter),
    )
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
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
      <p className="inline-note">
        일정 관리 시연입니다. 변경 내용은 새로고침하면 초기화됩니다.
      </p>
      <div className="tabs" aria-label="일정 필터">
        {["전체", "오늘", "예정", "완료", "취소"].map((t) => (
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
                · 담당 {memberName(s.caregiverId)}
              </p>
            </div>
            <label className="status-control">
              <span className="sr-only">{s.title} 상태</span>
              <select
                value={s.status}
                onChange={(e) => {
                  setSchedules((all) =>
                    all.map((item) =>
                      item.scheduleId === s.scheduleId
                        ? {
                            ...item,
                            status: e.target.value as Schedule["status"],
                          }
                        : item,
                    ),
                  );
                  notify("가상 일정의 상태를 변경했습니다.");
                }}
              >
                {["예정", "완료", "취소"].map((status) => (
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
                onClick={() => setDeleting(s)}
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
          onClose={() => setEditing(null)}
          onSave={(s) => {
            setSchedules((all) =>
              editing === "new"
                ? [...all, s]
                : all.map((item) =>
                    item.scheduleId === s.scheduleId ? s : item,
                  ),
            );
            setEditing(null);
            notify("가상 일정을 저장했습니다.");
          }}
        />
      )}
      {deleting && (
        <Modal title="일정을 삭제할까요?" onClose={() => setDeleting(null)}>
          <p className="detail-content">{deleting.title}</p>
          <p className="inline-note">
            취소 이력을 남기려면 삭제 대신 상태를 ‘취소’로 변경해 주세요.
          </p>
          <div className="actions">
            <button className="secondary" onClick={() => setDeleting(null)}>
              돌아가기
            </button>
            <button
              className="danger"
              onClick={() => {
                setSchedules((all) =>
                  all.filter((s) => s.scheduleId !== deleting.scheduleId),
                );
                setDeleting(null);
                notify("가상 일정을 삭제했습니다.");
              }}
            >
              삭제
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
function ScheduleEditor({
  initial,
  onClose,
  onSave,
}: {
  initial?: Schedule;
  onClose: () => void;
  onSave: (s: Schedule) => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [scheduledAt, setAt] = useState(
    initial?.scheduledAt ?? `${day()}T10:00`,
  );
  const [caregiverId, setCaregiver] = useState(
    initial?.caregiverId ?? members[0].id,
  );
  const [kind, setKind] = useState(initial?.kind ?? "병원");
  const [error, setError] = useState("");
  function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !scheduledAt || !caregiverId) {
      setError("일정명, 날짜·시간, 담당 보호자를 입력해 주세요.");
      return;
    }
    onSave({
      scheduleId: initial?.scheduleId ?? crypto.randomUUID(),
      title: title.trim(),
      scheduledAt,
      caregiverId,
      kind,
      status: initial?.status ?? "예정",
    });
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
              {["병원", "검사", "가족 방문", "기타"].map((k) => (
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
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.relation})
              </option>
            ))}
          </select>
        </label>
        <p className="micro">
          새 일정은 ‘예정’ 상태로 등록됩니다. 실제 서버에는 저장되지 않습니다.
        </p>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <div className="actions">
          <button type="button" className="secondary" onClick={onClose}>
            취소
          </button>
          <button className="primary" type="submit">
            일정 저장
          </button>
        </div>
      </form>
    </Modal>
  );
}
