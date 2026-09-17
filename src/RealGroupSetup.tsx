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
        select(group.id);
      } else if (action === "join") {
        if (!inviteToken.trim()) throw new Error("초대 코드를 입력해 주세요.");
        const result = await groupsApi.acceptInvite(token, inviteToken.trim());
        select(result.groupId);
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
        <div className="actions spread section-gap">
          <button className="text-button" onClick={onLogout}>
            <Icon name="logout" size={16} />
            로그아웃
          </button>
        </div>
      </div>
    </main>
  );
}
