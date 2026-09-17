import { useState, type FormEvent } from "react";
import { authApi, saveSession, type Session } from "./api";
import { Icon, Modal } from "./ui";
import type { RealCtx } from "./RealApp";

export function RealProfile({
  ctx,
  onClose,
  onSessionChange,
  onLogout,
  onSwitchGroup,
}: {
  ctx: RealCtx;
  onClose: () => void;
  onSessionChange: (session: Session) => void;
  onLogout: () => void;
  onSwitchGroup: () => void;
}) {
  const [name, setName] = useState(ctx.session.user.name);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy || !name.trim()) return;
    setBusy(true);
    setError("");
    try {
      const updated = await authApi.updateName(ctx.token, name.trim());
      const session: Session = { accessToken: ctx.token, user: updated };
      saveSession(session);
      onSessionChange(session);
      ctx.notify("프로필을 수정했습니다.");
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "프로필 수정에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    try {
      await authApi.logout(ctx.token);
    } catch {
      // ignore network errors on logout; clear local session regardless
    }
    onLogout();
  }

  return (
    <Modal title="내 프로필" onClose={onClose}>
      <div className="auth-intro">
        <Icon name="cloud" size={40} />
        <p>{ctx.session.user.email}</p>
      </div>
      <form onSubmit={submit}>
        <label className="field">
          표시 이름
          <input maxLength={30} value={name} onChange={(e) => setName(e.target.value)} required />
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
        <button className="text-button" onClick={() => void logout()}>
          <Icon name="logout" size={16} />
          로그아웃
        </button>
        <button className="text-button" onClick={onSwitchGroup}>
          그룹 변경
        </button>
      </div>
    </Modal>
  );
}
