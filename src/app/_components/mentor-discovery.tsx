"use client";

import { useMemo, useState } from "react";
import { Avatar, SectionHeading, StatusBadge } from "./app-shell";
import { Icon } from "./icons";

const mentors = [
  { initials: "RK", tone: "blue" as const, name: "Rohan Kapoor", role: "Senior Product Manager", company: "Microsoft", expertise: ["Product strategy", "Career pivots", "Interview prep"], match: 94, reason: "Matches your target role and product strategy interest", capacity: "2 spots left", response: "Replies in 2 days" },
  { initials: "NP", tone: "purple" as const, name: "Nisha Patel", role: "UX Researcher", company: "Atlassian", expertise: ["Design research", "Portfolio reviews", "Storytelling"], match: 91, reason: "Strong fit for your portfolio goal and design interest", capacity: "1 spot left", response: "Replies in 3 days" },
  { initials: "VI", tone: "green" as const, name: "Vikram Iyer", role: "Data Scientist", company: "Adobe", expertise: ["Career pivots", "Data careers", "Interview prep"], match: 88, reason: "Has helped 4 students make a similar career pivot", capacity: "3 spots left", response: "Replies in 1 day" },
  { initials: "AM", tone: "rose" as const, name: "Ananya Menon", role: "Design Lead", company: "Razorpay", expertise: ["Design systems", "Leadership", "Portfolio reviews"], match: 84, reason: "Matches your interest in building a product portfolio", capacity: "At capacity", response: "Not accepting requests" },
];

export default function MentorDiscovery() {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("Best match");
  const [requested, setRequested] = useState<string | null>(null);
  const filtered = useMemo(() => mentors.filter((mentor) => `${mentor.name} ${mentor.role} ${mentor.company} ${mentor.expertise.join(" ")}`.toLowerCase().includes(query.toLowerCase())), [query]);

  return <>
    <div className="page-intro discovery-intro"><div><span className="section-eyebrow">A more human search</span><h1>Meet the right<br /><em>kind of experience.</em></h1><p>Tell us what you are working towards. We will surface verified alumni who have context to share.</p></div><div className="profile-completion"><span className="completion-ring">82<span>%</span></span><div><strong>Your profile is 82% ready</strong><span>Add your target industry for sharper matches</span><button className="text-link" type="button">Update profile <Icon name="arrow" size={14} /></button></div></div></div>

    <div className="search-bar"><Icon name="search" size={19} /><input aria-label="Search mentors" onChange={(event) => setQuery(event.target.value)} placeholder="Search by role, company, or expertise" type="search" value={query} /><kbd>⌘ K</kbd></div>
    <div className="discovery-toolbar"><div className="filter-chips">{["Best match", "Product", "Design", "Data"].map((filter) => <button className={`filter-chip ${activeFilter === filter ? "is-selected" : ""}`} key={filter} onClick={() => setActiveFilter(filter)} type="button">{filter}</button>)}</div><button className="filter-button" type="button"><Icon name="filter" size={16} /> More filters <span>3</span></button></div>

    <section className="discovery-results"><SectionHeading eyebrow={`${filtered.length} verified mentors for you`} title="Recommended connections" action={<button className="sort-button" type="button">Sort: <strong>Best match</strong><Icon name="chevron" size={15} /></button>} />
      <div className="mentor-list">{filtered.map((mentor) => <article className="mentor-card" key={mentor.name}><Avatar initials={mentor.initials} tone={mentor.tone} size="lg" /><div className="mentor-card-main"><div className="mentor-card-heading"><div><div className="mentor-name-line"><h3>{mentor.name}</h3><span className="verified-chip"><Icon name="shield" size={12} /> Verified alumnus</span></div><p>{mentor.role} <span>·</span> {mentor.company}</p></div><span className="match-score match-score-large">{mentor.match}%<small>match</small></span></div><div className="reason-callout"><Icon name="spark" size={15} /><span><strong>Why this match:</strong> {mentor.reason}</span></div><div className="mentor-card-bottom"><div className="expertise-list">{mentor.expertise.map((tag) => <span key={tag}>{tag}</span>)}</div><div className="capacity-line"><StatusBadge tone={mentor.capacity === "At capacity" ? "slate" : "green"}>{mentor.capacity}</StatusBadge><span><Icon name="clock" size={14} /> {mentor.response}</span></div></div></div><div className="mentor-card-action">{mentor.capacity === "At capacity" ? <button className="button button-muted" disabled type="button">At capacity</button> : <button className={`button ${requested === mentor.name ? "button-success" : "button-outline"}`} onClick={() => setRequested(mentor.name)} type="button">{requested === mentor.name ? <><Icon name="check" size={16} /> Request sent</> : <>Request intro <Icon name="arrow" size={15} /></>}</button>}<button aria-label={`More options for ${mentor.name}`} className="plain-icon-button" type="button"><Icon name="more" size={18} /></button></div></article>)}</div>
      {filtered.length === 0 ? <div className="empty-state"><Icon name="search" size={22} /><strong>No mentors found</strong><span>Try a different role, company, or expertise area.</span></div> : null}
    </section>
    <div className="privacy-strip"><Icon name="shield" size={17} /><span>Alma keeps alumni contact details private. Requests stay inside the platform until a mentor chooses to connect.</span><Icon name="arrow" size={15} /></div>
  </>;
}
