import { useState, type FormEvent } from "react";
import { dateLabel, nameOf, timeLabel } from "./data";
import { errorMessage, groups as groupsApi } from "./api";
import { Badge, Icon, Modal } from "./ui";
import { CreateGroupForm, JoinGroupForm } from "./Onboarding";
import type { Shared } from "./App";

type Action =
  | "elder"
  | "group"
  | "join"
  | "invite"
  | "leave"
  | "handover"
  | "owner"
  | null;

export function Family({
  group,
  members,
  me,
  reload,
  switchGroup,
  notify,
}: Pick<
  Shared,
  "group" | "members" | "me" | "reload" | "switchGroup" | "notify"
>) {
  const [action, setAction] = useState<Action>(null);
  const [draft, setDraft] = useState("");
  const [birthDraft, setBirthDraft] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [role, setRole] = useState<"caregiver" | "elder">("caregiver");
  const [target, setTarget] = useState("");
  const [token, setToken] = useState<{ value: string; expiresAt: string } | null>(
    null,
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const who = (id: string | null | undefined) => nameOf(members, id);
  const elder = group.elder;
  const isCurrent = group.primaryCaregiverId === me.userId;
  const isOwner = members.some((m) => m.id === me.userId && m.isOwner);
  const caregivers = members.filter((m) => m.canCare);
  const others = caregivers.filter((m) => m.id !== me.userId);
  const history = [...group.assignments].reverse();

  function open(a: Action, initialTarget = "") {
    setError("");
    setToken(null);
    setAction(a);
    setDraft(a === "elder" ? (elder?.name ?? "") : "");
    setBirthDraft(elder?.birthDate ?? "");
    setNoteDraft(elder?.note ?? "");
    setRole("caregiver");
    setTarget(initialTarget);
  }
  const close = () => {
    if (!busy) setAction(null);
  };
  /** 서버 호출을 감싸 진행 중 표시·오류 문구·최신 데이터 반영을 한곳에서 처리합니다. */
  async function run(
    job: () => Promise<unknown>,
    done: string | (() => string),
    { keepOpen = false, fallback = "요청에 실패했습니다." } = {},
  ) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await job();
      await reload();
      notify(typeof done === "function" ? done() : done);
      if (!keepOpen) setAction(null);
    } catch (e) {
      setError(errorMessage(e, fallback));
    } finally {
      setBusy(false);
    }
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    if (action === "elder") {
      if (!draft.trim()) return setError("고령자 이름을 입력해 주세요.");
      const body = {
        name: draft.trim(),
        birthDate: birthDraft || null,
        note: noteDraft,
      };
      void run(
        async () => {
          if (elder) await groupsApi.updateElder(group.id, body);
          else await groupsApi.registerElder(group.id, body);
        },
        elder ? "고령자 정보를 수정했습니다." : "고령자를 등록했습니다.",
        { fallback: "고령자 정보를 저장하지 못했습니다." },
      );
    } else if (action === "invite") {
      if (!draft.trim()) return setError("초대할 이메일을 입력해 주세요.");
      void run(
        async () => {
          const r = await groupsApi.invite(group.id, draft.trim(), role);
          setToken({ value: r.token, expiresAt: r.expiresAt });
        },
        "초대 코드를 만들었습니다.",
        { keepOpen: true, fallback: "초대 코드를 만들지 못했습니다." },
      );
    } else if (action === "owner") {
      if (!target) return setError("소유권을 넘길 보호자를 선택해 주세요.");
      void run(
        () => groupsApi.transferOwnership(group.id, target),
        "그룹 소유권을 이전했습니다.",
      );
    } else if (action === "handover") {
      if (!target) return setError("다음 담당 보호자를 선택해 주세요.");
      let message = "담당 보호자를 교대했습니다.";
      void run(
        async () => {
          message = (await groupsApi.handover(group.id, target)).message;
        },
        () => message,
      );
    }
  }
  async function changeNext(id: string) {
    await run(
      () => groupsApi.setNextCaregiver(group.id, id || null),
      "다음 담당 보호자를 지정했습니다.",
      { keepOpen: true },
    );
  }
  const titles: Record<Exclude<Action, null>, string> = {
    elder: elder ? "고령자 정보 수정" : "고령자 등록",
    group: "가족 그룹 생성",
    join: "가족 그룹 참여",
    invite: "가족 초대",
    leave: "가족 그룹에서 탈퇴할까요?",
    handover: "담당 보호자 교대",
    owner: "그룹 소유권 이전",
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">OUR FAMILY</div>
          <h1>가족 관리</h1>
          <p>함께 돌볼 가족과 돌봄 대상자를 관리해요.</p>
        </div>
        <div className="button-row">
          <button className="secondary" onClick={() => open("join")}>
            그룹 참여
          </button>
          <button className="primary" onClick={() => open("group")}>
            <Icon name="plus" size={18} />
            그룹 생성
          </button>
        </div>
      </div>
      {error && !action && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="two-column">
        <section className="card">
          <div className="section-head">
            <h2>
              <Icon name="heart" />
              돌봄 대상자
            </h2>
            <button className="text-button" onClick={() => open("elder")}>
              {elder ? "정보 수정" : "고령자 등록"}
            </button>
          </div>
          {elder ? (
            <>
              <div className="family-title">
                <span className="avatar elder-avatar">
                  {elder.name.slice(-2)}
                </span>
                <div>
                  <h2>{elder.name} 님</h2>
                  <p>{elder.birthDate ? `${elder.birthDate} 출생` : "생년월일 미등록"}</p>
                </div>
              </div>
              <div className="info-list">
                <div>
                  <span>연결된 그룹</span>
                  <b>{group.name}</b>
                </div>
                <div>
                  <span>기본 특이사항</span>
                  <b>{elder.note || "등록된 내용 없음"}</b>
                </div>
              </div>
            </>
          ) : (
            <>
              <p className="inline-note">
                돌봄 기록·일정·인수인계를 쓰려면 먼저 그룹에 연결할 고령자를
                등록해 주세요.
              </p>
              <button className="primary" onClick={() => open("elder")}>
                고령자 등록
              </button>
            </>
          )}
        </section>
        <section className="card">
          <div className="section-head">
            <h2>
              <Icon name="users" />
              {group.name}
            </h2>
            {isOwner && (
              <button className="text-button" onClick={() => open("invite")}>
                가족 초대 <Icon name="plus" size={15} />
              </button>
            )}
          </div>
          <div className="member-list">
            {members.map((m) => (
              <div className="member" key={m.id}>
                <span className={`avatar ${m.color}`}>{m.name.slice(-2)}</span>
                <div>
                  <strong>{m.name}</strong>
                  <small>
                    {m.role}
                    {m.id === me.userId ? " · 나" : ""}
                  </small>
                </div>
                {m.id === group.primaryCaregiverId && (
                  <Badge tone="green">담당 중</Badge>
                )}
                {m.id === group.nextCaregiverId && <Badge>다음 담당</Badge>}
              </div>
            ))}
          </div>
          <div className="actions spread section-gap">
            <button className="text-button" onClick={() => open("leave")}>
              그룹 탈퇴
            </button>
            {isOwner && (
              <button
                className="text-button"
                onClick={() => open("owner", others[0]?.id ?? "")}
                disabled={!others.length}
              >
                소유권 이전
              </button>
            )}
          </div>
        </section>
      </div>
      <div className="two-column section-gap">
        <section className="card">
          <div className="section-head">
            <h2>
              <Icon name="users" />
              보호자 교대
            </h2>
            <Badge tone="green">{who(group.primaryCaregiverId)} 담당 중</Badge>
          </div>
          <label className="field">
            다음 담당 보호자
            <select
              value={group.nextCaregiverId ?? ""}
              disabled={busy || !isCurrent}
              onChange={(e) => void changeNext(e.target.value)}
            >
              <option value="">지정 안 함</option>
              {caregivers
                .filter((m) => m.id !== group.primaryCaregiverId)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
            </select>
          </label>
          <button
            className="primary full"
            disabled={!isCurrent || !elder}
            onClick={() => open("handover", group.nextCaregiverId ?? "")}
          >
            담당 보호자 교대 <Icon name="arrow" size={17} />
          </button>
          <p className="micro">
            {isCurrent
              ? "교대하면 기간 내 기록이 있을 때 인수인계가 함께 생성됩니다."
              : "현재 담당 보호자만 다음 담당자를 지정하고 교대할 수 있습니다."}
          </p>
        </section>
        <section className="card">
          <div className="section-head">
            <h2>
              <Icon name="clock" />
              담당 이력
            </h2>
          </div>
          {history.length ? (
            history.map((h) => (
              <div className="history-item" key={h.id}>
                <span>{who(h.userId)}</span>
                <span>
                  {dateLabel(h.startedAt)} {timeLabel(h.startedAt)}
                  {h.endedAt ? "" : " ~ 현재"}
                </span>
              </div>
            ))
          ) : (
            <p className="inline-note">아직 담당 이력이 없습니다.</p>
          )}
        </section>
      </div>
      {action && (
        <Modal title={titles[action]} onClose={close}>
          {action === "group" ? (
            <CreateGroupForm
              onCancel={close}
              onDone={(id) => {
                setAction(null);
                void switchGroup(id).then(() =>
                  notify("가족 그룹을 만들었습니다."),
                );
              }}
            />
          ) : action === "join" ? (
            <JoinGroupForm
              onCancel={close}
              onDone={(id) => {
                setAction(null);
                void switchGroup(id).then(() =>
                  notify("가족 그룹에 참여했습니다."),
                );
              }}
            />
          ) : action === "leave" ? (
            <>
              <p className="detail-content">
                이 그룹에서 나갑니다. 소유자이거나 담당 보호자·예정 일정 담당자인
                경우 먼저 변경해야 탈퇴할 수 있습니다.
              </p>
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              <div className="actions">
                <button className="secondary" disabled={busy} onClick={close}>
                  취소
                </button>
                <button
                  className="danger"
                  disabled={busy}
                  onClick={() => {
                    setBusy(true);
                    setError("");
                    groupsApi
                      .leave(group.id)
                      .then(async () => {
                        setBusy(false);
                        setAction(null);
                        await switchGroup("");
                        notify("그룹에서 탈퇴했습니다.");
                      })
                      .catch((e) => {
                        setError(errorMessage(e, "그룹을 탈퇴하지 못했습니다."));
                        setBusy(false);
                      });
                  }}
                >
                  {busy ? "처리 중…" : "탈퇴"}
                </button>
              </div>
            </>
          ) : action === "invite" && token ? (
            <>
              <p className="inline-note">
                이메일은 발송되지 않습니다. 아래 코드를 초대할 분에게 직접
                전달해 주세요. 초대받은 이메일 계정으로 로그인해야 참여할 수
                있고, {dateLabel(token.expiresAt)} {timeLabel(token.expiresAt)}
                까지 1회만 사용할 수 있습니다.
              </p>
              <div className="invite-code invite-token">{token.value}</div>
              <div className="actions">
                <button
                  className="secondary"
                  onClick={() =>
                    void navigator.clipboard
                      ?.writeText(token.value)
                      .then(() => notify("초대 코드를 복사했습니다."))
                      .catch(() => notify("복사하지 못했습니다. 직접 선택해 복사해 주세요."))
                  }
                >
                  코드 복사
                </button>
                <button className="primary" onClick={() => setAction(null)}>
                  확인
                </button>
              </div>
            </>
          ) : (
            <form onSubmit={submit} noValidate>
              {action === "handover" || action === "owner" ? (
                <>
                  <p className="inline-note">
                    {action === "handover"
                      ? `현재 담당자: ${who(group.primaryCaregiverId)}. 돌봄 기록은 그대로 유지되고, 최근 7일 기록이 있으면 인수인계가 생성됩니다.`
                      : "소유권을 넘기면 나는 일반 보호자가 됩니다."}
                  </p>
                  <label className="field">
                    {action === "handover" ? "새 담당 보호자" : "새 소유자"}
                    <select
                      value={target}
                      onChange={(e) => setTarget(e.target.value)}
                    >
                      <option value="">보호자를 선택해 주세요</option>
                      {(action === "handover" ? caregivers : others)
                        .filter((m) => m.id !== me.userId)
                        .map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                    </select>
                  </label>
                </>
              ) : (
                <>
                  <label className="field">
                    {action === "elder" ? "고령자 이름" : "초대할 이메일"}
                    <input
                      autoFocus
                      type={action === "invite" ? "email" : "text"}
                      value={draft}
                      maxLength={action === "invite" ? 254 : 100}
                      onChange={(e) => setDraft(e.target.value)}
                      required
                    />
                  </label>
                  {action === "invite" && (
                    <label className="field">
                      역할
                      <select
                        value={role}
                        onChange={(e) =>
                          setRole(e.target.value as "caregiver" | "elder")
                        }
                      >
                        <option value="caregiver">보호자</option>
                        <option value="elder">고령자</option>
                      </select>
                    </label>
                  )}
                  {action === "elder" && (
                    <>
                      <label className="field">
                        생년월일 (선택)
                        <input
                          type="date"
                          max={new Date().toISOString().slice(0, 10)}
                          value={birthDraft}
                          onChange={(e) => setBirthDraft(e.target.value)}
                        />
                      </label>
                      <label className="field">
                        기본 특이사항
                        <textarea
                          value={noteDraft}
                          maxLength={2000}
                          onChange={(e) => setNoteDraft(e.target.value)}
                        />
                      </label>
                    </>
                  )}
                </>
              )}
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              <div className="actions">
                <button
                  className="secondary"
                  type="button"
                  disabled={busy}
                  onClick={close}
                >
                  취소
                </button>
                <button className="primary" type="submit" disabled={busy}>
                  {busy
                    ? "처리 중…"
                    : action === "handover"
                      ? "교대 확인"
                      : action === "invite"
                        ? "초대 코드 만들기"
                        : action === "owner"
                          ? "이전"
                          : "저장"}
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </>
  );
}
