import { useCallback, useEffect, useState } from "react";
import { Badge, Empty, Icon, type IconName } from "./ui";
import {
  dateLabel,
  day,
  demoEnabled,
  getCareApi,
  memberName,
  members,
  seedSchedules,
  timeLabel,
  type CareEvent,
  type Schedule,
} from "./data";
import "./App.css";
import { Records } from "./Records";
import { Schedules } from "./Schedules";
import { Family } from "./Family";
import { Handoff } from "./Handoff";
import { Profile } from "./Profile";

export type Page =
  | "대시보드"
  | "돌봄 기록"
  | "일정"
  | "AI 인수인계"
  | "가족 관리";
const navigation: { name: Page; icon: IconName; english: string }[] = [
  { name: "대시보드", icon: "home", english: "Overview" },
  { name: "돌봄 기록", icon: "clock", english: "Care Timeline" },
  { name: "일정", icon: "calendar", english: "Schedule" },
  { name: "AI 인수인계", icon: "spark", english: "Care Handoff" },
  { name: "가족 관리", icon: "users", english: "Our Family" },
];
export type Shared = {
  events: CareEvent[];
  reload: () => Promise<void>;
  schedules: Schedule[];
  setSchedules: React.Dispatch<React.SetStateAction<Schedule[]>>;
  current: string;
  setCurrent: (id: string) => void;
  next: string;
  setNext: (id: string) => void;
  notify: (text: string) => void;
  elder: string;
  setElder: (name: string) => void;
};

function Dashboard({
  events,
  schedules,
  current,
  next,
  elder,
  navigate,
  write,
  name,
}: Pick<Shared, "events" | "schedules" | "current" | "next" | "elder"> & {
  navigate: (page: Page) => void;
  write: () => void;
  name: string;
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
              {memberName(current).slice(-2)}
            </span>
            <strong>{memberName(current)}</strong>
            <Badge>담당 중</Badge>
          </span>
          <span className="summary-foot">
            다음 보호자 <b>{memberName(next)}</b>
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
              ? `담당 ${memberName(upcoming[0].caregiverId)}`
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
                      <small>{memberName(e.createdBy)}</small>
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
              <Badge tone="purple">예시</Badge>
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
            <p className="micro">
              가상 기록 미리보기이며 실제 AI 분석 결과가 아닙니다.
            </p>
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
                    {timeLabel(s.scheduledAt)} · {memberName(s.caregiverId)}
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

function App() {
  const [page, setPage] = useState<Page>("대시보드");
  const [events, setEvents] = useState<CareEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [schedules, setSchedules] = useState(seedSchedules);
  const [current, setCurrent] = useState(members[0].id);
  const [next, setNext] = useState(members[1].id);
  const [elder, setElder] = useState("김영숙");
  const [toast, setToast] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [name, setName] = useState("김지은");
  const [openNew, setOpenNew] = useState(false);
  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setEvents(await getCareApi().list());
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "돌봄 기록을 불러올 수 없습니다.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    let active = true;
    if (demoEnabled) {
      Promise.resolve()
        .then(() => getCareApi().list())
        .then((items) => {
          if (active) setEvents(items);
        })
        .catch((e) => {
          if (active)
            setError(
              e instanceof Error
                ? e.message
                : "돌봄 기록을 불러올 수 없습니다.",
            );
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(id);
  }, [toast]);
  const navigate = (p: Page) => {
    setPage(p);
    window.scrollTo({ top: 0 });
  };
  const shared: Shared = {
    events,
    reload,
    schedules,
    setSchedules,
    current,
    setCurrent,
    next,
    setNext,
    notify: setToast,
    elder,
    setElder,
  };
  if (!demoEnabled)
    return (
      <main className="production-gate">
        <Icon name="cloud" size={56} />
        <h1>Family Care Cloud</h1>
        <p>서비스 연결 준비 중입니다.</p>
        <p>현재 빌드에는 실제 API가 연결되어 있지 않습니다.</p>
      </main>
    );
  return (
    <>
      <a className="skip" href="#main">
        본문으로 이동
      </a>
      <header className="topbar">
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate("대시보드");
          }}
          className="brand"
        >
          <span className="brand-mark">
            <Icon name="cloud" size={36} />
          </span>
          <span>
            <b>Family Care Cloud</b>
            <small>가족의 돌봄을, 하나의 이야기로</small>
          </span>
        </a>
        <div className="topbar-right">
          <span className="demo-badge">PROTOTYPE</span>
          <button
            className="profile-button"
            aria-label="내 프로필 열기"
            onClick={() => setProfileOpen(true)}
          >
            <span className="avatar blue">{name.slice(-2)}</span>
            <span>
              <b>{name} 님</b>
              <small>함께 돌보는 가족</small>
            </span>
            <Icon name="chevron" size={16} />
          </button>
          <div className="header-date">
            <b>{dateLabel(day())}</b>
            <small>오늘도 함께해 주셔서 고맙습니다.</small>
          </div>
        </div>
      </header>
      <aside className="sidebar">
        <div className="nav-label">우리 가족의 돌봄</div>
        <nav aria-label="주 메뉴">
          {navigation.map((item) => (
            <button
              className={page === item.name ? "nav-item active" : "nav-item"}
              key={item.name}
              onClick={() => navigate(item.name)}
              aria-current={page === item.name ? "page" : undefined}
            >
              <Icon name={item.icon} />
              <span>
                {item.name}
                <small>{item.english}</small>
              </span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="family-illustration">
            <span>☁</span>
            <Icon name="heart" size={36} />
            <span>☁</span>
          </div>
          <p>
            함께하는 오늘이,
            <br />더 나은 내일을 만듭니다.
          </p>
          <small>FAMILY CARE CLOUD</small>
        </div>
      </aside>
      <main id="main" className="main">
        <div className="demo-notice">
          <span>
            <span className="dot" />
            가상 가족으로 둘러보는 시연 화면
          </span>
          <span>기록은 이 브라우저에만 저장됩니다.</span>
        </div>
        {error ? (
          <div role="alert" className="error">
            {error}
            <button className="text-button" onClick={() => void reload()}>
              다시 불러오기
            </button>
          </div>
        ) : null}
        {loading && (
          <div className="inline-note" role="status">
            돌봄 기록을 불러오는 중입니다…
          </div>
        )}
        <div hidden={page !== "대시보드"}>
          <Dashboard
            {...shared}
            navigate={navigate}
            name={name}
            write={() => {
              navigate("돌봄 기록");
              setOpenNew(true);
            }}
          />
        </div>
        <div hidden={page !== "돌봄 기록"}>
          <Records {...shared} openNew={openNew} setOpenNew={setOpenNew} />
        </div>
        <div hidden={page !== "일정"}>
          <Schedules {...shared} />
        </div>
        <div hidden={page !== "AI 인수인계"}>
          <Handoff {...shared} />
        </div>
        <div hidden={page !== "가족 관리"}>
          <Family {...shared} />
        </div>
      </main>
      {profileOpen && (
        <Profile
          name={name}
          setName={setName}
          notify={setToast}
          onClose={() => setProfileOpen(false)}
        />
      )}{" "}
      {toast && (
        <div className="toast" role="status">
          <Icon name="check" size={18} />
          {toast}
          <button aria-label="알림 닫기" onClick={() => setToast("")}>
            <Icon name="close" size={16} />
          </button>
        </div>
      )}
    </>
  );
}
export default App;
