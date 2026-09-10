import { useRef, useState } from "react";
import { assistantApi, ApiError, type AssistantAnswer } from "./api";
import { AUDIO_MAX_BYTES, blobToBase64, startRecording, type Recorder } from "./voice";
import { Badge, Empty, Icon } from "./ui";
import type { RealCtx } from "./RealApp";

function textErr(e: unknown) {
  if (e instanceof ApiError && e.status === 502) return "AI 비서가 답변을 만들지 못했습니다. 다시 시도해 주세요.";
  return e instanceof Error ? e.message : "질문을 처리하지 못했습니다.";
}
function voiceErr(e: unknown) {
  if (e instanceof ApiError) {
    if (e.status === 503) return "음성 인식 서버가 아직 연결되어 있지 않습니다.";
    if (e.status === 502) return "음성 인식 서버에 연결하지 못했습니다.";
    if (e.status === 422) return "음성을 인식하지 못했습니다. 다시 말씀해 주세요.";
    if (e.status === 413) return "녹음이 너무 깁니다. 4MB 이하로 다시 녹음해 주세요.";
    return e.message || "음성 질문을 처리하지 못했습니다.";
  }
  return e instanceof Error ? e.message : "음성 질문을 처리하지 못했습니다.";
}

type Answer = AssistantAnswer & { transcript?: string; question: string };

export function RealAssistant({ ctx }: { ctx: RealCtx }) {
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<Answer[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<Recorder | null>(null);

  async function ask() {
    if (busy || !question.trim()) return;
    setBusy(true);
    setError("");
    try {
      const result = await assistantApi.ask(ctx.token, ctx.groupId, question.trim());
      setHistory((all) => [{ ...result, question: question.trim() }, ...all]);
      setQuestion("");
    } catch (e) {
      setError(textErr(e));
    } finally {
      setBusy(false);
    }
  }

  async function toggleRecording() {
    setError("");
    if (recording) {
      const recorder = recorderRef.current;
      recorderRef.current = null;
      setRecording(false);
      if (!recorder) return;
      setBusy(true);
      try {
        const { blob, mimeType } = await recorder.stop();
        if (blob.size > AUDIO_MAX_BYTES) {
          throw new Error("녹음이 너무 깁니다. 4MB 이하로 다시 녹음해 주세요.");
        }
        const audioBase64 = await blobToBase64(blob);
        const result = await assistantApi.askVoice(ctx.token, ctx.groupId, audioBase64, mimeType);
        setHistory((all) => [{ ...result, question: result.transcript }, ...all]);
      } catch (e) {
        setError(voiceErr(e));
      } finally {
        setBusy(false);
      }
    } else {
      try {
        recorderRef.current = await startRecording();
        setRecording(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "마이크를 사용할 수 없습니다.");
      }
    }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">AI ASSISTANT</div>
          <h1>AI 비서</h1>
          <p>병원·복약·방문·오늘 일정·담당자를 텍스트나 음성으로 물어보세요.</p>
        </div>
      </div>
      <section className="card">
        <div className="form-row">
          <label className="field" style={{ flex: 1 }}>
            질문
            <input
              value={question}
              disabled={busy || recording}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void ask();
              }}
              placeholder="예: 이번 주 병원 일정이 있나요?"
            />
          </label>
        </div>
        <div className="actions" style={{ justifyContent: "flex-start" }}>
          <button className="primary" disabled={busy || recording || !question.trim()} onClick={() => void ask()}>
            질문하기
          </button>
          <button
            type="button"
            className={recording ? "danger" : "secondary"}
            disabled={busy && !recording}
            onClick={() => void toggleRecording()}
          >
            <Icon name="mic" size={18} />
            {recording ? "녹음 중지" : "음성으로 질문"}
          </button>
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {busy && (
          <p className="inline-note" role="status">
            {recording ? "" : "답변을 준비하는 중입니다…"}
          </p>
        )}
      </section>
      <section className="card section-gap">
        <h2 className="small-title">대화 이력</h2>
        {!history.length && <Empty text="아직 질문한 내용이 없습니다." />}
        {history.map((h, i) => (
          <div className="history-item" key={i} style={{ flexDirection: "column", alignItems: "flex-start" }}>
            <span>
              <Badge>{h.transcript !== undefined ? "음성" : "텍스트"}</Badge> {h.question}
            </span>
            <p className="detail-content">{h.answer}</p>
            {h.requiresApproval && <p className="micro">이 요청은 담당 보호자 승인이 필요합니다.</p>}
          </div>
        ))}
      </section>
    </>
  );
}
