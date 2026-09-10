import { useState, type FormEvent } from "react";
import { authApi, ApiError, saveSession, type Session } from "./api";
import { Icon } from "./ui";

type Mode = "login" | "register" | "confirm";

function errorMessage(e: unknown, fallback: string) {
  if (e instanceof ApiError) {
    if (e.status === 429) return "로그인 시도가 많습니다. 잠시 후 다시 시도해 주세요.";
    return e.message || fallback;
  }
  return e instanceof Error ? e.message : fallback;
}

export function RealAuth({
  onAuthenticated,
}: {
  onAuthenticated: (session: Session) => void;
}) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      if (mode === "register") {
        if (password.length < 12 || password.length > 128) {
          throw new Error("비밀번호는 12자 이상 128자 이하로 입력해 주세요.");
        }
        await authApi.register({ email, password, name });
        setNotice(`${email}로 발송된 확인 코드를 입력해 주세요.`);
        setMode("confirm");
      } else if (mode === "confirm") {
        await authApi.confirm({ email, code });
        setNotice("이메일 확인이 완료되었습니다. 로그인해 주세요.");
        setMode("login");
      } else {
        const result = await authApi.login({ email, password });
        const session: Session = { accessToken: result.accessToken, user: result.user };
        saveSession(session);
        onAuthenticated(session);
      }
    } catch (e) {
      setError(errorMessage(e, "요청을 처리하지 못했습니다."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="production-gate">
      <div className="card" style={{ textAlign: "left" }}>
        <div className="auth-intro">
          <Icon name="cloud" size={40} />
          <p>가족의 돌봄을 함께 이어가요.</p>
        </div>
        <h1 style={{ fontSize: 20, marginBottom: 18, textAlign: "center" }}>
          {mode === "login"
            ? "로그인"
            : mode === "register"
              ? "회원가입"
              : "이메일 확인"}
        </h1>
        {notice && <p className="inline-note">{notice}</p>}
        <form onSubmit={submit} noValidate>
          <fieldset disabled={busy} className="form-fields">
            <label className="field">
              이메일
              <input
                type="email"
                autoFocus
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            {mode !== "confirm" && (
              <label className="field">
                비밀번호
                <input
                  type="password"
                  required
                  minLength={12}
                  maxLength={128}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                {mode === "register" && <small>12~128자로 입력해 주세요.</small>}
              </label>
            )}
            {mode === "register" && (
              <label className="field">
                이름
                <input
                  required
                  maxLength={60}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
            )}
            {mode === "confirm" && (
              <label className="field">
                확인 코드
                <input
                  required
                  autoFocus
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
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
            <button type="submit" className="primary full" disabled={busy}>
              {busy
                ? "처리 중…"
                : mode === "login"
                  ? "로그인"
                  : mode === "register"
                    ? "가입하기"
                    : "확인"}
            </button>
          </div>
        </form>
        <div className="actions spread">
          {mode === "login" ? (
            <button
              className="text-button"
              onClick={() => {
                setMode("register");
                setError("");
                setNotice("");
              }}
            >
              계정이 없으신가요? 회원가입
            </button>
          ) : (
            <button
              className="text-button"
              onClick={() => {
                setMode("login");
                setError("");
                setNotice("");
              }}
            >
              로그인 화면으로
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
