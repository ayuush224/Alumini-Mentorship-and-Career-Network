"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  Calendar,
  Video,
  X,
  Plus,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { validateMeetingLink } from "@/lib/session-service";

export interface ActiveMenteeOption {
  id: string;
  name: string;
  avatarUrl?: string;
  headline?: string;
}

interface CreateSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialMentees?: ActiveMenteeOption[];
}

const PRESET_DURATIONS = [15, 30, 45, 60, 90, 120] as const;

export function CreateSessionModal({
  isOpen,
  onClose,
  onSuccess,
  initialMentees = [],
}: CreateSessionModalProps) {
  // Modal focus trap & ESC listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Form State
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState<number>(45);
  const [isCustomDuration, setIsCustomDuration] = useState(false);
  const [customDurationInput, setCustomDurationInput] = useState<string>("45");
  const [topic, setTopic] = useState("");
  const [meetingLink, setMeetingLink] = useState("");

  // Mentee multi-select state
  const [selectedMentees, setSelectedMentees] = useState<ActiveMenteeOption[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [menteesList, setMenteesList] = useState<ActiveMenteeOption[]>(initialMentees);
  const [isLoadingMentees, setIsLoadingMentees] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  // Status and Errors
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [conflictNotice, setConflictNotice] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Initialize date/time with a valid 5-minute rounded slot 1 hour in future
  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      now.setMinutes(Math.ceil((now.getMinutes() + 15) / 5) * 5, 0, 0);

      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      setDate(`${yyyy}-${mm}-${dd}`);

      const hh = String(now.getHours()).padStart(2, "0");
      const min = String(now.getMinutes()).padStart(2, "0");
      setTime(`${hh}:${min}`);

      // Reset errors & statuses
      setFormError(null);
      setFieldErrors({});
      setConflictNotice(null);
      setSuccessToast(null);
      setTopic("");
      setMeetingLink("");
      setIsCustomDuration(false);
      setCustomDurationInput("45");
      setDuration(45);
      setSelectedMentees([]);
      setSearchQuery("");
      setIsDropdownOpen(false);

      // Fetch active mentees
      fetchActiveMentees("");
    }
  }, [isOpen]);

  // Click outside listener for mentee dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isDropdownOpen]);

  // Debounced search for mentees (300ms)
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      fetchActiveMentees(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, isOpen]);

  const fetchActiveMentees = async (q: string) => {
    setIsLoadingMentees(true);
    try {
      const res = await fetch(`/api/mentor/mentees${q ? `?q=${encodeURIComponent(q)}` : ""}`);
      if (res.ok) {
        const data = await res.json();
        setMenteesList(data.mentees || []);
      }
    } catch {
      // Degrade gracefully
    } finally {
      setIsLoadingMentees(false);
    }
  };

  // Keyboard navigation inside Mentee Multi-Select
  const handleKeyDownOnSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isDropdownOpen && (e.key === "ArrowDown" || e.key === "Enter")) {
      setIsDropdownOpen(true);
      return;
    }

    if (e.key === "Backspace" && !searchQuery && selectedMentees.length > 0) {
      // Remove last chip
      e.preventDefault();
      setSelectedMentees((prev) => prev.slice(0, -1));
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < menteesList.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : menteesList.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < menteesList.length) {
        const candidate = menteesList[highlightedIndex];
        toggleMentee(candidate);
      }
    } else if (e.key === "Escape") {
      setIsDropdownOpen(false);
    }
  };

  const toggleMentee = (mentee: ActiveMenteeOption) => {
    const isSelected = selectedMentees.some((m) => m.id === mentee.id);
    if (isSelected) {
      setSelectedMentees((prev) => prev.filter((m) => m.id !== mentee.id));
    } else {
      if (selectedMentees.length >= 20) {
        setFieldErrors((prev) => ({ ...prev, mentees: "Maximum 20 mentees per session" }));
        return;
      }
      setSelectedMentees((prev) => [...prev, mentee]);
      setFieldErrors((prev) => {
        const rest = { ...prev };
        delete rest.mentees;
        return rest;
      });
    }
    setSearchQuery("");
    setIsDropdownOpen(false);
    searchInputRef.current?.focus();
  };

  const removeMentee = (id: string) => {
    setSelectedMentees((prev) => prev.filter((m) => m.id !== id));
  };

  // Duration Selection
  const handleDurationPreset = (mins: number) => {
    setIsCustomDuration(false);
    setDuration(mins);
    setCustomDurationInput(String(mins));
  };

  const handleCustomDurationChange = (val: string) => {
    setCustomDurationInput(val);
    const num = parseInt(val, 10);
    if (!isNaN(num)) {
      setDuration(num);
    }
  };

  // Form Validation & Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setConflictNotice(null);
    const errors: Record<string, string> = {};

    // 1. Date & Time Validation
    if (!date) {
      errors.date = "Session date is required";
    }
    if (!time) {
      errors.time = "Session time is required";
    }

    let sessionStartTime: Date | null = null;
    if (date && time) {
      sessionStartTime = new Date(`${date}T${time}:00`);
      if (isNaN(sessionStartTime.getTime())) {
        errors.date = "Invalid date/time combination";
      } else {
        const now = Date.now();
        const minFuture = now + 5 * 60 * 1000;
        if (sessionStartTime.getTime() < minFuture) {
          errors.time = "Session must be scheduled at least 5 minutes in the future";
        }
        if (sessionStartTime.getMinutes() % 5 !== 0) {
          errors.time = "Time must be rounded to a 5-minute increment (e.g., :00, :05, :10, :15)";
        }
      }
    }

    // 2. Duration Validation
    if (!duration || duration < 15 || duration > 240 || duration % 5 !== 0) {
      errors.duration = "Duration must be between 15 and 240 minutes, in multiples of 5";
    }

    // 3. Topic Validation
    if (topic && topic.length > 120) {
      errors.topic = "Topic cannot exceed 120 characters";
    }

    // 4. Mentees Validation
    if (selectedMentees.length === 0) {
      errors.mentees = "Please select at least one active mentee";
    }

    // 5. Meeting Link Validation
    const linkValidation = validateMeetingLink(meetingLink);
    if (!linkValidation.isValid) {
      errors.meetingLink = linkValidation.error || "Please enter a valid meeting link";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const payload = {
        startTime: sessionStartTime!.toISOString(),
        durationMinutes: duration,
        topic: topic.trim() || undefined,
        menteeIds: selectedMentees.map((m) => m.id),
        meetingLink: linkValidation.normalized!,
        requestId: `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      };

      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          if (data.conflictingSession) {
            const conflictStart = new Date(data.conflictingSession.startTime).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });
            const conflictEnd = new Date(data.conflictingSession.endTime).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });
            setConflictNotice(`You already have a scheduled session from ${conflictStart} to ${conflictEnd}. Please pick a different time.`);
          } else {
            setConflictNotice(data.error || "This time slot overlaps with another scheduled session.");
          }
        } else {
          setFormError(data.error || "Failed to create session. Please try again.");
        }
        return;
      }

      // Success
      setSuccessToast("Mentoring session created successfully!");
      setTimeout(() => {
        onClose();
        if (onSuccess) onSuccess();
      }, 900);
    } catch {
      setFormError("Network error. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-session-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-fadeIn"
    >
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl border border-stone-200/90 shadow-2xl p-6 sm:p-7">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary-600/10 flex items-center justify-center text-primary-600">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 id="create-session-title" className="text-lg font-bold font-serif text-stone-900">
                Create Mentoring Session
              </h2>
              <p className="text-xs text-stone-500">
                Schedule a 1:1 or small-group consultation with your active mentees.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Alert Toast */}
        {successToast && (
          <div className="mt-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successToast}</span>
          </div>
        )}

        {/* Conflict / Overlap Banner */}
        {conflictNotice && (
          <div className="mt-4 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Schedule Overlap Detected</p>
              <p className="text-amber-800 mt-0.5">{conflictNotice}</p>
            </div>
          </div>
        )}

        {/* Global Error Alert */}
        {formError && (
          <div className="mt-4 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          {/* 1. Mentees Multi-Select */}
          <div className="space-y-1.5" ref={dropdownRef}>
            <label className="block text-xs font-bold text-stone-700">
              Select Mentees <span className="text-primary-600">*</span>
              <span className="text-[11px] font-normal text-stone-400 ml-1.5">
                (From your active mentee list)
              </span>
            </label>

            {/* Selected Chips Container */}
            <div
              onClick={() => {
                setIsDropdownOpen(true);
                searchInputRef.current?.focus();
              }}
              className={`min-h-[46px] p-2 rounded-2xl border transition-all flex flex-wrap items-center gap-1.5 cursor-text ${
                fieldErrors.mentees
                  ? "border-red-400 bg-red-50/20"
                  : isDropdownOpen
                  ? "border-primary-600 ring-2 ring-primary-600/15 bg-white"
                  : "border-stone-200 bg-stone-50/60 hover:bg-stone-50"
              }`}
            >
              {selectedMentees.map((m) => (
                <span
                  key={m.id}
                  className="inline-flex items-center gap-1.5 pl-2 pr-1.5 py-1 rounded-xl bg-white border border-stone-200 shadow-2xs text-xs font-semibold text-stone-800"
                >
                  {m.avatarUrl ? (
                    <Image
                      src={m.avatarUrl}
                      alt={m.name}
                      width={18}
                      height={18}
                      className="w-4.5 h-4.5 rounded-full object-cover"
                    />
                  ) : (
                    <span className="w-4.5 h-4.5 rounded-full bg-primary-600/10 text-primary-600 text-[10px] flex items-center justify-center font-bold">
                      {m.name.slice(0, 1)}
                    </span>
                  )}
                  <span>{m.name}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeMentee(m.id);
                    }}
                    className="p-0.5 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
                    title={`Remove ${m.name}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}

              {/* Search Input inside chip container */}
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsDropdownOpen(true);
                }}
                onFocus={() => setIsDropdownOpen(true)}
                onKeyDown={handleKeyDownOnSearch}
                placeholder={selectedMentees.length === 0 ? "Type or select active mentees..." : "Add another mentee..."}
                className="flex-1 min-w-[140px] bg-transparent text-xs text-stone-800 placeholder-stone-400 focus:outline-hidden px-1 py-1"
              />
            </div>

            {fieldErrors.mentees && (
              <p className="text-[11px] text-red-600 font-medium">{fieldErrors.mentees}</p>
            )}

            {/* Dropdown Options List */}
            {isDropdownOpen && (
              <div className="relative">
                <div className="absolute top-1 left-0 right-0 z-30 max-h-52 overflow-y-auto bg-white rounded-2xl border border-stone-200 shadow-xl p-1.5 space-y-0.5">
                  {isLoadingMentees ? (
                    <div className="p-3 text-center text-xs text-stone-400 flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-primary-600" />
                      <span>Searching active mentees...</span>
                    </div>
                  ) : menteesList.length === 0 ? (
                    <div className="p-3 text-center text-xs text-stone-400">
                      {searchQuery ? "Not in your mentee list" : "No active mentees found"}
                    </div>
                  ) : (
                    menteesList.map((mentee, idx) => {
                      const isSelected = selectedMentees.some((m) => m.id === mentee.id);
                      const isHighlighted = idx === highlightedIndex;

                      return (
                        <button
                          key={mentee.id}
                          type="button"
                          disabled={isSelected}
                          onClick={() => toggleMentee(mentee)}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                            isSelected
                              ? "opacity-45 bg-stone-50 cursor-not-allowed"
                              : isHighlighted
                              ? "bg-stone-100 text-stone-900"
                              : "hover:bg-stone-50 text-stone-800"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {mentee.avatarUrl ? (
                              <Image
                                src={mentee.avatarUrl}
                                alt={mentee.name}
                                width={24}
                                height={24}
                                className="w-6 h-6 rounded-full object-cover shrink-0"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                                {mentee.name.slice(0, 1)}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-semibold truncate">{mentee.name}</p>
                              {mentee.headline && (
                                <p className="text-[10px] text-stone-400 truncate">
                                  {mentee.headline}
                                </p>
                              )}
                            </div>
                          </div>
                          {isSelected && (
                            <span className="text-[10px] text-stone-400 font-mono">Selected</span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 2. Date and Time Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-stone-700">
                Session Date <span className="text-primary-600">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  min={todayStr}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-2xl border text-xs text-stone-800 bg-white transition-all focus:outline-hidden ${
                    fieldErrors.date
                      ? "border-red-400 bg-red-50/20"
                      : "border-stone-200 focus:border-primary-600 focus:ring-2 focus:ring-primary-600/15"
                  }`}
                />
              </div>
              {fieldErrors.date && (
                <p className="text-[11px] text-red-600 font-medium">{fieldErrors.date}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-stone-700">
                Start Time (Your Timezone) <span className="text-primary-600">*</span>
              </label>
              <div className="relative">
                <input
                  type="time"
                  step="300"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-2xl border text-xs text-stone-800 bg-white transition-all focus:outline-hidden font-mono ${
                    fieldErrors.time
                      ? "border-red-400 bg-red-50/20"
                      : "border-stone-200 focus:border-primary-600 focus:ring-2 focus:ring-primary-600/15"
                  }`}
                />
              </div>
              {fieldErrors.time && (
                <p className="text-[11px] text-red-600 font-medium">{fieldErrors.time}</p>
              )}
            </div>
          </div>

          {/* 3. Duration Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-stone-700">
                Duration <span className="text-primary-600">*</span>
              </label>
              <span className="text-xs font-mono font-bold text-primary-600">
                {duration} minutes
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {PRESET_DURATIONS.map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => handleDurationPreset(mins)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold font-mono transition-all cursor-pointer ${
                    !isCustomDuration && duration === mins
                      ? "bg-primary-600 text-white shadow-2xs"
                      : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                  }`}
                >
                  {mins}m
                </button>
              ))}

              <button
                type="button"
                onClick={() => setIsCustomDuration(true)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isCustomDuration
                    ? "bg-primary-600 text-white shadow-2xs"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                Custom
              </button>
            </div>

            {isCustomDuration && (
              <div className="mt-2 flex items-center gap-3">
                <input
                  type="number"
                  min="15"
                  max="240"
                  step="5"
                  value={customDurationInput}
                  onChange={(e) => handleCustomDurationChange(e.target.value)}
                  placeholder="Minutes (15-240)"
                  className="w-36 px-3 py-2 rounded-xl border border-stone-200 text-xs text-stone-800 font-mono focus:outline-hidden focus:border-primary-600"
                />
                <span className="text-[11px] text-stone-500">
                  Multiple of 5 mins (min 15, max 240)
                </span>
              </div>
            )}

            {fieldErrors.duration && (
              <p className="text-[11px] text-red-600 font-medium">{fieldErrors.duration}</p>
            )}
          </div>

          {/* 4. Topic (Optional, Max 120 chars) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-stone-700">
                Topic / Agenda <span className="text-[11px] font-normal text-stone-400">(Optional)</span>
              </label>
              <span className="text-[10px] font-mono text-stone-400">
                {topic.length}/120
              </span>
            </div>
            <input
              type="text"
              maxLength={120}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Portfolio Review, Mock System Design, Resume Polish"
              className={`w-full px-3.5 py-2.5 rounded-2xl border text-xs text-stone-800 bg-white transition-all focus:outline-hidden ${
                fieldErrors.topic
                  ? "border-red-400 bg-red-50/20"
                  : "border-stone-200 focus:border-primary-600 focus:ring-2 focus:ring-primary-600/15"
              }`}
            />
            {fieldErrors.topic && (
              <p className="text-[11px] text-red-600 font-medium">{fieldErrors.topic}</p>
            )}
          </div>

          {/* 5. Meeting Link (Required, Host Allow-List) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-stone-700">
              Meeting Video Link <span className="text-primary-600">*</span>
              <span className="text-[11px] font-normal text-stone-400 ml-1.5">
                (Google Meet, Zoom, Jitsi, or 8x8)
              </span>
            </label>
            <div className="relative">
              <input
                type="url"
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                placeholder="https://meet.google.com/abc-defg-hij or https://zoom.us/j/..."
                className={`w-full pl-9 pr-3.5 py-2.5 rounded-2xl border text-xs text-stone-800 bg-white transition-all focus:outline-hidden font-mono ${
                  fieldErrors.meetingLink
                    ? "border-red-400 bg-red-50/20"
                    : "border-stone-200 focus:border-primary-600 focus:ring-2 focus:ring-primary-600/15"
                }`}
              />
              <Video className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
            </div>
            {fieldErrors.meetingLink && (
              <p className="text-[11px] text-red-600 font-medium">{fieldErrors.meetingLink}</p>
            )}
          </div>

          {/* Modal Action Buttons */}
          <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-stone-200 text-xs font-semibold text-stone-600 hover:bg-stone-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold transition-colors shadow-xs flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Scheduling Session...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Schedule Session</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
