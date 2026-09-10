import { useState } from "react";
import { Badge, Empty, Icon } from "./ui";
import { dateLabel, memberName, timeLabel, type Member, type CareEvent, type Schedule } from "./data";

export function Dashboard({
  events,
  schedules,
  members,
  current,
  next,
  elder,
  navigate,
  write,
  name,
  demo = false,
}: {
  events: CareEvent[];
  schedules: Schedule[];
  members: Member[];
  current: string;
  next: string;
  elder: string;
  navigate: (page: string) => void;
  write: () => void;
  name: string;
  demo?: boolean;
}) {
  const [now] = useState(() => Date.now());
  const upcoming = schedules
    .filter((s) => s.status === "예정" && Date.parse(s.scheduledAt) >= now)
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  const todayCount = events.filter(
    (e) =>
      new Date(e.timestamp).toLocaleDateString() ===
      new Date().toLocaleDateString(),
  ).length;
  const special = events.find((e) => e.type === "특이사항");
  return (
    <>
      <div className="greeting">
        <div>
          <div className="eyebrow">함께 돌보는 오늘</div>
          <h1>
            안녕하세요, {name} 님 <span className="wave">☀</span>
          </h1>
          <p>{elder} 님의 하루를 가족과 함께 이어가요.</p>
        </div>
        <button className="primary" onClick={write}>
          <Icon name="plus" size={19} />
          돌봄 기록 남기기
        </button>
      </div>
      <div className="overview-grid">
        <button
          className="card summary mint"
          onClick={() => navigate("돌봄 기록")}
        >
          <span className="card-label">
            <Icon name="heart" />
            <span>오늘의 돌봄</span>
            <Icon name="chevron" size={17} />
          </span>
          <strong>
            함께 남긴 기록 <em>{todayCount}건</em>
          </strong>
          <span className="muted">작은 일상도 소중한 돌봄이 됩니다.</span>
          <span className="summary-foot">
            <span className="dot green-dot" />
            가족의 기록으로 확인하는 하루
          </span>
        </button>
        <button className="card summary" onClick={() => navigate("가족 관리")}>
          <span className="card-label">
            <Icon name="users" />
            <span>현재 담당 보호자</span>
            <Icon name="chevron" size={17} />
          </span>
          <span className="person-row">
            <span className="avatar green">
              {memberName(members, current).slice(-2)}
            </span>
            <strong>{memberName(members, current)}</strong>
            <Badge>담당 중</Badge>
          </span>
          <span className="summary-foot">
            다음 보호자 <b>{memberName(members, next)}</b>
            <Icon name="arrow" size={16} />
          </span>
        </button>
        <button className="card summary" onClick={() => navigate("일정")}>
          <span className="card-label">
            <Icon name="calendar" />
            <span>다가오는 일정</span>
            <Icon name="chevron" size={17} />
          </span>
          <strong>{upcoming[0]?.title ?? "예정된 일정이 없어요"}</strong>
          <span className="muted">
            {upcoming[0]
              ? `${dateLabel(upcoming[0].scheduledAt)} · ${timeLabel(upcoming[0].scheduledAt)}`
              : "새로운 일정을 등록해 보세요."}
          </span>
          <span className="summary-foot">
            {upcoming[0]
              ? `담당 ${memberName(members, upcoming[0].caregiverId)}`
              : "가족과 일정을 공유해요"}
            <Badge tone="green">예정 {upcoming.length}건</Badge>
          </span>
        </button>
      </div>
      <div className="dashboard-grid">
        <section className="card timeline-card">
          <div className="section-head">
            <div>
              <h2>
                <Icon name="clock" />
                Care Timeline
              </h2>
              <p>가족이 함께 남긴 최근 돌봄 기록</p>
            </div>
            <button
              className="text-button"
              onClick={() => navigate("돌봄 기록")}
            >
              전체보기 <Icon name="chevron" size={15} />
            </button>
          </div>
          {!events.length ? (
            <Empty />
          ) : (
            <div className="timeline">
              {events.slice(0, 5).map((e) => (
                <button
                  key={e.eventId}
                  className="timeline-item"
                  onClick={() => navigate("돌봄 기록")}
                >
                  <span
                    className={`timeline-dot ${e.type === "생활" || e.type === "식사" ? "teal" : ""}`}
                  />
                  <span className="timeline-time">
                    {timeLabel(e.timestamp)}
                    <small>
                      {new Date(e.timestamp).toLocaleDateString("ko-KR", {
                        month: "numeric",
                        day: "numeric",
                      })}
                    </small>
                  </span>
                  <span className="timeline-content">
                    <span>
                      <Badge tone={e.type === "특이사항" ? "orange" : "blue"}>
                        {e.type}
                      </Badge>
                      <small>{memberName(members, e.createdBy)}</small>
                    </span>
                    <p>{e.content}</p>
                  </span>
                </button>
              ))}
            </div>
          )}
          <button className="wide-button" onClick={write}>
            <Icon name="plus" size={18} />
            새로운 돌봄 기록 남기기
          </button>
        </section>
        <div className="dashboard-right">
          <section className="card handoff-card">
            <div className="section-head">
              <div>
                <h2>
                  <Icon name="spark" />
                  AI Care Handoff
                </h2>
                <p>다음 보호자에게 전하는 돌봄 이야기</p>
              </div>
              {demo && <Badge tone="purple">예시</Badge>}
            </div>
            <div className="handoff-preview">
              <div>
                <span className="mini-icon pink">
                  <Icon name="heart" />
                </span>
                <h3>건강·생활 기록</h3>
              </div>
              <p>
                {events[0]?.content ??
                  "기록을 남기면 인수인계할 내용을 확인할 수 있어요."}
              </p>
            </div>
            <div className="handoff-preview warm">
              <div>
                <span className="mini-icon orange">
                  <Icon name="file" />
                </span>
                <h3>함께 확인해 주세요</h3>
              </div>
              <p>{special?.content ?? "등록된 특이사항이 없습니다."}</p>
            </div>
            <button
              className="soft-button"
              onClick={() => navigate("AI 인수인계")}
            >
              인수인계 준비하기 <Icon name="arrow" size={17} />
            </button>
            {demo && (
              <p className="micro">
                가상 기록 미리보기이며 실제 AI 분석 결과가 아닙니다.
              </p>
            )}
          </section>
          <section className="card schedule-card">
            <div className="section-head">
              <h2>
                <Icon name="calendar" />
                함께 챙길 일정
              </h2>
              <button className="text-button" onClick={() => navigate("일정")}>
                전체보기 <Icon name="chevron" size={15} />
              </button>
            </div>
            {upcoming.slice(0, 2).map((s) => (
              <button
                className="schedule-preview"
                key={s.scheduleId}
                onClick={() => navigate("일정")}
              >
                <span className="date-tile">
                  <small>{new Date(s.scheduledAt).getMonth() + 1}월</small>
                  <b>{new Date(s.scheduledAt).getDate()}</b>
                </span>
                <span>
                  <strong>{s.title}</strong>
                  <small>
                    {timeLabel(s.scheduledAt)} ·{" "}
                    {memberName(members, s.caregiverId)}
                  </small>
                </span>
                <Icon name="chevron" size={16} />
              </button>
            ))}
            {!upcoming.length && <Empty text="예정된 일정이 없습니다." />}
          </section>
        </div>
      </div>
      <div className="bottom-note">
        <Icon name="heart" size={16} />
        함께 남기는 작은 기록이, 더 든든한 돌봄이 됩니다.
      </div>
    </>
  );
}
