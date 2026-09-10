import { useCallback, useEffect, useState } from "react";
import { Icon } from "./ui";
import {
  demoEnabled,
  getCareApi,
  members as demoMembers,
  seedSchedules,
  type CareEvent,
  type Member,
  type Schedule,
} from "./data";
import { backendConfigured } from "./api";
import { RealApp } from "./RealApp";
import { Shell, type NavItem } from "./Shell";
import { Dashboard } from "./Dashboard";
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
const navigation: NavItem[] = [
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
  members: Member[];
  current: string;
  setCurrent: (id: string) => void;
  next: string;
  setNext: (id: string) => void;
  notify: (text: string) => void;
  elder: string;
  setElder: (name: string) => void;
};

function App() {
  const [page, setPage] = useState<Page>("대시보드");
  const [events, setEvents] = useState<CareEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [schedules, setSchedules] = useState(seedSchedules);
  const [current, setCurrent] = useState(demoMembers[0].id);
  const [next, setNext] = useState(demoMembers[1].id);
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
    members: demoMembers,
    current,
    setCurrent,
    next,
    setNext,
    notify: setToast,
    elder,
    setElder,
  };
  if (backendConfigured) return <RealApp />;
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
      <Shell
        page={page}
        navItems={navigation}
        navigate={(p) => navigate(p as Page)}
        name={name}
        badge="PROTOTYPE"
        notice={
          <div className="demo-notice">
            <span>
              <span className="dot" />
              가상 가족으로 둘러보는 시연 화면
            </span>
            <span>기록은 이 브라우저에만 저장됩니다.</span>
          </div>
        }
        onProfileClick={() => setProfileOpen(true)}
        toast={toast}
        onToastClose={() => setToast("")}
      >
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
            demo
            navigate={(p) => navigate(p as Page)}
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
      </Shell>
      {profileOpen && (
        <Profile
          name={name}
          setName={setName}
          notify={setToast}
          onClose={() => setProfileOpen(false)}
        />
      )}
    </>
  );
}
export default App;
