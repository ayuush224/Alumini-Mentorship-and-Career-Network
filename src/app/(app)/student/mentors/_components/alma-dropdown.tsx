"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface DropdownOption<T = string> {
  value: T;
  label: string;
  count?: number;
  badge?: string;
  icon?: React.ReactNode;
}

export interface AlmaDropdownProps<T = string> {
  value: T;
  onChange: (value: T) => void;
  options: DropdownOption<T>[];
  placeholder?: string;
  icon?: React.ReactNode;
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
  align?: "left" | "right";
  ariaLabel?: string;
}

export function AlmaDropdown<T extends string = string>({
  value,
  onChange,
  options,
  placeholder = "Select an option...",
  icon,
  className = "",
  buttonClassName = "",
  menuClassName = "",
  align = "left",
  ariaLabel,
}: AlmaDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Keyboard navigation & closing on Escape
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        return;
      }

      if (!isOpen && (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        setIsOpen(true);
        return;
      }

      if (isOpen) {
        const currentIndex = options.findIndex((opt) => opt.value === value);

        if (e.key === "ArrowDown") {
          e.preventDefault();
          const nextIndex = currentIndex < options.length - 1 ? currentIndex + 1 : 0;
          onChange(options[nextIndex].value);
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          const prevIndex = currentIndex > 0 ? currentIndex - 1 : options.length - 1;
          onChange(options[prevIndex].value);
        } else if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setIsOpen(false);
        }
      }
    },
    [isOpen, options, value, onChange]
  );

  return (
    <div
      ref={containerRef}
      className={`relative font-sans ${className}`}
      onKeyDown={handleKeyDown}
    >
      {/* Trigger Button */}
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel || selectedOption?.label || placeholder}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`group w-full cursor-pointer rounded-xl border px-3.5 py-2.5 text-xs font-medium transition-all duration-150 flex items-center justify-between gap-2 text-left focus:outline-none ${
          isOpen
            ? "border-primary-500 bg-white ring-2 ring-primary-500/20 text-stone-900 shadow-2xs"
            : "border-stone-200/80 bg-stone-50 hover:border-stone-300 hover:bg-stone-100/70 text-stone-800"
        } ${buttonClassName}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {icon && <span className="shrink-0 text-stone-400 group-hover:text-primary-600 transition-colors">{icon}</span>}
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.count !== undefined && selectedOption.count > 0 && (
            <span className="ml-1 shrink-0 rounded-md bg-stone-200/60 px-1.5 py-0.5 text-[10px] font-semibold text-stone-600">
              {selectedOption.count}
            </span>
          )}
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 text-stone-400 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-primary-600" : "group-hover:text-stone-600"
          }`}
        />
      </button>

      {/* Floating Menu Panel */}
      {isOpen && (
        <div
          ref={listRef}
          role="listbox"
          tabIndex={-1}
          className={`absolute z-50 mt-1.5 max-h-72 w-full min-w-[220px] overflow-y-auto rounded-2xl border border-stone-200/90 bg-white p-1.5 shadow-xl shadow-stone-900/10 backdrop-blur-md transition-all animate-in fade-in zoom-in-95 duration-100 ${
            align === "right" ? "right-0" : "left-0"
          } ${menuClassName}`}
          style={{ scrollbarWidth: "thin" }}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;

            return (
              <button
                key={String(opt.value)}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`group flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-xs text-left font-sans transition-colors duration-100 ${
                  isSelected
                    ? "bg-primary-50 text-primary-700 font-semibold"
                    : "text-stone-700 hover:bg-primary-50/80 hover:text-primary-800"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {opt.icon && (
                    <span className={`shrink-0 ${isSelected ? "text-primary-600" : "text-stone-400 group-hover:text-primary-600"}`}>
                      {opt.icon}
                    </span>
                  )}
                  <span className="truncate">{opt.label}</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  {opt.count !== undefined && (
                    <span
                      className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold transition-colors ${
                        isSelected
                          ? "bg-primary-100/90 text-primary-700"
                          : "bg-stone-100 text-stone-500 group-hover:bg-primary-100 group-hover:text-primary-700"
                      }`}
                    >
                      {opt.count}
                    </span>
                  )}
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-primary-600 shrink-0 ml-1" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
