import { useState, type FormEvent } from "react";
import { Icon, Modal } from "./ui";
export function Profile({
  onClose,
  notify,
  name,
  setName,
}: {
  onClose: () => void;
  notify: (s: string) => void;
  name: string;
  setName: (s: string) => void;
}) {
  const [mode, setMode] = useState<"profile" | "login" | "signup">("profile");
  const [draft, setDraft] = useState(name);
  const [email, setEmail] = useState("jieun@example.com");
  const [error, setError] = useState("");
  function submit(e: FormEvent) {
    e.preventDefault();
    if (!draft.trim()) {
      setError("표시할 이름을 입력해 주세요.");
      return;
    }
    setName(draft.trim());
    notify(
      mode === "profile"
        ? "가상 프로필을 수정했습니다."
        : mode === "login"
          ? "가상 계정으로 로그인 흐름을 시연했습니다."
          : "가상 계정으로 회원가입 흐름을 시연했습니다.",
    );
    onClose();
  }
  return (
    <Modal
      title={
        mode === "profile"
          ? "내 프로필"
          : mode === "login"
            ? "로그인 시연"
            : "회원가입 시연"
      }
      onClose={onClose}
    >
      <div className="auth-intro">
        <Icon name="cloud" size={40} />
        <p>가족의 돌봄을 함께 이어가요.</p>
      </div>
      <p className="inline-note">
        인증 연결 전입니다. 실제 개인정보·비밀번호를 입력하지 마세요. 가상 계정
        화면만 확인할 수 있습니다.
      </p>
      <form onSubmit={submit}>
        <label className="field">
          표시 이름
          <input
            maxLength={30}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
        </label>
        <label className="field">
          시연 이메일
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        {mode !== "profile" && (
          <label className="field">
            비밀번호
            <input type="password" disabled value="demo-password" readOnly />
            <small>실제 인증을 연결할 때 활성화됩니다.</small>
          </label>
        )}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <div className="actions">
          <button type="submit" className="primary full">
            {mode === "profile"
              ? "프로필 저장"
              : mode === "login"
                ? "가상 계정으로 로그인"
                : "가상 계정으로 가입"}
          </button>
        </div>
      </form>
      <div className="actions spread">
        {mode === "profile" ? (
          <>
            <button
              className="text-button"
              onClick={() => {
                setMode("login");
                setError("");
                notify(
                  "로그아웃 후 화면을 시연합니다. 실제 로그인 상태는 없습니다.",
                );
              }}
            >
              <Icon name="logout" size={16} />
              로그아웃 시연
            </button>
            <button className="text-button" onClick={() => setMode("signup")}>
              회원가입 화면
            </button>
          </>
        ) : (
          <>
            <button
              className="text-button"
              onClick={() => {
                setMode(mode === "login" ? "signup" : "login");
                setError("");
              }}
            >
              {mode === "login" ? "회원가입 화면으로" : "로그인 화면으로"}
            </button>
            <button className="text-button" onClick={() => setMode("profile")}>
              프로필로 돌아가기
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}
