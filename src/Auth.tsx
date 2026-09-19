import { useState, type FormEvent } from "react";
import { ApiError, auth, errorMessage, type Session } from "./api";
import { Icon } from "./ui";

type Mode = "login" | "register" | "confirm";

export function Auth({
  onLogin,
  expired,
}: {
  onLogin: (s: Session) => void;
  expired: boolean;
}) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState(
    expired ? "로그인이 만료되었습니다. 다시 로그인해 주세요." : "",
  );
  const [busy, setBusy] = useState(false);

  const go = (next: Mode) => {
    setMode(next);
    setError("");
    setInfo("");
  };
  async function login() {
    onLogin(await auth.login(email.trim(), password));
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError("");
    setInfo("");
    if (mode === "register") {
      if (!name.trim()) return setError("표시할 이름을 입력해 주세요.");
      if (password.length < 12 || password.length > 128)
        return setError("비밀번호는 12~128자여야 합니다.");
    }
    setBusy(true);
    try {
      if (mode === "login") await login();
      else if (mode === "register") {
        const r = await auth.register(email.trim(), password, name.trim());
        if (r.confirmationRequired) {
          setMode("confirm");
          setInfo("이메일로 보낸 확인 코드를 입력해 주세요.");
        } else await login();
      } else {
        await auth.confirm(email.trim(), code.trim());
        await login();
      }
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 0
          ? err.message
          : errorMessage(err, "요청에 실패했습니다. 다시 시도해 주세요."),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-page">
      <section className="card auth-card">
        <div className="auth-intro">
          <Icon name="cloud" size={44} />
          <h1>Family Care Cloud</h1>
          <p>가족의 돌봄을, 하나의 이야기로</p>
        </div>
        <h2 className="small-title">
          {mode === "login"
            ? "로그인"
            : mode === "register"
              ? "회원가입"
              : "이메일 확인"}
        </h2>
        <form onSubmit={submit}>
          <fieldset disabled={busy} className="form-fields">
            {mode === "register" && (
              <label className="field">
                이름
                <input
                  autoComplete="name"
                  maxLength={100}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </label>
            )}
            <label className="field">
              이메일
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                readOnly={mode === "confirm"}
                required
              />
            </label>
            {mode !== "confirm" ? (
              <label className="field">
                비밀번호
                <input
                  type="password"
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  maxLength={128}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                {mode === "register" && <small>12자 이상 입력해 주세요.</small>}
              </label>
            ) : (
              <label className="field">
                확인 코드
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={20}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                />
              </label>
            )}
          </fieldset>
          {info && (
            <p className="inline-note" role="status">
              {info}
            </p>
          )}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <div className="actions">
            <button type="submit" className="primary full" disabled={busy}>
              {busy
                ? "처리 중…"
                : mode === "login"
                  ? "로그인"
                  : mode === "register"
                    ? "가입하기"
                    : "확인하고 로그인"}
            </button>
          </div>
        </form>
        <div className="actions spread">
          {mode === "login" ? (
            <button className="text-button" onClick={() => go("register")}>
              회원가입
            </button>
          ) : (
            <button className="text-button" onClick={() => go("login")}>
              로그인 화면으로
            </button>
          )}
          {mode === "login" && (
            <button className="text-button" onClick={() => go("confirm")}>
              이메일 확인 코드 입력
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
