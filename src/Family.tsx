import { useState, type FormEvent } from "react";
import { dateLabel, memberName, timeLabel } from "./data";
import { Badge, Icon, Modal } from "./ui";
import type { Shared } from "./App";
type Action = "elder" | "group" | "join" | "invite" | "leave" | "change" | null;
export function Family({
  elder,
  setElder,
  current,
  setCurrent,
  next,
  setNext,
  members,
  notify,
}: Pick<
  Shared,
  | "elder"
  | "setElder"
  | "current"
  | "setCurrent"
  | "next"
  | "setNext"
  | "members"
  | "notify"
>) {
  const [action, setAction] = useState<Action>(null);
  const [group, setGroup] = useState("영숙 님을 돌보는 가족");
  const [joined, setJoined] = useState(true);
  const [birth, setBirth] = useState("1948-05-12");
  const [note, setNote] = useState("산책과 꽃 가꾸기를 좋아하세요.");
  const [hasElder, setHasElder] = useState(true);
  const [draft, setDraft] = useState("");
  const [birthDraft, setBirthDraft] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [target, setTarget] = useState("");
  const [error, setError] = useState("");
  const [history, setHistory] = useState<
    { from: string; to: string; at: string }[]
  >([]);
  function open(a: Action) {
    setError("");
    setAction(a);
    setDraft(a === "elder" ? elder : a === "group" ? group : "");
    setBirthDraft(birth);
    setNoteDraft(note);
    setTarget(next === current ? "" : next);
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (action === "elder") {
      if (!draft.trim() || !birthDraft) {
        setError("이름과 생년월일을 입력해 주세요.");
        return;
      }
      setElder(draft.trim());
      setBirth(birthDraft);
      setNote(noteDraft);
      setHasElder(true);
      notify("가상 고령자 정보를 그룹에 연결했습니다.");
    } else if (action === "group") {
      if (!draft.trim()) {
        setError("그룹 이름을 입력해 주세요.");
        return;
      }
      setGroup(draft.trim());
      setJoined(true);
      setHasElder(false);
      notify("가상 그룹을 만들었습니다. 고령자를 등록해 주세요.");
    } else if (action === "join") {
      if (draft.trim() !== "FCC-DEMO") {
        setError("시연 초대 코드 FCC-DEMO를 입력해 주세요.");
        return;
      }
      setGroup("영숙 님을 돌보는 가족");
      setJoined(true);
      setHasElder(true);
      notify("가상 그룹 참여를 시연했습니다.");
    } else if (action === "change") {
      if (!target || target === current) {
        setError("현재 담당자와 다른 다음 보호자를 선택해 주세요.");
        return;
      }
      setHistory((all) => [
        { from: current, to: target, at: new Date().toISOString() },
        ...all,
      ]);
      setCurrent(target);
      setNext(current);
      notify("가상 담당 보호자를 변경하고 교대 이력을 남겼습니다.");
    }
    setAction(null);
  }
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
      <p className="inline-note">
        가상 가족으로 구성한 시연입니다. 초대가 발송되거나 실제 그룹 권한이
        변경되지 않으며, 새로고침하면 초기화됩니다.
      </p>
      {joined ? (
        <>
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
              {hasElder ? (
                <>
                  <div className="family-title">
                    <span className="avatar elder-avatar">
                      {elder.slice(-2)}
                    </span>
                    <div>
                      <h2>{elder} 님</h2>
                      <p>{birth} 출생</p>
                    </div>
                  </div>
                  <div className="info-list">
                    <div>
                      <span>연결된 그룹</span>
                      <b>{group}</b>
                    </div>
                    <div>
                      <span>기본 특이사항</span>
                      <b>{note || "등록된 내용 없음"}</b>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <p className="inline-note">
                    그룹에 연결할 고령자를 등록해 주세요. 시연의 다른 메뉴에는
                    기존 가상 기록이 유지됩니다.
                  </p>
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
                  {group}
                </h2>
                <button className="text-button" onClick={() => open("invite")}>
                  가족 초대 <Icon name="plus" size={15} />
                </button>
              </div>
              <div className="member-list">
                {members.map((m) => (
                  <div className="member" key={m.id}>
                    <span className={`avatar ${m.color}`}>
                      {m.name.slice(-2)}
                    </span>
                    <div>
                      <strong>{m.name}</strong>
                      <small>
                        {m.relation}
                        {m.id === "demo-me" ? " · 나" : ""}
                      </small>
                    </div>
                    {m.id === current && <Badge tone="green">담당 중</Badge>}
                    {m.id === next && <Badge>다음 담당</Badge>}
                  </div>
                ))}
              </div>
              <button
                className="text-button section-gap"
                onClick={() => open("leave")}
              >
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
                <Badge tone="green">
                  {memberName(members, current)} 담당 중
                </Badge>
              </div>
              <label className="field">
                다음 담당 보호자
                <select value={next} onChange={(e) => setNext(e.target.value)}>
                  {members
                    .filter((m) => m.id !== current)
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
              <p className="micro">
                교대 확인 후 현재 담당자가 바뀝니다. 인수인계는 AI 인수인계
                메뉴에서 직접 생성하는 임시 흐름입니다.
              </p>
            </section>
            <section className="card">
              <div className="section-head">
                <h2>
                  <Icon name="clock" />
                  교대 이력
                </h2>
              </div>
              {history.length ? (
                history.map((h, i) => (
                  <div className="history-item" key={i}>
                    <span>
                      {memberName(members, h.from)} →{" "}
                      {memberName(members, h.to)}
                    </span>
                    <span>
                      {dateLabel(h.at)} {timeLabel(h.at)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="inline-note">
                  아직 교대 이력이 없습니다. 담당 보호자를 변경하면 이곳에
                  표시됩니다.
                </p>
              )}
            </section>
          </div>
        </>
      ) : (
        <section className="card">
          <h2>참여한 가상 그룹이 없습니다.</h2>
          <p className="muted">그룹을 만들거나 시연 코드로 참여해 보세요.</p>
          <button className="primary" onClick={() => open("join")}>
            그룹 참여하기
          </button>
        </section>
      )}
      {action && (
        <Modal
          title={
            action === "elder"
              ? hasElder
                ? "고령자 정보 수정"
                : "고령자 등록"
              : action === "group"
                ? "가족 그룹 생성"
                : action === "join"
                  ? "가족 그룹 참여"
                  : action === "invite"
                    ? "가족 초대"
                    : action === "leave"
                      ? "가족 그룹에서 탈퇴할까요?"
                      : "담당 보호자 변경"
          }
          onClose={() => setAction(null)}
        >
          {action === "invite" ? (
            <>
              <p className="inline-note">
                발송 기능은 연결 전입니다. 아래 코드는 그룹 참여 화면을 확인하기
                위한 시연 코드입니다.
              </p>
              <div className="invite-code">FCC-DEMO</div>
              <div className="actions">
                <button className="primary" onClick={() => setAction(null)}>
                  확인
                </button>
              </div>
            </>
          ) : action === "leave" ? (
            <>
              <p className="detail-content">
                가상 그룹에서 나가는 화면 흐름을 확인합니다. 실제 권한이나
                데이터에는 영향을 주지 않습니다.
              </p>
              <div className="actions">
                <button className="secondary" onClick={() => setAction(null)}>
                  취소
                </button>
                <button
                  className="danger"
                  onClick={() => {
                    setJoined(false);
                    setAction(null);
                    notify("가상 그룹 탈퇴를 시연했습니다.");
                  }}
                >
                  탈퇴 시연
                </button>
              </div>
            </>
          ) : (
            <form onSubmit={submit} noValidate>
              {action === "change" ? (
                <>
                  <p className="inline-note">
                    현재 담당자: {memberName(members, current)}. 돌봄 기록은
                    그대로
                    유지됩니다.
                  </p>
                  <label className="field">
                    새 담당 보호자
                    <select
                      value={target}
                      onChange={(e) => setTarget(e.target.value)}
                    >
                      <option value="">보호자를 선택해 주세요</option>
                      {members
                        .filter((m) => m.id !== current)
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
                    {action === "elder"
                      ? "고령자 이름"
                      : action === "group"
                        ? "그룹 이름"
                        : "초대 코드"}
                    <input
                      autoFocus
                      value={draft}
                      maxLength={60}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder={action === "join" ? "FCC-DEMO" : ""}
                      required
                    />
                  </label>
                  {action === "elder" && (
                    <>
                      <label className="field">
                        생년월일
                        <input
                          type="date"
                          value={birthDraft}
                          onChange={(e) => setBirthDraft(e.target.value)}
                          required
                        />
                      </label>
                      <label className="field">
                        기본 특이사항
                        <textarea
                          value={noteDraft}
                          maxLength={500}
                          onChange={(e) => setNoteDraft(e.target.value)}
                        />
                      </label>
                    </>
                  )}
                  {action === "join" && (
                    <p className="micro">시연 코드: FCC-DEMO</p>
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
                  onClick={() => setAction(null)}
                >
                  취소
                </button>
                <button className="primary" type="submit">
                  {action === "change"
                    ? "변경 확인"
                    : action === "join"
                      ? "참여 시연"
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
