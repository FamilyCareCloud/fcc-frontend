import { useEffect, useRef, useState, type FormEvent } from "react";
import { assistant, errorMessage } from "./api";

const MAX_RECORD_MS = 15000;

const toBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

/** 저장된 일정·담당자에 대한 짧은 질문(텍스트/음성). 답변은 DB 근거로만 만들어집니다. */
export function Assistant({
  groupId,
  notify,
}: {
  groupId: string;
  notify: (text: string) => void;
}) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [heard, setHeard] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const canRecord =
    typeof MediaRecorder !== "undefined" && !!navigator.mediaDevices?.getUserMedia;

  useEffect(
    () => () => {
      clearTimeout(timer.current);
      recorder.current?.stream.getTracks().forEach((t) => t.stop());
    },
    [],
  );

  async function ask(e: FormEvent) {
    e.preventDefault();
    if (busy || !question.trim()) return;
    setBusy(true);
    setError("");
    setHeard("");
    try {
      setAnswer((await assistant.ask(groupId, question.trim())).answer);
    } catch (err) {
      setError(errorMessage(err, "질문에 답하지 못했습니다."));
    } finally {
      setBusy(false);
    }
  }
  async function sendVoice(blob: Blob) {
    setBusy(true);
    setError("");
    try {
      const r = await assistant.voice(
        groupId,
        await toBase64(blob),
        blob.type.split(";")[0] || undefined,
      );
      setHeard(r.transcript ?? "");
      setAnswer(r.answer);
    } catch (err) {
      // 413 용량 초과, 422 인식 실패, 502/503 STT 서버 문제 모두 서버 문구로 안내합니다.
      setError(errorMessage(err, "음성 질문을 처리하지 못했습니다."));
    } finally {
      setBusy(false);
    }
  }
  async function toggleRecord() {
    if (recording) {
      recorder.current?.stop();
      return;
    }
    if (busy) return;
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      rec.ondataavailable = (ev) => chunks.push(ev.data);
      rec.onstop = () => {
        clearTimeout(timer.current);
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        void sendVoice(new Blob(chunks, { type: rec.mimeType }));
      };
      recorder.current = rec;
      rec.start();
      setRecording(true);
      timer.current = setTimeout(() => rec.stop(), MAX_RECORD_MS);
      notify("듣고 있어요. 다시 누르면 전송합니다.");
    } catch {
      setError("마이크를 사용할 수 없습니다. 브라우저 권한을 확인해 주세요.");
    }
  }
  return (
    <section className="card" aria-label="돌봄 도우미">
      <form onSubmit={ask} className="assistant-row">
        <input
          value={question}
          maxLength={500}
          disabled={busy || recording}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="예: 다음 병원 일정이 언제야? / 지금 담당 보호자는 누구야?"
          aria-label="돌봄 도우미에게 질문"
        />
        <button className="primary" type="submit" disabled={busy || recording}>
          질문
        </button>
        {canRecord && (
          <button
            type="button"
            className={recording ? "danger" : "secondary"}
            disabled={busy}
            onClick={() => void toggleRecord()}
          >
            {recording ? "전송" : "음성 질문"}
          </button>
        )}
      </form>
      {busy && (
        <p className="micro" role="status">
          확인하는 중…
        </p>
      )}
      {heard && <p className="micro">인식한 질문: “{heard}”</p>}
      {answer && <p className="assistant-answer">{answer}</p>}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <p className="micro">
        저장된 병원·복약·방문·오늘 일정과 담당 보호자만 알려드립니다.
      </p>
    </section>
  );
}
