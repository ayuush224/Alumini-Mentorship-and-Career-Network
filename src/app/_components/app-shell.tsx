import Link from "next/link";
import { Icon, type IconName } from "./icons";

type NavKey = "dashboard" | "mentors" | "mentorship" | "analytics";

type AppShellProps = {
  active: NavKey;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
};

const navItems: Array<{ key: NavKey; label: string; href: string; icon: IconName }> = [
  { key: "dashboard", label: "My dashboard", href: "/dashboard", icon: "home" },
  { key: "mentors", label: "Find a mentor", href: "/mentors", icon: "compass" },
  { key: "mentorship", label: "My mentorship", href: "/mentorship", icon: "heart" },
  { key: "analytics", label: "Programme view", href: "/analytics", icon: "trend" },
];

export function AppShell({ active, eyebrow, title, children }: AppShellProps) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/">
          <span className="brand-mark"><Icon name="spark" size={18} /></span>
          <span>alma<span className="brand-dot">.</span></span>
        </Link>

        <div className="sidebar-label">Workspace</div>
        <nav aria-label="Main navigation" className="sidebar-nav">
          {navItems.map((item) => (
            <Link className={`nav-item ${active === item.key ? "is-active" : ""}`} href={item.href} key={item.key}>
              <Icon name={item.icon} size={18} />
              <span>{item.label}</span>
              {item.key === "mentorship" ? <span className="nav-count">1</span> : null}
            </Link>
          ))}
        </nav>

        <div className="sidebar-label sidebar-label-lower">Account</div>
        <nav aria-label="Account navigation" className="sidebar-nav">
          <Link className="nav-item" href="/dashboard#profile"><Icon name="user" size={18} /><span>Career profile</span></Link>
          <Link className="nav-item" href="/dashboard#settings"><Icon name="settings" size={18} /><span>Settings</span></Link>
        </nav>

        <div className="sidebar-footer">
          <div className="privacy-note">
            <span className="privacy-icon"><Icon name="shield" size={16} /></span>
            <div><strong>Your privacy matters</strong><span>Contact details stay private.</span></div>
          </div>
          <div className="profile-chip">
            <span className="avatar avatar-sm avatar-amber">AS</span>
            <div><strong>Aarav Sharma</strong><span>Student · CSE 2026</span></div>
            <Icon name="more" size={18} />
          </div>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div className="topbar-heading"><span>{eyebrow}</span><strong>{title}</strong></div>
          <div className="topbar-actions">
            <button aria-label="Search" className="icon-button" type="button"><Icon name="search" size={19} /></button>
            <button aria-label="Messages" className="icon-button has-notification" type="button"><Icon name="message" size={19} /></button>
            <span className="topbar-divider" />
            <span className="avatar avatar-sm avatar-amber">AS</span>
          </div>
        </header>
        <main className="page-frame">{children}</main>
      </div>
    </div>
  );
}

export function Avatar({ initials, tone = "blue", size = "md" }: { initials: string; tone?: "blue" | "green" | "rose" | "amber" | "purple"; size?: "sm" | "md" | "lg" }) {
  return <span className={`avatar avatar-${size} avatar-${tone}`}>{initials}</span>;
}

export function SectionHeading({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="section-heading">
      <div>{eyebrow ? <span className="section-eyebrow">{eyebrow}</span> : null}<h2>{title}</h2></div>
      {action}
    </div>
  );
}

export function StatusBadge({ children, tone = "green" }: { children: React.ReactNode; tone?: "green" | "amber" | "blue" | "rose" | "slate" }) {
  return <span className={`status-badge status-${tone}`}><span className="status-dot" />{children}</span>;
}
