import { PasswordInput } from "./PasswordInput";
import { SettingsPreview } from "./UxDetails";
import { useEffect, useState, type FormEvent } from "react";
import { authApi, ApiError, saveSession, type Session, type VerificationInfo } from "./api";
import { Icon } from "./ui";

const emailDomains = ["gmail.com", "naver.com", "daum.net", "hanmail.net", "nate.com", "kakao.com", "outlook.com", "hotmail.com", "icloud.com", "yahoo.com"] as const;

type Mode = "login" | "register" | "confirm" | "complete";

function errorMessage(e: unknown, fallback: string) {
  if (e instanceof ApiError) {
    return e.message || fallback;
  }
  return e instanceof Error ? e.message : fallback;
}

export function RealAuth({
  onAuthenticated,
  onBack,
}: {
  onAuthenticated: (session: Session) => void;
  onBack?: () => void;
}) {
  const [mode, setMode] = useState<Mode>("login");
  const [emailId, setEmailId] = useState("");
  const [domainChoice, setDomainChoice] = useState("gmail.com");
  const [customDomain, setCustomDomain] = useState("");
  const email = emailId.trim() + "@" + (domainChoice === "custom" ? customDomain.trim() : domainChoice);

  function updateEmail(value: string) {
    const at = value.indexOf("@");
    if (at < 0) { setEmailId(value); return; }
    setEmailId(value.slice(0, at));
    const domain = value.slice(at + 1).trim().toLowerCase();
    if (emailDomains.some((item) => item === domain)) setDomainChoice(domain);
    else { setDomainChoice("custom"); setCustomDomain(domain); }
  }
  const [passwordConfirm,setPasswordConfirm]=useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const [verification, setVerification] = useState<VerificationInfo>({});
  const [retryAt, setRetryAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const remaining = Math.max(0, Math.ceil((retryAt - now) / 1000));
  useEffect(() => {
    if (mode !== "confirm") return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [mode]);
  function applyVerification(info: VerificationInfo = {}) {
    setVerification(info);
    const time = Date.now(); setNow(time);
    setRetryAt(typeof info.retryAfterSeconds === "number"
      ? time + Math.max(0, info.retryAfterSeconds) * 1000
      : Date.parse(info.resendAvailableAt ?? "") || 0);
  }
  function handleError(e: unknown) {
    setNotice("");
    if (e instanceof ApiError) {
      if (e.details) applyVerification(e.details);
      if (e.code === "EMAIL_NOT_VERIFIED" || e.details?.nextAction === "RESEND_CONFIRMATION") {
        setMode("confirm"); setCode("");
      } else if (e.code === "ACCOUNT_ALREADY_EXISTS" || e.code === "ACCOUNT_ALREADY_CONFIRMED") {
        setMode("login");
      } else if (e.code === "ACCOUNT_NOT_FOUND") { setMode("register"); }
    }
    setError(errorMessage(e, "요청을 처리하지 못했습니다."));
  }
  async function resend() {
    if (busy || remaining > 0) return;
    setBusy(true); setError(""); setNotice("");
    try {
      applyVerification(await authApi.resend(email)); setCode("");
      setNotice("인증메일 발송 요청이 접수됐어요. 메일함과 스팸함을 확인해 주세요.");
    } catch (e) { handleError(e); }
    finally { setBusy(false); }
  }
  async function submit(e: FormEvent) {
    e.preventDefault(); if (busy) return;
    setError(""); setNotice(""); setBusy(true);
    try {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("이메일 아이디와 도메인을 확인해 주세요.");
      if (mode === "register") {
        if (!name.trim()) throw new Error("이름을 입력해 주세요.");
        if (password !== passwordConfirm) throw new Error("비밀번호가 일치하지 않아요.");
        if (password.length < 8 || password.length > 128 || /\s/.test(password) || !/[\x21-\x2f\x3a-\x40\x5b-\x60\x7b-\x7e]/.test(password)) {
          throw new Error("비밀번호는 공백 없이 8~128자, 특수문자 1개 이상으로 입력해 주세요.");
        }
        const result = await authApi.register({ email, password, name });
        applyVerification(result); setCode("");
        if (result.confirmationRequired === false || result.status === "CONFIRMED") {
          setMode("complete"); setNotice("가입이 완료되었어요. 로그인해 주세요.");
        } else {
          setMode("confirm");
          setNotice(result.deliveryStatus === "accepted"
            ? "인증메일 발송 요청이 접수됐어요. 메일함과 스팸함을 확인해 주세요."
            : "이메일 확인이 필요해요. 코드가 없다면 인증코드 재전송을 눌러 주세요.");
        }
        setPasswordConfirm("");
      } else if (mode === "confirm") {
        if (!/^\d{6}$/.test(code.trim())) throw new Error("6자리 숫자 인증코드를 입력해 주세요.");
        await authApi.confirm({ email, code: code.trim() });
        setNotice("이메일 확인이 완료되었습니다."); setCode(""); setMode("complete");
      } else {
        if (!password) throw new Error("비밀번호를 입력해 주세요.");
        const result = await authApi.login({ email, password });
        const session: Session = { accessToken: result.accessToken, user: result.user };
        saveSession(session); onAuthenticated(session);
      }
    } catch (e) { handleError(e); }
    finally { setBusy(false); }
  }

  return (
    <main className="production-gate">
      <div className="card" style={{ textAlign: "left" }}>
        {onBack && <button className="text-button" onClick={onBack}>← 둘러보기로 돌아가기</button>}
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
        {notice && <p className="inline-note" role="status">{notice}</p>}
        {mode === "complete" ? <div className="welcome-copy"><Icon name="heart" size={48}/><h2>환영합니다!</h2><p>이제 가족과 함께 돌봄을 시작해 보세요.<br/>로그인 후 초대 코드로 그룹에 참여하거나 새 그룹을 만들 수 있어요.</p><button className="primary full" onClick={()=>{setMode("login");setNotice("");}}>로그인하러 가기</button></div> : <>
        {mode !== "login" && <div className="onboard-steps"><span className={mode === "register"?"active":""}>1 가입정보</span><span className={mode === "confirm"?"active":""}>2 이메일 확인</span><span>3 가입 완료</span></div>}
        <form onSubmit={submit} noValidate>
          <fieldset disabled={busy} className="form-fields">
            <div className="field">
              <label htmlFor="auth-email-id">이메일</label>
              <div className="email-input-row">
                <input id="auth-email-id" aria-label="이메일 아이디" type="text"
                  disabled={mode === "confirm"} autoFocus required autoCapitalize="none" spellCheck={false}
                  autoComplete="username" placeholder="아이디" value={emailId}
                  onChange={(e) => updateEmail(e.target.value)} />
                <span aria-hidden="true">@</span>
                <select disabled={mode === "confirm"} aria-label="이메일 도메인 선택" value={domainChoice}
                  onChange={(e) => setDomainChoice(e.target.value)}>
                  {emailDomains.map((domain) => <option key={domain}>{domain}</option>)}
                  <option value="custom">직접 입력</option>
                </select>
              </div>
              {domainChoice === "custom" && (
                <input disabled={mode === "confirm"} aria-label="이메일 도메인 직접 입력" type="text" required
                  autoCapitalize="none" spellCheck={false} placeholder="도메인 입력 (예: example.com)"
                  value={customDomain} onChange={(e) => setCustomDomain(e.target.value)} />
              )}
            </div>
            {mode !== "confirm" && <><PasswordInput key={mode} label="비밀번호" required minLength={mode === "register" ? 8 : undefined} maxLength={128} autoComplete={mode === "register" ? "new-password" : "current-password"} value={password} onChange={e=>setPassword(e.target.value)}/>{mode === "register" && <p className="micro">공백 없이 8~128자, 특수문자 1개 이상 (!, @, # 등). 대문자·소문자·숫자는 필수가 아니에요.</p>}</>}
            {mode === "register" && <PasswordInput label="비밀번호 확인" required maxLength={128} autoComplete="new-password" value={passwordConfirm} onChange={e=>setPasswordConfirm(e.target.value)}/>}
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
                  inputMode="numeric" autoComplete="one-time-code" maxLength={6}
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
        {mode === "confirm" && <div className="verification-actions">
          <p className="micro">{email}의 메일함과 스팸함을 확인해 주세요. 인증코드는 발송 후 24시간 동안 유효해요.</p>
          {verification.codeExpiresAt && <p className="micro">예상 만료: {new Date(verification.codeExpiresAt).toLocaleString("ko-KR")}</p>}
          <button type="button" className="secondary full" disabled={busy || remaining > 0} onClick={resend}>
            {remaining > 0 ? `${remaining}초 후 재전송 가능` : "인증코드 재전송"}
          </button>
          <p className="micro">발송 요청은 60초 간격으로, 최초 발송을 포함해 1시간에 최대 5회 가능해요.</p>
          <button type="button" className="text-button" disabled={busy} onClick={() => { setMode("register"); setCode(""); setError(""); setNotice(""); applyVerification(); }}>이메일 수정 / 다시 가입하기</button>
        </div>}
        {mode === "register" && <details className="onboard-pending"><summary>추가 가입정보·알림 설정 (준비 중)</summary><fieldset disabled className="form-fields"><label className="field">연락처<input placeholder="준비 중"/></label><label className="field">돌봄 대상과의 관계<select><option>관계 선택 · 준비 중</option>{["아들","딸","며느리","사위","배우자","손자·손녀","도우미","의사","기타"].map(x=><option key={x}>{x}</option>)}</select></label><label><input type="checkbox" disabled/> 서비스 이용약관 · 준비 중</label><label><input type="checkbox" disabled/> 마케팅 정보 수신 동의 · 준비 중</label></fieldset><SettingsPreview/></details>}</>}
        <div className="actions spread">
          {mode === "login" ? (
            <button
              className="text-button" disabled={busy}
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
              className="text-button" disabled={busy}
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
