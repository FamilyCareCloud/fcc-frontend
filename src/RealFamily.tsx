import { useState, type FormEvent } from "react";
import { groupsApi } from "./api";
import { dateLabel, memberName, timeLabel } from "./data";
import { Badge, Icon, Modal } from "./ui";
import type { RealCtx } from "./RealApp";

function errMsg(e: unknown, fallback: string) {
  return e instanceof Error ? e.message || fallback : fallback;
}

type Action =
  | "elder"
  | "invite"
  | "leave"
  | "change"
  | "ownership"
  | { accept: true }
  | null;

export function RealFamily({ ctx }: { ctx: RealCtx }) {
  const { group } = ctx;
  const myRole = group.members.find((m) => m.userId === ctx.session.user.userId)?.role;
  const isOwner = myRole === "owner";
  const isCurrentCaregiver = group.primaryCaregiverId === ctx.session.user.userId;
  const hasElder = !!group.elder;
  const [action, setAction] = useState<Action>(null);
  const [nameDraft, setNameDraft] = useState(group.elder?.name ?? "");
  const [birthDraft, setBirthDraft] = useState(group.elder?.birthDate ?? "");
  const [noteDraft, setNoteDraft] = useState(group.elder?.note ?? "");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"caregiver" | "elder">("caregiver");
  const [inviteResult, setInviteResult] = useState<{ token: string; expiresAt: string } | null>(null);
  const [acceptToken, setAcceptToken] = useState("");
  const [target, setTarget] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function open(a: Action) {
    setError("");
    setInviteResult(null);
    setAction(a);
    setNameDraft(group.elder?.name ?? "");
    setBirthDraft(group.elder?.birthDate ?? "");
    setNoteDraft(group.elder?.note ?? "");
    setTarget("");
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    void runAction();
  }

  async function runAction() {
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      if (action === "elder") {
        if (!nameDraft.trim()) throw new Error("이름을 입력해 주세요.");
        await groupsApi.setElder(ctx.token, ctx.groupId, hasElder, {
          name: nameDraft.trim(),
          birthDate: birthDraft || null,
          note: noteDraft,
        });
        await ctx.reload();
        ctx.notify("고령자 정보를 저장했습니다.");
        setAction(null);
      } else if (action === "invite") {
        if (!inviteEmail.trim()) throw new Error("초대할 이메일을 입력해 주세요.");
        const result = await groupsApi.invite(ctx.token, ctx.groupId, inviteEmail.trim(), inviteRole);
        setInviteResult(result);
      } else if (action === "leave") {
        await groupsApi.leave(ctx.token, ctx.groupId);
        ctx.notify("그룹에서 탈퇴했습니다.");
        window.location.reload();
      } else if (action === "change") {
        if (!target) throw new Error("다음 담당 보호자를 선택해 주세요.");
        await groupsApi.handover(ctx.token, ctx.groupId, target);
        await ctx.reload();
        ctx.notify("담당 보호자를 교대하고 인수인계를 생성했습니다.");
        setAction(null);
      } else if (action === "ownership") {
        if (!target) throw new Error("소유권을 이전할 보호자를 선택해 주세요.");
        await groupsApi.transferOwnership(ctx.token, ctx.groupId, target);
        await ctx.reload();
        ctx.notify("그룹 소유권을 이전했습니다.");
        setAction(null);
      }
    } catch (e) {
      setError(errMsg(e, "요청을 처리하지 못했습니다."));
    } finally {
      setBusy(false);
    }
  }

  async function acceptInvite(e: FormEvent) {
    e.preventDefault();
    if (busy || !acceptToken.trim()) return;
    setBusy(true);
    setError("");
    try {
      await groupsApi.acceptInvite(ctx.token, acceptToken.trim());
      await ctx.reload();
      ctx.notify("가족 그룹에 참여했습니다.");
      setAction(null);
      setAcceptToken("");
    } catch (e) {
      setError(errMsg(e, "초대 코드를 확인해 주세요."));
    } finally {
      setBusy(false);
    }
  }

  const history = [...group.assignments].sort((a, b) => b.startedAt.localeCompare(a.startedAt));

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">OUR FAMILY</div>
          <h1>가족 관리</h1>
          <p>함께 돌볼 가족과 돌봄 대상자를 관리해요.</p>
        </div>
        <div className="button-row">
          <button className="secondary" onClick={() => open({ accept: true })}>
            초대 코드로 참여
          </button>
          {isOwner && (
            <button className="primary" onClick={() => open("invite")}>
              <Icon name="plus" size={18} />
              가족 초대
            </button>
          )}
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
              {hasElder ? "정보 수정" : "고령자 등록"}
            </button>
          </div>
          {hasElder && group.elder ? (
            <>
              <div className="family-title">
                <span className="avatar elder-avatar">{group.elder.name.slice(-2)}</span>
                <div>
                  <h2>{group.elder.name} 님</h2>
                  <p>{group.elder.birthDate ?? "생년월일 미등록"}</p>
                </div>
              </div>
              <div className="info-list">
                <div>
                  <span>연결된 그룹</span>
                  <b>{group.name}</b>
                </div>
                <div>
                  <span>기본 특이사항</span>
                  <b>{group.elder.note || "등록된 내용 없음"}</b>
                </div>
              </div>
            </>
          ) : (
            <>
              <p className="inline-note">그룹에 연결할 고령자를 등록해 주세요.</p>
              <button className="primary" onClick={() => open("elder")}>
                고령자 등록·연결
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
          </div>
          <div className="member-list">
            {ctx.members.map((m) => (
              <div className="member" key={m.id}>
                <span className={`avatar ${m.color}`}>{m.name.slice(-2)}</span>
                <div>
                  <strong>{m.name}</strong>
                  <small>
                    {m.relation}
                    {m.id === ctx.session.user.userId ? " · 나" : ""}
                  </small>
                </div>
                {m.id === group.primaryCaregiverId && <Badge tone="green">담당 중</Badge>}
                {m.id === group.nextCaregiverId && <Badge>다음 담당</Badge>}
              </div>
            ))}
          </div>
          <button className="text-button section-gap" onClick={() => open("leave")}>
            그룹 탈퇴
          </button>
        </section>
      </div>
      <div className="two-column section-gap">
        <section className="card">
          <div className="section-head">
            <h2>
              <Icon name="users" />
              보호자 교대
            </h2>
            <Badge tone="green">{memberName(ctx.members, group.primaryCaregiverId)} 담당 중</Badge>
          </div>
          {isCurrentCaregiver ? (
            <>
              <label className="field">
                다음 담당 보호자
                <select
                  value={target || group.nextCaregiverId || ""}
                  onChange={async (e) => {
                    try {
                      await groupsApi.setNextCaregiver(ctx.token, ctx.groupId, e.target.value || null);
                      await ctx.reload();
                    } catch (err) {
                      setError(errMsg(err, "다음 담당자 지정에 실패했습니다."));
                    }
                  }}
                >
                  <option value="">지정 안 함</option>
                  {ctx.members
                    .filter((m) => m.id !== group.primaryCaregiverId)
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                </select>
              </label>
              <button className="primary full" onClick={() => open("change")}>
                담당 보호자 변경 <Icon name="arrow" size={17} />
              </button>
              <p className="micro">교대하면 지난 돌봄 기록으로 AI 인수인계가 자동 생성됩니다.</p>
            </>
          ) : (
            <p className="inline-note">현재 담당 보호자만 교대를 진행할 수 있습니다.</p>
          )}
          {isOwner && (
            <button className="text-button section-gap" onClick={() => open("ownership")}>
              그룹 소유권 이전
            </button>
          )}
        </section>
        <section className="card">
          <div className="section-head">
            <h2>
              <Icon name="clock" />
              교대 이력
            </h2>
          </div>
          {history.length ? (
            history.map((h) => (
              <div className="history-item" key={h.id}>
                <span>{memberName(ctx.members, h.userId)} 담당</span>
                <span>
                  {dateLabel(h.startedAt)} {timeLabel(h.startedAt)}
                  {h.endedAt ? ` ~ ${dateLabel(h.endedAt)}` : " ~ 현재"}
                </span>
              </div>
            ))
          ) : (
            <p className="inline-note">아직 교대 이력이 없습니다.</p>
          )}
        </section>
      </div>
      {action && typeof action === "object" && (
        <Modal title="가족 그룹 참여" onClose={() => setAction(null)}>
          <form onSubmit={acceptInvite} noValidate>
            <label className="field">
              초대 코드
              <input autoFocus required value={acceptToken} onChange={(e) => setAcceptToken(e.target.value)} />
            </label>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <div className="actions">
              <button type="button" className="secondary" onClick={() => setAction(null)}>
                취소
              </button>
              <button className="primary" type="submit" disabled={busy}>
                {busy ? "참여 중…" : "참여하기"}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {action === "invite" && (
        <Modal title="가족 초대" onClose={() => setAction(null)}>
          {inviteResult ? (
            <>
              <p className="inline-note">
                48시간 동안 유효한 초대 코드입니다. 직접 전달해 주세요 (이메일 발송은 하지 않습니다).
              </p>
              <div className="invite-code">{inviteResult.token}</div>
              <div className="actions">
                <button className="primary" onClick={() => setAction(null)}>
                  확인
                </button>
              </div>
            </>
          ) : (
            <form onSubmit={submit} noValidate>
              <label className="field">
                초대할 이메일
                <input
                  type="email"
                  autoFocus
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </label>
              <label className="field">
                역할
                <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as "caregiver" | "elder")}>
                  <option value="caregiver">보호자</option>
                  <option value="elder">고령자</option>
                </select>
              </label>
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              <div className="actions">
                <button type="button" className="secondary" onClick={() => setAction(null)}>
                  취소
                </button>
                <button className="primary" type="submit" disabled={busy}>
                  {busy ? "생성 중…" : "초대 코드 만들기"}
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}
      {action === "leave" && (
        <Modal title="가족 그룹에서 탈퇴할까요?" onClose={() => setAction(null)}>
          <p className="detail-content">
            탈퇴하면 이 그룹의 돌봄 기록에 더 이상 접근할 수 없습니다. 담당자·예정 일정 배정을 먼저 해제해 주세요.
          </p>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="actions">
            <button className="secondary" onClick={() => setAction(null)}>
              취소
            </button>
            <button className="danger" disabled={busy} onClick={() => void runAction()}>
              {busy ? "처리 중…" : "탈퇴"}
            </button>
          </div>
        </Modal>
      )}
      {(action === "change" || action === "ownership") && (
        <Modal title={action === "change" ? "담당 보호자 변경" : "소유권 이전"} onClose={() => setAction(null)}>
          <form onSubmit={submit} noValidate>
            <p className="inline-note">
              {action === "change"
                ? `현재 담당자: ${memberName(ctx.members, group.primaryCaregiverId)}. 돌봄 기록은 그대로 유지됩니다.`
                : "소유권은 다른 보호자에게만 이전할 수 있습니다."}
            </p>
            <label className="field">
              {action === "change" ? "새 담당 보호자" : "새 소유자"}
              <select value={target} onChange={(e) => setTarget(e.target.value)}>
                <option value="">보호자를 선택해 주세요</option>
                {ctx.members
                  .filter((m) => m.id !== ctx.session.user.userId)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
              </select>
            </label>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <div className="actions">
              <button type="button" className="secondary" onClick={() => setAction(null)}>
                취소
              </button>
              <button className="primary" type="submit" disabled={busy}>
                {busy ? "처리 중…" : "변경 확인"}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {action === "elder" && (
        <Modal title={hasElder ? "고령자 정보 수정" : "고령자 등록"} onClose={() => setAction(null)}>
          <form onSubmit={submit} noValidate>
            <label className="field">
              고령자 이름
              <input
                autoFocus
                required
                maxLength={60}
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
              />
            </label>
            <label className="field">
              생년월일
              <input type="date" value={birthDraft} onChange={(e) => setBirthDraft(e.target.value)} />
            </label>
            <label className="field">
              기본 특이사항
              <textarea value={noteDraft} maxLength={500} onChange={(e) => setNoteDraft(e.target.value)} />
            </label>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <div className="actions">
              <button type="button" className="secondary" onClick={() => setAction(null)}>
                취소
              </button>
              <button className="primary" type="submit" disabled={busy}>
                {busy ? "저장 중…" : "저장"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
