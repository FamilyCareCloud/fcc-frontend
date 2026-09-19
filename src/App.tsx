import { useCallback, useEffect, useState } from "react";
import { Badge, Empty, Icon, type IconName } from "./ui";
import {
  dateLabel,
  day,
  nameOf,
  timeLabel,
  type CareEvent,
  type Group,
  type Member,
  type Schedule,
} from "./data";
import {
  API_BASE,
  auth,
  errorMessage,
  events as eventsApi,
  groups as groupsApi,
  loadSession,
  schedules as schedulesApi,
  setSession,
  setUnauthorizedHandler,
  type GroupSummary,
  type Session,
  type User,
} from "./api";
import "./App.css";
import { Records } from "./Records";
import { Schedules } from "./Schedules";
import { Family } from "./Family";
import { Handoff } from "./Handoff";
import { Profile } from "./Profile";
import { Auth } from "./Auth";
import { Onboarding } from "./Onboarding";
import { Assistant } from "./Assistant";

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
const needsElder: Page[] = ["돌봄 기록", "일정", "AI 인수인계"];

export type Shared = {
  me: User;
  group: Group;
  members: Member[];
  events: CareEvent[];
  schedules: Schedule[];
  /** 그룹의 구성원·담당자·기록·일정을 서버에서 다시 불러옵니다. */
  reload: () => Promise<void>;
  /** 소속 그룹 목록을 다시 불러오고 선택 그룹을 바꿉니다. */
  switchGroup: (id: string) => Promise<void>;
  notify: (text: string) => void;
};

function Dashboard({
  events,
  schedules,
  group,
  members,
  me,
  navigate,
  write,
  notify,
}: Pick<
  Shared,
  "events" | "schedules" | "group" | "members" | "me" | "notify"
> & {
  navigate: (page: Page) => void;
  write: () => void;
}) {
  const [now] = useState(() => Date.now());
  const who = (id: string | null | undefined) => nameOf(members, id);
  const elder = group.elder?.name ?? "돌봄 대상자";
  const upcoming = schedules
    .filter((s) => s.status === "예정" && Date.parse(s.scheduledAt) >= now)
    .sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt));
  const caregiverEvents = events.filter((e) => !e.system);
  const todayCount = caregiverEvents.filter(
    (e) =>
      new Date(e.timestamp).toLocaleDateString() ===
      new Date().toLocaleDateString(),
  ).length;
  const special = caregiverEvents.find((e) => e.type === "특이사항");
  const current = group.primaryCaregiverId;
  return (
    <>
      <div className="greeting">
        <div>
          <div className="eyebrow">함께 돌보는 오늘</div>
          <h1>
            안녕하세요, {me.name} 님 <span className="wave">☀</span>
          </h1>
          <p>{elder} 님의 하루를 가족과 함께 이어가요.</p>
        </div>
        <button className="primary" onClick={write}>
          <Icon name="plus" size={19} />
          돌봄 기록 남기기
        </button>
      </div>
      {group.elder && (
        <Assistant groupId={group.id} notify={notify} />
      )}
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
            <span className="avatar green">{who(current).slice(-2)}</span>
            <strong>{who(current)}</strong>
            <Badge>담당 중</Badge>
          </span>
          <span className="summary-foot">
            다음 보호자{" "}
            <b>{group.nextCaregiverId ? who(group.nextCaregiverId) : "미지정"}</b>
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
              ? `담당 ${who(upcoming[0].caregiverId)}`
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
          {!caregiverEvents.length ? (
            <Empty />
          ) : (
            <div className="timeline">
              {caregiverEvents.slice(0, 5).map((e) => (
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
                      <small>{who(e.createdBy)}</small>
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
              <Badge tone="purple">최근 기록</Badge>
            </div>
            <div className="handoff-preview">
              <div>
                <span className="mini-icon pink">
                  <Icon name="heart" />
                </span>
                <h3>건강·생활 기록</h3>
              </div>
              <p>
                {caregiverEvents[0]?.content ??
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
              저장된 최근 기록입니다. AI 요약은 인수인계 메뉴에서 생성합니다.
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
                    {timeLabel(s.scheduledAt)} · {who(s.caregiverId)}
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

type GroupData = {
  group: Group;
  members: Member[];
  events: CareEvent[];
  schedules: Schedule[];
};

function GroupWorkspace({
  me,
  setMe,
  groupList,
  groupId,
  switchGroup,
  onLogout,
}: {
  me: User;
  setMe: (u: User) => void;
  groupList: GroupSummary[];
  groupId: string;
  switchGroup: (id: string) => Promise<void>;
  onLogout: () => void;
}) {
  const [page, setPage] = useState<Page>("대시보드");
  const [data, setData] = useState<GroupData | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [openNew, setOpenNew] = useState(false);
  const load = useCallback(async () => {
    const [group, members] = await Promise.all([
      groupsApi.detail(groupId),
      groupsApi.members(groupId),
    ]);
    // 기록·일정 API는 고령자 등록 후에만 열립니다(409).
    const [events, schedules] = group.elder
      ? await Promise.all([
          eventsApi.list(groupId),
          schedulesApi.list(groupId),
        ])
      : [[], []];
    setData({ group, members, events, schedules });
  }, [groupId]);
  const reload = useCallback(async () => {
    setError("");
    try {
      await load();
    } catch (e) {
      setError(errorMessage(e, "데이터를 불러올 수 없습니다."));
    }
  }, [load]);
  useEffect(() => {
    let active = true;
    load().catch((e) => {
      if (active) setError(errorMessage(e, "데이터를 불러올 수 없습니다."));
    });
    return () => {
      active = false;
    };
  }, [load]);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(id);
  }, [toast]);
  const navigate = (p: Page) => {
    setPage(p);
    window.scrollTo({ top: 0 });
  };

  if (!data)
    return (
      <main className="production-gate">
        <Icon name="cloud" size={56} />
        {error ? (
          <>
            <p role="alert" className="error">
              {error}
            </p>
            <div className="actions">
              <button className="secondary" onClick={onLogout}>
                로그아웃
              </button>
              <button className="primary" onClick={() => void reload()}>
                다시 불러오기
              </button>
            </div>
          </>
        ) : (
          <p role="status">돌봄 기록을 불러오는 중입니다…</p>
        )}
      </main>
    );

  const { group } = data;
  const shared: Shared = {
    me,
    group,
    members: data.members,
    events: data.events,
    schedules: data.schedules,
    reload,
    switchGroup,
    notify: setToast,
  };
  const gate = (p: Page, node: React.ReactNode) =>
    needsElder.includes(p) && !group.elder ? (
      <div className="card">
        <Empty text="먼저 가족 관리에서 돌봄 대상자(고령자)를 등록해 주세요.">
          <button className="primary" onClick={() => navigate("가족 관리")}>
            가족 관리로 이동
          </button>
        </Empty>
      </div>
    ) : (
      node
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
          {groupList.length > 1 && (
            <label>
              <span className="sr-only">가족 그룹 선택</span>
              <select
                className="workspace-select"
                value={groupId}
                onChange={(e) => void switchGroup(e.target.value)}
              >
                {groupList.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button
            className="profile-button"
            aria-label="내 프로필 열기"
            onClick={() => setProfileOpen(true)}
          >
            <span className="avatar blue">{me.name.slice(-2)}</span>
            <span>
              <b>{me.name} 님</b>
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
        {error ? (
          <div role="alert" className="error">
            {error}
            <button className="text-button" onClick={() => void reload()}>
              다시 불러오기
            </button>
          </div>
        ) : null}
        <div hidden={page !== "대시보드"}>
          <Dashboard
            {...shared}
            navigate={navigate}
            write={() => {
              if (!group.elder) return navigate("가족 관리");
              navigate("돌봄 기록");
              setOpenNew(true);
            }}
          />
        </div>
        <div hidden={page !== "돌봄 기록"}>
          {gate(
            "돌봄 기록",
            <Records {...shared} openNew={openNew} setOpenNew={setOpenNew} />,
          )}
        </div>
        <div hidden={page !== "일정"}>{gate("일정", <Schedules {...shared} />)}</div>
        <div hidden={page !== "AI 인수인계"}>
          {gate("AI 인수인계", <Handoff {...shared} />)}
        </div>
        <div hidden={page !== "가족 관리"}>
          <Family {...shared} />
        </div>
      </main>
      {profileOpen && (
        <Profile
          user={me}
          setUser={setMe}
          notify={setToast}
          onLogout={onLogout}
          onClose={() => setProfileOpen(false)}
        />
      )}
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

const groupKey = (userId: string) => `fcc.group.${userId}`;
function Workspace({
  session,
  onLogout,
}: {
  session: Session;
  onLogout: () => void;
}) {
  const [me, setMe] = useState(session.user);
  const [list, setList] = useState<GroupSummary[] | null>(null);
  const [groupId, setGroupId] = useState("");
  const [error, setError] = useState("");
  /** 목록을 다시 받고, 원하는 그룹(없으면 저장된 그룹, 그것도 없으면 첫 그룹)을 선택합니다. */
  const refresh = useCallback(
    async (prefer?: string) => {
      const next = await groupsApi.list();
      let saved = "";
      try {
        saved = window.localStorage.getItem(groupKey(session.user.userId)) ?? "";
      } catch {
        /* 저장소를 못 써도 첫 그룹으로 진행합니다. */
      }
      const pick =
        [prefer, saved].find((id) => id && next.some((g) => g.id === id)) ??
        next[0]?.id ??
        "";
      try {
        if (pick) window.localStorage.setItem(groupKey(session.user.userId), pick);
      } catch {
        /* noop */
      }
      setList(next);
      setGroupId(pick);
    },
    [session.user.userId],
  );
  useEffect(() => {
    let active = true;
    refresh().catch((e) => {
      if (active) setError(errorMessage(e, "그룹 정보를 불러올 수 없습니다."));
    });
    return () => {
      active = false;
    };
  }, [refresh]);

  if (error)
    return (
      <main className="production-gate">
        <Icon name="cloud" size={56} />
        <p role="alert" className="error">
          {error}
        </p>
        <div className="actions">
          <button className="secondary" onClick={onLogout}>
            로그아웃
          </button>
          <button
            className="primary"
            onClick={() => {
              setError("");
              refresh().catch((e) =>
                setError(errorMessage(e, "그룹 정보를 불러올 수 없습니다.")),
              );
            }}
          >
            다시 시도
          </button>
        </div>
      </main>
    );
  if (!list)
    return (
      <main className="production-gate">
        <Icon name="cloud" size={56} />
        <p role="status">불러오는 중입니다…</p>
      </main>
    );
  if (!groupId)
    return (
      <Onboarding
        name={me.name}
        onDone={(id) => void refresh(id)}
        onLogout={onLogout}
      />
    );
  return (
    <GroupWorkspace
      key={groupId}
      me={me}
      setMe={setMe}
      groupList={list}
      groupId={groupId}
      switchGroup={refresh}
      onLogout={onLogout}
    />
  );
}

function App() {
  const [session, setSessionState] = useState<Session | null>(() => {
    const s = loadSession();
    setSession(s);
    return s;
  });
  const [expired, setExpired] = useState(false);
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setSessionState(null);
      setExpired(true);
    });
  }, []);
  async function logout() {
    try {
      await auth.logout();
    } catch {
      /* 서버 호출이 실패해도 이 기기의 세션은 지웁니다. */
    }
    setExpired(false);
    setSessionState(null);
  }
  if (!API_BASE)
    return (
      <main className="production-gate">
        <Icon name="cloud" size={56} />
        <h1>Family Care Cloud</h1>
        <p>서비스 연결 준비 중입니다.</p>
        <p>VITE_API_BASE_URL이 설정되지 않아 API에 연결할 수 없습니다.</p>
      </main>
    );
  if (!session)
    return (
      <Auth
        expired={expired}
        onLogin={(s) => {
          setExpired(false);
          setSessionState(s);
        }}
      />
    );
  return (
    <Workspace
      key={session.user.userId}
      session={session}
      onLogout={() => void logout()}
    />
  );
}
export default App;
