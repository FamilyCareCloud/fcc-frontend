import { useState, type FormEvent } from "react";
import { auth, errorMessage, type User } from "./api";
import { Icon, Modal } from "./ui";

export function Profile({
  user,
  setUser,
  notify,
  onLogout,
  onClose,
}: {
  user: User;
  setUser: (u: User) => void;
  notify: (s: string) => void;
  onLogout: () => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(user.name);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!draft.trim()) return setError("표시할 이름을 입력해 주세요.");
    setBusy(true);
    setError("");
    try {
      const updated = await auth.rename(draft.trim());
      setUser({ ...user, name: updated.name });
      notify("프로필을 수정했습니다.");
      onClose();
    } catch (err) {
      setError(errorMessage(err, "프로필을 저장하지 못했습니다."));
      setBusy(false);
    }
  }
  return (
    <Modal title="내 프로필" onClose={onClose}>
      <div className="auth-intro">
        <Icon name="cloud" size={40} />
        <p>가족의 돌봄을 함께 이어가요.</p>
      </div>
      <form onSubmit={submit}>
        <label className="field">
          표시 이름
          <input
            maxLength={100}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
        </label>
        <label className="field">
          이메일
          <input type="email" value={user.email} readOnly disabled />
        </label>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <div className="actions">
          <button type="submit" className="primary full" disabled={busy}>
            {busy ? "저장 중…" : "프로필 저장"}
          </button>
        </div>
      </form>
      <div className="actions spread">
        <button className="text-button" onClick={onLogout}>
          <Icon name="logout" size={16} />
          로그아웃
        </button>
      </div>
    </Modal>
  );
}
