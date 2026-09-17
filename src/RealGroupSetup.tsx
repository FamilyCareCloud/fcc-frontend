import { SettingsPreview } from "./UxDetails";
import { useEffect, useState, type FormEvent } from "react";
import { groupsApi, saveGroupId, type GroupSummary } from "./api";
import { Icon } from "./ui";

type Action = "create" | "join" | null;

export function RealGroupSetup({
  token,
  onGroupSelected,
  onLogout,
}: {
  token: string;
  onGroupSelected: (groupId: string) => void;
  onLogout: () => void;
}) {
  const [joined,setJoined]=useState<string|null>(null);
  const [groups, setGroups] = useState<GroupSummary[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [action, setAction] = useState<Action>(null);
  const [name, setName] = useState("");
  const [elderName, setElderName] = useState("");
  const [inviteToken, setInviteToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    groupsApi
      .list(token)
      .then((list) => {
        if (active) setGroups(list);
      })
      .catch((e) => {
        if (active)
          setLoadError(e instanceof Error ? e.message : "그룹을 불러올 수 없습니다.");
      });
    return () => {
      active = false;
    };
  }, [token]);

  function select(groupId: string) {
    saveGroupId(groupId);
    onGroupSelected(groupId);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      if (action === "create") {
        if (!name.trim()) throw new Error("그룹 이름을 입력해 주세요.");
        const group = await groupsApi.create(token, {
          name: name.trim(),
          elderName: elderName.trim() || undefined,
        });
        setJoined(group.id);
      } else if (action === "join") {
        if (!inviteToken.trim()) throw new Error("초대 코드를 입력해 주세요.");
        const result = await groupsApi.acceptInvite(token, inviteToken.trim());
        setJoined(result.groupId);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "요청을 처리하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="production-gate">
      <div className="card" style={{ textAlign: "left" }}>
        <div className="auth-intro">
          <Icon name="users" size={36} />
          <p>돌봄을 함께할 가족 그룹을 선택해 주세요.</p>
        </div>
        {joined ? <div className="welcome-copy"><Icon name="heart" size={46}/><h1>함께 돌볼 준비가 됐어요!</h1><p>가족 그룹에 참여했어요.<br/>홈에서 돌봄 일정을 확인하고 첫 기록을 남겨 보세요.</p><details className="onboard-pending"><summary>알림 설정 · 준비 중</summary><SettingsPreview/></details><button className="primary full section-gap" onClick={()=>select(joined)}>홈으로 이동</button></div> : <>
        <h1 style={{fontSize:24,textAlign:"center"}}>{action === "join" ? "가족의 초대를 받으셨나요?" : action === "create" ? "우리 가족의 공간 만들기" : "우리 가족의 공간"}</h1>
        {action === "join" && <><div className="onboard-steps"><span className="active">1 초대 코드</span><span>2 그룹 참여</span><span>3 시작하기</span></div><p className="inline-note">초대받은 이메일의 계정으로 코드를 입력해 주세요. 코드는 숫자뿐 아니라 문자를 포함할 수 있어요.</p><details className="onboard-pending"><summary>참여 전 그룹 확인 · 준비 중</summary><div className="detail-banner"><Icon name="users" size={32}/><p>돌봄 대상과 구성원을 미리 확인하는 화면을 준비하고 있어요.</p><button className="secondary" disabled>그룹 정보 미리 보기</button></div></details></>}
        {loadError && (
          <p className="error" role="alert">
            {loadError}
          </p>
        )}
        {groups === null && !loadError && (
          <p className="inline-note">그룹을 불러오는 중입니다…</p>
        )}
        {groups && groups.length > 0 && !action && (
          <div className="member-list">
            {groups.map((g) => (
              <button
                key={g.id}
                className="schedule-preview"
                onClick={() => select(g.id)}
              >
                <span>
                  <strong>{g.name}</strong>
                  <small>{g.elder ? `${g.elder.name} 님` : "고령자 미등록"}</small>
                </span>
                <Icon name="chevron" size={16} />
              </button>
            ))}
          </div>
        )}
        {!action ? (
          <div className="actions spread section-gap">
            <button className="text-button" onClick={() => setAction("join")}>
              초대 코드로 참여
            </button>
            <button className="primary" onClick={() => setAction("create")}>
              <Icon name="plus" size={16} />
              그룹 만들기
            </button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="section-gap">
            <fieldset disabled={busy} className="form-fields">
              {action === "create" ? (
                <>
                  <label className="field">
                    그룹 이름
                    <input
                      autoFocus
                      required
                      maxLength={60}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="가족 그룹 이름을 입력해 주세요."
                    />
                  </label>
                  <label className="field">
                    고령자 이름 (선택)
                    <input
                      maxLength={60}
                      value={elderName}
                      onChange={(e) => setElderName(e.target.value)}
                      placeholder="나중에 가족 관리에서 등록해도 됩니다."
                    />
                  </label>
                </>
              ) : (
                <label className="field">
                  초대 코드
                  <input
                    autoFocus
                    required
                    value={inviteToken}
                    onChange={(e) => setInviteToken(e.target.value)}
                  />
                </label>
              )}
            </fieldset>
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
                onClick={() => {
                  setAction(null);
                  setError("");
                }}
              >
                취소
              </button>
              <button type="submit" className="primary" disabled={busy}>
                {busy ? "처리 중…" : action === "create" ? "그룹 만들기" : "참여하기"}
              </button>
            </div>
          </form>
        )}
        </>}<div className="actions spread section-gap">
          <button className="text-button" onClick={onLogout}>
            <Icon name="logout" size={16} />
            로그아웃
          </button>
        </div>
      </div>
    </main>
  );
}
