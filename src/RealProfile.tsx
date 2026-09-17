import { SettingsPreview } from "./UxDetails";
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
  const [section, setSection] = useState("메뉴");
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
      <div className="profile-heading"><span className="avatar green">{ctx.session.user.name.slice(-2)}</span><h3>{ctx.session.user.name} 님</h3><small>{ctx.session.user.email}</small></div>
      {section === "메뉴" ? <div className="profile-menu">{[["내 정보","이름과 프로필 정보"],["보안","계정과 비밀번호"],["알림·화면 설정","알림, 글자 크기, 음성 안내"]].map(([title,desc])=><button key={title} onClick={()=>setSection(title)}>{title}<small>{desc}</small></button>)}</div> : <><button className="text-button profile-back section-gap" onClick={()=>setSection("메뉴")}>← 설정 목록</button><h3>{section}</h3></>}
      {section === "알림·화면 설정" && <SettingsPreview/>}
      {section === "보안" && <><p className="inline-note">비밀번호 변경 기능은 준비 중이에요.</p><fieldset disabled className="form-fields"><label className="field">계정 이메일<input value={ctx.session.user.email} readOnly/></label>{["현재 비밀번호","새 비밀번호","새 비밀번호 확인"].map(x=><label className="field" key={x}>{x}<input type="password" autoComplete="off"/></label>)}<button className="primary full" disabled>비밀번호 변경</button></fieldset></>}
      {section === "내 정보" && <>
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
      </form><div className="onboard-pending"><p className="micro">추가 프로필 정보는 준비 중이에요.</p><fieldset disabled className="form-fields"><button className="secondary" type="button" disabled>프로필 사진 선택</button>{["연락처","생년월일","성별","돌봄 대상과의 관계"].map(x=><label className="field" key={x}>{x}<input placeholder="준비 중"/></label>)}</fieldset></div></>}
      <div className="actions spread">
        <button className="text-button" onClick={() => void logout()}>
          <Icon name="logout" size={16} />
          로그아웃
        </button>
        <button className="text-button" onClick={onSwitchGroup}>
          그룹 변경
        </button>
        <button className="text-button" disabled>회원 탈퇴 · 준비 중</button>
      </div>
    </Modal>
  );
}
