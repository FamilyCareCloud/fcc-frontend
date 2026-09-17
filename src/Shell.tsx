import type { ReactNode } from "react";
import { dateLabel, day } from "./data";
import { Icon, type IconName } from "./ui";

export type NavItem = { name: string; icon: IconName; english: string };

export function Shell({
  page,
  navItems,
  navigate,
  name,
  onProfileClick,
  toast,
  onToastClose,
  children,
}: {
  page: string;
  navItems: NavItem[];
  navigate: (name: string) => void;
  name: string;
  onProfileClick: () => void;
  toast: string;
  onToastClose: () => void;
  children: ReactNode;
}) {
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
            navigate(navItems[0]?.name ?? page);
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
          <button
            className="profile-button"
            aria-label="내 프로필 열기"
            onClick={onProfileClick}
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
          {navItems.map((item) => (
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
        {children}
      </main>
      {toast && (
        <div className="toast" role="status">
          <Icon name="check" size={18} />
          {toast}
          <button aria-label="알림 닫기" onClick={onToastClose}>
            <Icon name="close" size={16} />
          </button>
        </div>
      )}
    </>
  );
}
