import { useRef, useState } from "react";
import { dateLabel, day, localInput, timeLabel, type CareEvent } from "./data";
import { Badge, Empty, Icon } from "./ui";
import type { Shared } from "./App";
type HandoffResult = {
  id: string;
  from: string;
  to: string;
  createdAt: string;
  health: string[];
  life: string[];
  schedules: string[];
  followUp: string[];
  confirmed: boolean;
};
export function Handoff({
  events,
  schedules,
  notify,
}: Pick<Shared, "events" | "schedules" | "notify">) {
  const [from, setFrom] = useState(day(-7));
  const [to, setTo] = useState(day());
  const [history, setHistory] = useState<HandoffResult[]>([]);
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fail = useRef(false);
  const lock = useRef(false);
  const result = history.find((h) => h.id === selected);
  async function generate() {
    if (lock.current) return;
    setError("");
    if (!from || !to || from > to) {
      setError("시작 날짜와 종료 날짜를 확인해 주세요.");
      return;
    }
    const records = events.filter((e) => {
      const d = localInput(e.timestamp).slice(0, 10);
      return d >= from && d <= to;
    });
    if (!records.length) {
      setError("요약할 돌봄 기록이 없습니다.");
      return;
    }
    lock.current = true;
    setBusy(true);
    try {
      await new Promise((r) => setTimeout(r, 650));
      if (fail.current) {
        fail.current = false;
        throw new Error("인수인계 생성에 실패했습니다. 다시 시도해 주세요.");
      }
      const lines = (types: string[]) =>
        records
          .filter((e) => types.includes(e.type))
          .map((e: CareEvent) => `${dateLabel(e.timestamp)} · ${e.content}`);
      const generated: HandoffResult = {
        id: crypto.randomUUID(),
        from,
        to,
        createdAt: new Date().toISOString(),
        health: lines(["병원", "복약"]),
        life: lines(["식사", "생활"]),
        followUp: lines(["특이사항"]),
        schedules: schedules
          .filter(
            (s) =>
              s.status === "예정" && Date.parse(s.scheduledAt) >= Date.now(),
          )
          .map(
            (s) =>
              `${dateLabel(s.scheduledAt)} ${timeLabel(s.scheduledAt)} · ${s.title}`,
          ),
        confirmed: false,
      };
      setHistory((all) => [generated, ...all]);
      setSelected(generated.id);
      notify("가상 기록으로 인수인계 시연 결과를 만들었습니다.");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "인수인계 생성에 실패했습니다. 다시 시도해 주세요.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">AI CARE HANDOFF</div>
          <h1>AI 인수인계</h1>
          <p>지난 돌봄을 돌아보고, 다음 보호자에게 전해 주세요.</p>
        </div>
        <Badge tone="purple">AI 연결 전 · 시연</Badge>
      </div>
      <div className="handoff-layout">
        <div>
          <section className="card">
            <h2 className="small-title">인수인계 기간</h2>
            <label className="field">
              시작 날짜
              <input
                disabled={busy}
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <label className="field">
              종료 날짜
              <input
                disabled={busy}
                type="date"
                min={from}
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </label>
            <button
              className="primary full"
              disabled={busy}
              onClick={() => void generate()}
            >
              <Icon name="spark" size={18} />
              {busy
                ? "시연 결과 만드는 중…"
                : result
                  ? "인수인계 재생성"
                  : "인수인계 생성"}
            </button>
            <p className="micro">
              선택 기간의 기록을 유형별로 묶고, 앞으로 예정된 일정을 함께
              표시합니다. 실제 AI 요약이 아닙니다.
            </p>
          </section>
          <section className="card section-gap">
            <h2 className="small-title">이전 인수인계</h2>
            {history.map((h) => (
              <button
                key={h.id}
                className={`history-item ${selected === h.id ? "selected" : ""}`}
                onClick={() => setSelected(h.id)}
              >
                <span>
                  {h.from.slice(5)} ~ {h.to.slice(5)}
                  <small className="block">{timeLabel(h.createdAt)} 생성</small>
                </span>
                <Badge tone={h.confirmed ? "green" : "blue"}>
                  {h.confirmed ? "확인됨" : "미확인"}
                </Badge>
              </button>
            ))}
            {!history.length && (
              <p className="micro">아직 생성한 인수인계가 없습니다.</p>
            )}
          </section>
          <details className="demo-tools">
            <summary>시연 도구</summary>
            <div>
              <button
                onClick={() => {
                  fail.current = true;
                  notify("다음 인수인계 생성이 한 번 실패합니다.");
                }}
              >
                다음 생성 실패시키기
              </button>
            </div>
          </details>
        </div>
        <section className="card handoff-output" aria-busy={busy}>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {busy && (
            <p className="inline-note" role="status">
              선택한 돌봄 기록을 모으고 있습니다…
            </p>
          )}
          {!result ? (
            <Empty text="기간을 선택하고 인수인계를 생성해 보세요." />
          ) : (
            <>
              <div className="section-head">
                <div>
                  <h2>다음 보호자에게 전할 내용</h2>
                  <p>
                    {result.from} ~ {result.to}
                  </p>
                </div>
                <Badge tone="purple">가상 결과</Badge>
              </div>
              {(
                [
                  { title: "건강", icon: "heart", items: result.health },
                  { title: "생활", icon: "home", items: result.life },
                  {
                    title: "예정 일정",
                    icon: "calendar",
                    items: result.schedules,
                  },
                  { title: "확인사항", icon: "file", items: result.followUp },
                ] as const
              ).map((section) => (
                <section key={section.title}>
                  <h3>
                    <Icon name={section.icon} size={18} />
                    {section.title}
                  </h3>
                  {section.items.length ? (
                    <ul>
                      {section.items.map((line, i) => (
                        <li key={i}>{line}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>해당하는 내용이 없습니다.</p>
                  )}
                </section>
              ))}
              <p className="micro">
                저장된 원문을 묶은 시연 결과입니다. 의료 판단을 제공하지
                않습니다. 이력은 새로고침하면 초기화됩니다.
              </p>
              <div className="actions">
                <button
                  className={result.confirmed ? "secondary" : "primary"}
                  disabled={result.confirmed || busy}
                  onClick={() => {
                    setHistory((all) =>
                      all.map((h) =>
                        h.id === result.id ? { ...h, confirmed: true } : h,
                      ),
                    );
                    notify("다음 보호자의 인수인계 확인을 시연했습니다.");
                  }}
                >
                  <Icon name="check" size={18} />
                  {result.confirmed
                    ? "인수인계 확인 완료"
                    : "다음 보호자로 확인하기"}
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </>
  );
}
