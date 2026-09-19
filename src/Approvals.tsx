import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  approvals as approvalsApi,
  errorMessage,
  type Approval,
} from "./api";
import { dateLabel, localInput, nameOf, timeLabel } from "./data";
import { Badge, Empty, Modal } from "./ui";
import type { Shared } from "./App";

const statusText = { pending: "대기 중", approved: "승인됨", rejected: "거절됨" };
const statusTone = { pending: "blue", approved: "green", rejected: "orange" };

/** 일정 취소·변경 요청과 처리. 요청은 누구나, 처리(승인·거절·연락 필요)는 현재 담당 보호자만 합니다. */
export function Approvals({
  group,
  members,
  me,
  schedules,
  reload,
  notify,
}: Pick<
  Shared,
  "group" | "members" | "me" | "schedules" | "reload" | "notify"
>) {
  const [items, setItems] = useState<Approval[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const isCurrent = group.primaryCaregiverId === me.userId;
  const who = (id: string) => nameOf(members, id);
  const titleOf = (id: string) =>
    schedules.find((s) => s.scheduleId === id)?.title ?? "삭제된 일정";

  const load = useCallback(async () => {
    setItems(await approvalsApi.list(group.id));
  }, [group.id]);
  useEffect(() => {
    let active = true;
    approvalsApi
      .list(group.id)
      .then((list) => {
        if (active) setItems(list);
      })
      .catch((e) => {
        if (active) setError(errorMessage(e, "승인 요청을 불러올 수 없습니다."));
      });
    return () => {
      active = false;
    };
  }, [group.id]);

  async function decide(a: Approval, decision: "approve" | "reject" | "call") {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await approvalsApi.decide(group.id, a.id, decision);
      notify(
        decision === "approve"
          ? "요청을 승인했습니다."
          : decision === "reject"
            ? "요청을 거절했습니다."
            : "요청자에게 연락이 필요하다고 표시했습니다.",
      );
    } catch (e) {
      // 409: 다른 가족이 먼저 처리했거나 일정이 바뀐 경우입니다.
      setError(errorMessage(e, "요청을 처리하지 못했습니다."));
    } finally {
      try {
        await Promise.all([load(), reload()]);
      } catch {
        /* 처리 결과는 이미 안내했고, 목록은 다음 진입 때 다시 받습니다. */
      }
      setBusy(false);
    }
  }
  const active = schedules.filter((s) => s.status === "예정");
  return (
    <section className="card section-gap">
      <div className="section-head">
        <div>
          <h2>일정 변경·취소 요청</h2>
          <p>
            {isCurrent
              ? "담당 보호자로서 요청을 승인하거나 거절할 수 있어요."
              : "현재 담당 보호자가 요청을 확인하고 처리합니다."}
          </p>
        </div>
        <button
          className="secondary"
          disabled={!active.length}
          onClick={() => setRequesting(true)}
        >
          요청 만들기
        </button>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {items === null && !error && <p className="micro">불러오는 중…</p>}
      {items?.length === 0 && <Empty text="등록된 요청이 없습니다." />}
      {items?.map((a) => (
        <article className="history-item" key={a.id}>
          <span>
            <b>{titleOf(a.scheduleId)}</b> ·{" "}
            {a.requestedAction === "cancel"
              ? "취소 요청"
              : `변경 요청 → ${a.proposedAt ? `${dateLabel(a.proposedAt)} ${timeLabel(a.proposedAt)}` : ""}`}
            <small className="block">
              {who(a.requestedBy)} · 사유: {a.reason}
              {a.contactRequestedAt && a.status === "pending"
                ? " · 연락 필요 표시됨"
                : ""}
            </small>
          </span>
          <span>
            <Badge tone={statusTone[a.status]}>{statusText[a.status]}</Badge>
            {a.status === "pending" && isCurrent && (
              <span className="button-row">
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={() => void decide(a, "approve")}
                >
                  승인
                </button>
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={() => void decide(a, "reject")}
                >
                  거절
                </button>
                {!a.contactRequestedAt && (
                  <button
                    className="text-button"
                    disabled={busy}
                    onClick={() => void decide(a, "call")}
                  >
                    연락 필요
                  </button>
                )}
              </span>
            )}
          </span>
        </article>
      ))}
      {requesting && (
        <RequestForm
          groupId={group.id}
          schedules={active}
          onClose={() => setRequesting(false)}
          onDone={async () => {
            setRequesting(false);
            notify("요청을 등록했습니다.");
            await load().catch(() => {});
          }}
        />
      )}
    </section>
  );
}

function RequestForm({
  groupId,
  schedules,
  onClose,
  onDone,
}: {
  groupId: string;
  schedules: Shared["schedules"];
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const [scheduleId, setScheduleId] = useState(schedules[0]?.scheduleId ?? "");
  const [action, setAction] = useState<"cancel" | "reschedule">("cancel");
  const [reason, setReason] = useState("");
  const [proposedAt, setProposedAt] = useState(
    localInput(schedules[0]?.scheduledAt ?? new Date().toISOString()),
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!reason.trim()) return setError("사유를 입력해 주세요.");
    if (action === "reschedule" && !proposedAt)
      return setError("변경할 날짜·시간을 입력해 주세요.");
    setBusy(true);
    setError("");
    try {
      await approvalsApi.request(groupId, {
        scheduleId,
        action,
        reason,
        proposedAt,
      });
      await onDone();
    } catch (err) {
      setError(errorMessage(err, "요청을 등록하지 못했습니다."));
      setBusy(false);
    }
  }
  return (
    <Modal
      title="일정 변경·취소 요청"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form onSubmit={submit} noValidate>
        <fieldset disabled={busy} className="form-fields">
          <label className="field">
            일정
            <select
              value={scheduleId}
              onChange={(e) => {
                setScheduleId(e.target.value);
                const s = schedules.find((x) => x.scheduleId === e.target.value);
                if (s) setProposedAt(localInput(s.scheduledAt));
              }}
            >
              {schedules.map((s) => (
                <option key={s.scheduleId} value={s.scheduleId}>
                  {s.title} ({dateLabel(s.scheduledAt)} {timeLabel(s.scheduledAt)})
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            요청 종류
            <select
              value={action}
              onChange={(e) => setAction(e.target.value as typeof action)}
            >
              <option value="cancel">일정 취소</option>
              <option value="reschedule">일정 시간 변경</option>
            </select>
          </label>
          {action === "reschedule" && (
            <label className="field">
              변경할 날짜·시간
              <input
                type="datetime-local"
                value={proposedAt}
                onChange={(e) => setProposedAt(e.target.value)}
              />
            </label>
          )}
          <label className="field">
            사유
            <textarea
              maxLength={1000}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
        </fieldset>
        <p className="micro">
          승인 전까지 일정은 바뀌지 않습니다. 이미 대기 중인 요청이 있는 일정은
          다시 요청할 수 없습니다.
        </p>
        {error && (
          <p className="error" role="alert">
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
            {busy ? "등록 중…" : "요청 등록"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
