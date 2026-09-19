import { useState, type FormEvent } from "react";
import { errorMessage, groups } from "./api";
import { Icon } from "./ui";

export function CreateGroupForm({
  onDone,
  onCancel,
}: {
  onDone: (groupId: string) => void;
  onCancel?: () => void;
}) {
  const [name, setName] = useState("");
  const [elderName, setElderName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!name.trim()) return setError("그룹 이름을 입력해 주세요.");
    setBusy(true);
    setError("");
    try {
      const group = await groups.create(
        name.trim(),
        elderName.trim() || undefined,
      );
      onDone(group.id);
    } catch (err) {
      setError(errorMessage(err, "그룹을 만들지 못했습니다."));
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} noValidate>
      <label className="field">
        그룹 이름
        <input
          autoFocus
          maxLength={100}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예: 영숙 님을 돌보는 가족"
          required
        />
      </label>
      <label className="field">
        돌봄 대상자 이름 (선택)
        <input
          maxLength={100}
          value={elderName}
          onChange={(e) => setElderName(e.target.value)}
          placeholder="나중에 가족 관리에서 등록해도 됩니다"
        />
      </label>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="actions">
        {onCancel && (
          <button type="button" className="secondary" onClick={onCancel}>
            취소
          </button>
        )}
        <button type="submit" className="primary" disabled={busy}>
          {busy ? "만드는 중…" : "그룹 만들기"}
        </button>
      </div>
    </form>
  );
}

export function JoinGroupForm({
  onDone,
  onCancel,
}: {
  onDone: (groupId: string) => void;
  onCancel?: () => void;
}) {
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!token.trim()) return setError("초대 코드를 입력해 주세요.");
    setBusy(true);
    setError("");
    try {
      const r = await groups.accept(token.trim());
      onDone(r.groupId);
    } catch (err) {
      setError(errorMessage(err, "그룹에 참여하지 못했습니다."));
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} noValidate>
      <label className="field">
        초대 코드
        <input
          autoFocus
          value={token}
          maxLength={200}
          onChange={(e) => setToken(e.target.value)}
          required
        />
        <small>초대받은 이메일 계정으로 로그인한 상태여야 합니다.</small>
      </label>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="actions">
        {onCancel && (
          <button type="button" className="secondary" onClick={onCancel}>
            취소
          </button>
        )}
        <button type="submit" className="primary" disabled={busy}>
          {busy ? "참여 중…" : "그룹 참여"}
        </button>
      </div>
    </form>
  );
}

/** 소속 그룹이 없는 사용자의 첫 화면입니다. */
export function Onboarding({
  name,
  onDone,
  onLogout,
}: {
  name: string;
  onDone: (groupId: string) => void;
  onLogout: () => void;
}) {
  return (
    <main className="auth-page">
      <div className="onboarding">
        <div className="auth-intro">
          <Icon name="cloud" size={44} />
          <h1>{name} 님, 환영합니다</h1>
          <p>가족 그룹을 만들거나, 받은 초대 코드로 참여해 주세요.</p>
        </div>
        <div className="two-column">
          <section className="card">
            <h2 className="small-title">새 가족 그룹 만들기</h2>
            <CreateGroupForm onDone={onDone} />
          </section>
          <section className="card">
            <h2 className="small-title">초대 코드로 참여하기</h2>
            <JoinGroupForm onDone={onDone} />
          </section>
        </div>
        <div className="actions">
          <button className="text-button" onClick={onLogout}>
            로그아웃
          </button>
        </div>
      </div>
    </main>
  );
}
