"use client";

import { useState } from "react";
import { Avatar, SectionHeading, StatusBadge } from "./app-shell";
import { Icon } from "./icons";

export interface MentorshipBoardProps {
  mentorName?: string;
  mentorCompany?: string;
  mentorRole?: string;
  startDate?: string;
}

export default function MentorshipBoard({
  mentorName = "Alumni Mentor",
  mentorCompany = "Industry Partner",
  mentorRole = "Mentor",
  startDate = "Recently Paired",
}: MentorshipBoardProps) {
  const [tab, setTab] = useState("overview");
  const [complete, setComplete] = useState(false);

  const initials = mentorName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

  return (
    <>
      <div className="relationship-hero">
        <div className="relationship-identity">
          <div className="avatar-stack">
            <Avatar initials="ME" tone="amber" size="lg" />
            <span className="connection-line" />
            <Avatar initials={initials} tone="rose" size="lg" />
          </div>
          <div>
            <span className="section-eyebrow">Since {startDate}</span>
            <h1>Build, reflect, <em>repeat.</em></h1>
            <p>A focused space for the work between the conversations.</p>
          </div>
        </div>
        <div className="relationship-status">
          <StatusBadge>Active mentorship</StatusBadge>
          <span>Next check-in scheduled</span>
        </div>
      </div>

      <div className="relationship-profile">
        <div className="person-summary">
          <Avatar initials={initials} tone="rose" size="md" />
          <div>
            <strong>{mentorName}</strong>
            <span>{mentorRole} · {mentorCompany}</span>
          </div>
          <span className="verified-chip">
            <Icon name="shield" size={12} /> Verified alumna
          </span>
        </div>
        <div className="relationship-actions">
          <button className="button button-outline" type="button">
            <Icon name="message" size={16} /> Message {mentorName.split(" ")[0]}
          </button>
          <button aria-label="More relationship options" className="plain-icon-button" type="button">
            <Icon name="more" size={18} />
          </button>
        </div>
      </div>

      <div className="tab-bar" role="tablist" aria-label="Mentorship sections">
        {[
          { id: "overview", label: "Overview" },
          { id: "sessions", label: "Sessions", count: "1" },
          { id: "goals", label: "Goals & actions", count: "2" },
          { id: "notes", label: "Shared notes" },
        ].map((item) => (
          <button
            aria-selected={tab === item.id}
            className={`tab-button ${tab === item.id ? "is-active" : ""}`}
            key={item.id}
            onClick={() => setTab(item.id)}
            role="tab"
            type="button"
          >
            {item.label}
            {item.count ? <span>{item.count}</span> : null}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <div className="relationship-grid">
          <section className="panel timeline-panel">
            <SectionHeading
              eyebrow="Your journey"
              title="A little momentum goes a long way"
              action={
                <button className="text-link" type="button">
                  View timeline <Icon name="arrow" size={15} />
                </button>
              }
            />
            <div className="timeline">
              <div className="timeline-item is-complete">
                <span className="timeline-dot">
                  <Icon name="check" size={13} />
                </span>
                <div>
                  <strong>Mentorship initiated</strong>
                  <span>{startDate} · Career direction and context</span>
                </div>
                <StatusBadge>Active</StatusBadge>
              </div>
              <div className="timeline-item is-next">
                <span className="timeline-dot">
                  <Icon name="calendar" size={13} />
                </span>
                <div>
                  <strong>Upcoming 1-on-1 Consultation</strong>
                  <span>Alma video room protected</span>
                </div>
                <StatusBadge tone="amber">Scheduled</StatusBadge>
              </div>
            </div>
          </section>

          <section className="panel action-panel">
            <SectionHeading eyebrow="Your next actions" title="Before you meet" />
            <div className={`action-card ${complete ? "is-done" : ""}`}>
              <button
                aria-label={complete ? "Mark action incomplete" : "Mark action complete"}
                className="action-check"
                onClick={() => setComplete(!complete)}
                type="button"
              >
                <Icon name="check" size={14} />
              </button>
              <div>
                <strong>Prepare questions for your first discussion</strong>
                <span>Added by your mentor</span>
              </div>
            </div>
            <button className="add-action" type="button">
              <span>+</span> Add an action
            </button>
          </section>
        </div>
      ) : (
        <div className="panel tab-placeholder">
          <Icon name={tab === "sessions" ? "calendar" : tab === "goals" ? "flag" : "message"} size={24} />
          <h2>
            {tab === "sessions"
              ? "Sessions recorded in your mentorship."
              : tab === "goals"
              ? "Goals and shared milestones."
              : "Keep the useful context together."}
          </h2>
          <p>This space coordinates session records, measurable goals, and private notes between you and your mentor.</p>
          <button className="button button-outline" type="button">
            Add a note <Icon name="arrow" size={15} />
          </button>
        </div>
      )}
    </>
  );
}
