import { useEffect, useRef, useState } from "react";
import { day, nameOf, timeLabel, type HandoffResult } from "./data";
import { ApiError, errorMessage, handoffs as handoffsApi } from "./api";
import { Badge, Empty, Icon } from "./ui";
import type { Shared } from "./App";

export function Handoff({
  group,
  members,
  me,
  notify,
}: Pick<Shared, "group" | "members" | "me" | "notify">) {
  const [from, setFrom] = useState(day(-7));
  const [to, setTo] = useState(day());
  const [history, setHistory] = useState<HandoffResult[]>([]);
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const result = history.find((h) => h.id === selected);
  const who = (id: string) => nameOf(members, id);

  useEffect(() => {
    let active = true;
    handoffsApi
      .list(group.id)
      .then((list) => {
        if (!active) return;
        setHistory(list);
        setSelected((cur) => cur || list[0]?.id || "");
      })
      .catch((e) => {
        if (active) setError(errorMessage(e, "인수인계 이력을 불러올 수 없습니다."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [group.id]);

  async function run(action: () => Promise<HandoffResult>, done: string) {
    if (lock.current) return;
    setError("");
    if (!from || !to || from > to) {
      setError("시작 날짜와 종료 날짜를 확인해 주세요.");
      return;
    }
    lock.current = true;
    setBusy(true);
    try {
      const generated = await action();
      setHistory((all) => [generated, ...all]);
      setSelected(generated.id);
      notify(done);
    } catch (e) {
      // 422 NO_CARE_EVENTS / 502 HANDOFF_GENERATION_FAILED는 서버 문구를 그대로 안내합니다.
      setError(
        e instanceof ApiError
          ? e.message
          : "인수인계 생성에 실패했습니다. 다시 시도해 주세요.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const generate = () =>
    run(
      () =>
        result
          ? handoffsApi.regenerate(group.id, result.id, from, to)
          : handoffsApi.create(group.id, from, to),
      result ? "인수인계를 새로 생성했습니다." : "인수인계를 생성했습니다.",
    );
  async function acknowledge() {
    if (!result || busy) return;
    setBusy(true);
    setError("");
    try {
      const updated = await handoffsApi.acknowledge(group.id, result.id);
      setHistory((all) => all.map((h) => (h.id === updated.id ? updated : h)));
      notify("인수인계를 확인했습니다.");
    } catch (e) {
      setError(errorMessage(e, "확인 처리에 실패했습니다."));
    } finally {
      setBusy(false);
    }
  }
  const canAcknowledge = !!result && result.toCaregiverId === me.userId;
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">AI CARE HANDOFF</div>
          <h1>AI 인수인계</h1>
          <p>지난 돌봄을 돌아보고, 다음 보호자에게 전해 주세요.</p>
        </div>
        {result?.mode && (
          <Badge tone="purple">
            {result.mode === "local-rules" ? "규칙 기반 요약" : "AI 요약"}
          </Badge>
        )}
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
                max={day()}
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
                ? "요약 만드는 중…"
                : result
                  ? "인수인계 재생성"
                  : "인수인계 생성"}
            </button>
            <p className="micro">
              선택 기간(최대 90일)의 보호자 기록을 요약하고, 앞으로 예정된 일정을
              함께 표시합니다. 재생성해도 이전 결과는 그대로 남습니다.
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
                  <small className="block">
                    {timeLabel(h.createdAt)} 생성 · {who(h.toCaregiverId)} 님께
                  </small>
                </span>
                <Badge tone={h.confirmed ? "green" : "blue"}>
                  {h.confirmed ? "확인됨" : "미확인"}
                </Badge>
              </button>
            ))}
            {!history.length && (
              <p className="micro">
                {loading
                  ? "불러오는 중…"
                  : "아직 생성한 인수인계가 없습니다."}
              </p>
            )}
          </section>
        </div>
        <section className="card handoff-output" aria-busy={busy}>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {busy && (
            <p className="inline-note" role="status">
              선택한 돌봄 기록을 요약하고 있습니다…
            </p>
          )}
          {!result ? (
            <Empty text="기간을 선택하고 인수인계를 생성해 보세요." />
          ) : (
            <>
              <div className="section-head">
                <div>
                  <h2>
                    {who(result.fromCaregiverId)} → {who(result.toCaregiverId)}{" "}
                    님께 전할 내용
                  </h2>
                  <p>
                    {result.from} ~ {result.to}
                  </p>
                </div>
              </div>
              {(
                [
                  { title: "건강", icon: "heart", items: result.sections.health },
                  { title: "생활", icon: "home", items: result.sections.life },
                  {
                    title: "예정 일정",
                    icon: "calendar",
                    items: result.sections.schedules,
                  },
                  {
                    title: "확인사항",
                    icon: "file",
                    items: result.sections.followUp,
                  },
                ] as const
              ).map((section) => (
                <section key={section.title}>
                  <h3>
                    <Icon name={section.icon} size={18} />
                    {section.title}
                  </h3>
                  {section.items.length ? (
                    <ul>
                      {section.items.map((item, i) => (
                        <li key={i}>
                          {item.text}
                          {item.quote && item.quote !== item.text && (
                            <small className="evidence-quote">
                              근거: “{item.quote}”
                            </small>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>해당하는 내용이 없습니다.</p>
                  )}
                </section>
              ))}
              <p className="micro">
                저장된 기록을 근거로 정리한 내용이며 의료 판단을 제공하지
                않습니다. 원문이 수정·삭제되어도 생성 당시의 근거는 보존됩니다.
              </p>
              <div className="actions">
                <button
                  className={result.confirmed ? "secondary" : "primary"}
                  disabled={result.confirmed || busy || !canAcknowledge}
                  onClick={() => void acknowledge()}
                >
                  <Icon name="check" size={18} />
                  {result.confirmed
                    ? "인수인계 확인 완료"
                    : "다음 보호자로 확인하기"}
                </button>
              </div>
              {!result.confirmed && !canAcknowledge && (
                <p className="micro">
                  지정된 인수 보호자({who(result.toCaregiverId)})만 확인할 수
                  있습니다.
                </p>
              )}
            </>
          )}
        </section>
      </div>
    </>
  );
}
