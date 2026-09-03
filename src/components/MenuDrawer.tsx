import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Search,
  RotateCw,
  Sparkles,
  Sun,
  Moon,
  Laptop,
  Calendar,
  Download,
  WifiOff,
  CheckCircle2,
  ChevronRight,
  GraduationCap,
  Compass,
} from "lucide-react";
import { ProgramSearchResult, DayData } from "../types/timetable";
import { generateLessonIcs, downloadIcsFile } from "../services/icalExport";
import { parseProgramCodeAndTitle } from "../services/transformer";

interface MenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProgram: ProgramSearchResult;
  onOpenSearch: () => void;
  recentPrograms: ProgramSearchResult[];
  onSelectProgram: (program: ProgramSearchResult) => void;
  onGoToToday: () => void;
  theme: "light" | "dark" | "auto";
  onSetTheme: (theme: "light" | "dark" | "auto") => void;
  onRefresh: () => void;
  isLoading: boolean;
  isOffline: boolean;
  weekSchedule: DayData[];
  onStartTour: () => void;
}

export const MenuDrawer: React.FC<MenuDrawerProps> = ({
  isOpen,
  onClose,
  selectedProgram,
  onOpenSearch,
  recentPrograms,
  onSelectProgram,
  onGoToToday,
  theme,
  onSetTheme,
  onRefresh,
  isLoading,
  isOffline,
  weekSchedule,
  onStartTour,
}) => {
  // Drag-to-dismiss gesture state
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartXRef = useRef<number>(0);
  const currentTranslateRef = useRef<number>(0);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Reset drag offset when opening/closing
  useEffect(() => {
    if (!isOpen) {
      setDragOffset(0);
      setIsDragging(false);
    }
  }, [isOpen]);

  const { code: shortCode, title: programTitle } = parseProgramCodeAndTitle(
    selectedProgram.Name,
    selectedProgram.Description
  );

  // Export full week schedule to .ics
  const handleExportWeekIcs = () => {
    const allLessons = weekSchedule.flatMap((d) => d.lessons);
    if (allLessons.length === 0) return;

    let combinedEvents = "";
    allLessons.forEach((lesson) => {
      const ics = generateLessonIcs(lesson);
      const match = ics.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/);
      if (match) {
        combinedEvents += match[0] + "\r\n";
      }
    });

    const fullIcs = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//MyTimetable//Timetable App//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      combinedEvents.trim(),
      "END:VCALENDAR",
    ].join("\r\n");

    downloadIcsFile(`timetable_${shortCode.replace(/[^a-z0-9]/gi, "_")}.ics`, fullIcs);
  };

  // Touch Swipe-to-Dismiss handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const currentX = e.touches[0].clientX;
    const deltaX = currentX - touchStartXRef.current;
    // Only allow dragging to the right (towards close)
    if (deltaX > 0) {
      setDragOffset(deltaX);
      currentTranslateRef.current = deltaX;
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (currentTranslateRef.current > 75) {
      onClose();
    }
    setDragOffset(0);
    currentTranslateRef.current = 0;
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-end transition-all duration-300 ease-out ${
        isOpen
          ? "opacity-100 pointer-events-auto bg-slate-950/60 backdrop-blur-sm"
          : "opacity-0 pointer-events-none bg-slate-950/0 backdrop-blur-none"
      }`}
      onClick={onClose}
    >
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: isOpen
            ? `translateX(${dragOffset}px)`
            : "translateX(100%)",
          transition: isDragging
            ? "none"
            : "transform 350ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 350ms ease",
        }}
        className="w-full max-w-sm h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col overflow-hidden border-l border-slate-200/80 dark:border-slate-800 will-change-transform"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag Indicator Bar */}
        <div className="w-12 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mt-2.5 mb-1 sm:hidden opacity-60" />

        {/* Drawer Header */}
        <div
          className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between"
          style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 16px)" }}
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-sm text-slate-900 dark:text-white block leading-none">
                Preferences & Menu
              </span>
              <span className="text-[10px] text-slate-400">Timetable options</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {isOffline && (
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-semibold">
                <WifiOff className="w-2.5 h-2.5" />
                Offline
              </span>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Drawer Scrollable Body with Staggered Fade Entrance */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
          {/* Active Course Card */}
          <div
            className={`transition-all duration-300 transform ${
              isOpen ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
            }`}
          >
            <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
              Current Course
            </div>
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50/40 dark:from-slate-800/80 dark:to-blue-950/20 border border-slate-200/80 dark:border-slate-700/60 space-y-2 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-blue-600 text-white shadow-sm">
                  {shortCode}
                </span>
              </div>
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-2">
                {programTitle}
              </div>
              <button
                onClick={() => {
                  onClose();
                  onOpenSearch();
                }}
                className="w-full mt-1.5 py-2 px-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center justify-center gap-1.5 shadow-sm active:scale-98 transition-all"
              >
                <Search className="w-3.5 h-3.5" />
                Change Degree / Course
              </button>
            </div>
          </div>

          {/* Quick Actions */}
          <div
            className={`transition-all duration-300 delay-75 transform ${
              isOpen ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
            }`}
          >
            <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
              Actions
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  onGoToToday();
                  onClose();
                }}
                className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800 text-left transition-all active:scale-95 flex flex-col justify-between h-20 group"
              >
                <Sparkles className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" />
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Jump to Today
                  </div>
                  <div className="text-[10px] text-slate-400">Current day view</div>
                </div>
              </button>

              <button
                onClick={() => {
                  onRefresh();
                  onClose();
                }}
                disabled={isLoading}
                className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800 text-left transition-all active:scale-95 flex flex-col justify-between h-20 disabled:opacity-50 group"
              >
                <RotateCw
                  className={`w-4 h-4 text-emerald-500 group-hover:rotate-180 transition-transform duration-500 ${
                    isLoading ? "animate-spin" : ""
                  }`}
                />
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Reload Timetable
                  </div>
                  <div className="text-[10px] text-slate-400">Fetch latest data</div>
                </div>
              </button>
            </div>
          </div>

          {/* Interactive Feature Tour */}
          <div
            className={`transition-all duration-300 delay-100 transform ${
              isOpen ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
            }`}
          >
            <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
              Guide
            </div>
            <button
              onClick={() => {
                onClose();
                onStartTour();
              }}
              className="w-full p-3 rounded-xl bg-gradient-to-r from-blue-50/80 to-indigo-50/80 hover:from-blue-100/80 hover:to-indigo-100/80 dark:from-blue-950/40 dark:to-indigo-950/40 dark:hover:from-blue-900/50 dark:hover:to-indigo-900/50 border border-blue-200/70 dark:border-blue-800/60 flex items-center justify-between text-left transition-all active:scale-98 group shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-blue-600/30 group-hover:scale-105 transition-transform">
                  <Compass className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Feature Tour & Guide
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    Interactive walkthrough of features
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-blue-500 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {/* Export to Calendar */}
          <div
            className={`transition-all duration-300 delay-100 transform ${
              isOpen ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
            }`}
          >
            <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
              Sync
            </div>
            <button
              onClick={handleExportWeekIcs}
              className="w-full p-3 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-left transition-all active:scale-98 group shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Export Week to Calendar
                  </div>
                  <div className="text-[10px] text-slate-400">Download .ics for Apple / Google Cal</div>
                </div>
              </div>
              <Download className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
            </button>
          </div>

          {/* Recent Programs */}
          {recentPrograms.length > 1 && (
            <div
              className={`transition-all duration-300 delay-150 transform ${
                isOpen ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
              }`}
            >
              <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                Switch Recent Courses
              </div>
              <div className="space-y-1.5">
                {recentPrograms.map((prog) => {
                  const isCurrent = prog.Identity === selectedProgram.Identity;
                  const { code, title } = parseProgramCodeAndTitle(prog.Name, prog.Description);
                  return (
                    <button
                      key={prog.Identity}
                      onClick={() => {
                        onSelectProgram(prog);
                        onClose();
                      }}
                      className={`w-full text-left p-2.5 rounded-xl border transition-all active:scale-98 flex items-center justify-between ${
                        isCurrent
                          ? "bg-blue-50/70 border-blue-200 dark:bg-blue-950/40 dark:border-blue-900/60"
                          : "bg-slate-50/50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800 dark:border-slate-800/80"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 shrink-0">
                          {code}
                        </span>
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                          {title}
                        </span>
                      </div>
                      {isCurrent ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Theme Selector */}
          <div
            className={`transition-all duration-300 delay-200 transform ${
              isOpen ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
            }`}
          >
            <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
              Theme
            </div>
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
              <button
                onClick={() => onSetTheme("light")}
                className={`py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  theme === "light"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                Light
              </button>

              <button
                onClick={() => onSetTheme("dark")}
                className={`py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  theme === "dark"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                <Moon className="w-3.5 h-3.5 text-blue-400" />
                Dark
              </button>

              <button
                onClick={() => onSetTheme("auto")}
                className={`py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  theme === "auto"
                    ? "bg-white text-slate-900 dark:bg-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                <Laptop className="w-3.5 h-3.5 text-slate-400" />
                Auto
              </button>
            </div>
          </div>
        </div>

        {/* Drawer Footer */}
        <div
          className="p-3 bg-slate-50/80 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 text-center text-[10px] text-slate-400"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 12px)" }}
        >
          Scientia Timetabler EU • Dublin (Europe/Dublin)
        </div>
      </div>
    </div>
  );
};
