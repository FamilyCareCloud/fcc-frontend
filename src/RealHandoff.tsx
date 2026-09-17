import { useState } from "react";
import { handoffsApi, ApiError, type BackendHandoff } from "./api";
import { dateLabel, day, memberName, timeLabel } from "./data";
import { Badge, Empty, Icon } from "./ui";
import type { RealCtx } from "./RealApp";

function startOfDayIso(dateStr: string) {
  return new Date(`${dateStr}T00:00:00.000`).toISOString();
}
function endOfDayIso(dateStr: string) {
  const endOfDay = new Date(`${dateStr}T23:59:59.999`);
  const now = new Date();
  return (endOfDay > now ? now : endOfDay).toISOString();
}

function errMsg(e: unknown) {
  if (e instanceof ApiError) {
    if (e.status === 422) return "요약할 돌봄 기록이 없습니다. 선택한 기간을 확인해 주세요.";
    if (e.status === 502) return "인수인계 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.";
    return e.message || "인수인계 생성에 실패했습니다.";
  }
  return e instanceof Error ? e.message : "인수인계 생성에 실패했습니다.";
}

export function RealHandoff({ ctx }: { ctx: RealCtx }) {
  const [history, setHistory] = useState<BackendHandoff[]>(ctx.group.handoffs);
  const [from, setFrom] = useState(day(-7));
  const [to, setTo] = useState(day());
  const [toCaregiverId, setToCaregiverId] = useState(ctx.group.nextCaregiverId ?? "");
  const [selected, setSelected] = useState(ctx.group.handoffs[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const result = history.find((h) => h.id === selected);

  async function generate() {
    if (busy) return;
    setError("");
    if (!from || !to || from > to) {
      setError("시작 날짜와 종료 날짜를 확인해 주세요.");
      return;
    }
    setBusy(true);
    try {
      const period = { fromDate: startOfDayIso(from), toDate: endOfDayIso(to) };
      const created = result
        ? await handoffsApi.regenerate(ctx.token, ctx.groupId, result.id, {
            ...period,
            toCaregiverId: toCaregiverId || undefined,
          })
        : await handoffsApi.create(ctx.token, ctx.groupId, {
            ...period,
            toCaregiverId: toCaregiverId || undefined,
          });
      const list = await handoffsApi.list(ctx.token, ctx.groupId);
      setHistory(list);
      setSelected(created.id);
      await ctx.reload();
      ctx.notify("인수인계를 생성했습니다.");
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  async function acknowledge() {
    if (!result || busy) return;
    setBusy(true);
    try {
      const updated = await handoffsApi.acknowledge(ctx.token, ctx.groupId, result.id);
      setHistory((all) => all.map((h) => (h.id === updated.id ? updated : h)));
      ctx.notify("인수인계를 확인했습니다.");
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  const acknowledged = !!result?.acknowledgements.length;
  const evidenceEntries = result ? Object.entries(result.evidence) : [];

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">AI CARE HANDOFF</div>
          <h1>AI 인수인계</h1>
          <p>지난 돌봄을 돌아보고, 다음 보호자에게 전해 주세요.</p>
        </div>
      </div>
      <div className="handoff-layout">
        <div>
          <section className="card">
            <h2 className="small-title">인수인계 기간</h2>
            <label className="field">
              시작 날짜
              <input disabled={busy} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label className="field">
              종료 날짜
              <input disabled={busy} type="date" min={from} value={to} onChange={(e) => setTo(e.target.value)} />
            </label>
            <label className="field">
              인수 보호자
              <select disabled={busy} value={toCaregiverId} onChange={(e) => setToCaregiverId(e.target.value)}>
                <option value="">다음 담당자(기본값) 사용</option>
                {ctx.members
                  .filter((m) => m.id !== ctx.group.primaryCaregiverId)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
              </select>
            </label>
            <button className="primary full" disabled={busy} onClick={() => void generate()}>
              <Icon name="spark" size={18} />
              {busy ? "생성 중…" : result ? "인수인계 재생성" : "인수인계 생성"}
            </button>
            <p className="micro">기본 기간은 최근 7일, 최대 90일까지 지정할 수 있습니다.</p>
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
                  {h.fromDate.slice(5)} ~ {h.toDate.slice(5)}
                  <small className="block">{timeLabel(h.createdAt)} 생성</small>
                </span>
                <Badge tone={h.acknowledgements.length ? "green" : "blue"}>
                  {h.acknowledgements.length ? "확인됨" : "미확인"}
                </Badge>
              </button>
            ))}
            {!history.length && <p className="micro">아직 생성한 인수인계가 없습니다.</p>}
          </section>
        </div>
        <section className="card handoff-output" aria-busy={busy}>
          {error && (
            <p className="error" role="alert">
              {error}
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
                    {dateLabel(result.fromDate)} ~ {dateLabel(result.toDate)} ·{" "}
                    {memberName(ctx.members, result.fromCaregiverId)} →{" "}
                    {memberName(ctx.members, result.toCaregiverId)}
                  </p>
                </div>
                <Badge tone="purple">{result.mode}</Badge>
              </div>
              {(
                [
                  { title: "건강", icon: "heart", text: result.healthSummary },
                  { title: "생활", icon: "home", text: result.lifeSummary },
                  { title: "일정", icon: "calendar", text: result.scheduleSummary },
                  { title: "확인사항", icon: "file", text: result.followUp },
                ] as const
              ).map((section) => (
                <section key={section.title}>
                  <h3>
                    <Icon name={section.icon} size={18} />
                    {section.title}
                  </h3>
                  <p>{section.text || "해당하는 내용이 없습니다."}</p>
                </section>
              ))}
              {evidenceEntries.length > 0 && (
                <details>
                  <summary>근거 원문 보기</summary>
                  {evidenceEntries.map(([key, items]) => (
                    <div key={key} className="section-gap">
                      <strong>{key}</strong>
                      <ul>
                        {items.map((item, i) => (
                          <li key={i}>{item.text}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </details>
              )}
              <p className="micro">인수 보호자가 확인하면 이력에 기록됩니다.</p>
              <div className="actions">
                <button
                  className={acknowledged ? "secondary" : "primary"}
                  disabled={acknowledged || busy}
                  onClick={() => void acknowledge()}
                >
                  <Icon name="check" size={18} />
                  {acknowledged ? "인수인계 확인 완료" : "다음 보호자로 확인하기"}
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </>
  );
}
