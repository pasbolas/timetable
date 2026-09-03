import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Compass,
  Calendar,
  RotateCw,
  Search,
  CheckCircle2,
  Sparkles,
  Sun,
  Moon,
  Laptop,
  WifiOff,
  ChevronRight,
  Download,
  GraduationCap,
} from "lucide-react";
import { ProgramSearchResult, DayData } from "../types/timetable";
import { generateLessonIcs, downloadIcsFile } from "../services/icalExport";
import { parseProgramCodeAndTitle } from "../services/transformer";
import { triggerHapticFeedback } from "../services/haptics";

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
    triggerHapticFeedback();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden pointer-events-auto select-none">
          {/* Backdrop with fade transition */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="fixed inset-0 bg-slate-950/65 dark:bg-black/75 backdrop-blur-sm cursor-pointer"
            onClick={onClose}
          />

          {/* Clean Bottom Sheet: Strictly 2 States Only (Fully Open & Fully Close) with bouncy smooth spring */}
          <motion.div
            variants={{
              hidden: {
                y: "105%",
                opacity: 0.85,
                scale: 0.96,
              },
              visible: {
                y: 0,
                opacity: 1,
                scale: 1,
                transition: {
                  type: "spring",
                  damping: 18, // Supple, bouncy overshoot
                  stiffness: 260, // Smooth momentum
                  mass: 0.85,
                  restDelta: 0.001,
                },
              },
              exit: {
                y: "105%",
                opacity: 0,
                scale: 0.96,
                transition: {
                  type: "spring",
                  damping: 20, // Responsive, bouncy exit
                  stiffness: 280,
                  mass: 0.75,
                },
              },
            }}
            initial="hidden"
            animate="visible"
            exit="exit"
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.35} // Fluid elastic resistance
            onDragEnd={(_, info) => {
              // Only 2 states: if pulled down past 80px or with flick velocity > 320 -> Fully Close
              if (info.offset.y > 80 || info.velocity.y > 320) {
                triggerHapticFeedback();
                onClose();
              }
              // Otherwise Framer Motion automatically springs back to Fully Open (y: 0) with bouncy spring
            }}
            className="relative z-10 w-full sm:max-w-md h-[88dvh] max-h-[88dvh] bg-white dark:bg-[#363636] rounded-t-[32px] sm:rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-neutral-600/70 flex flex-col touch-pan-y"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Big Minimise Handle at the Top (Tap or drag down to dismiss) */}
            <motion.div
              onClick={() => {
                triggerHapticFeedback();
                onClose();
              }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.92 }}
              className="w-full pt-3.5 pb-2 cursor-pointer flex flex-col items-center justify-center group transition-transform shrink-0"
              title="Tap or drag down to minimise"
            >
              <div className="w-20 h-2 bg-slate-300 dark:bg-neutral-500 group-hover:bg-slate-400 dark:group-hover:bg-neutral-400 rounded-full transition-colors shadow-xs" />
            </motion.div>

            {/* Drawer Header */}
            <div className="px-4 py-3 border-b border-slate-100 dark:border-neutral-600/70 flex items-center justify-between shrink-0">
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
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50/40 dark:from-[#834655]/30 dark:to-[#9F5069]/20 border border-slate-200/80 dark:border-[#9F5069]/40 space-y-2 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-blue-600 text-white dark:bg-[#834655] dark:text-[#F6CAC9] dark:border dark:border-[#9F5069]/50 shadow-sm">
                  {shortCode}
                </span>
              </div>
              <div className="text-xs font-semibold text-slate-800 dark:text-[#fbf7ed] line-clamp-2">
                {programTitle}
              </div>
              <button
                onClick={() => {
                  onClose();
                  onOpenSearch();
                }}
                className="w-full mt-1.5 py-2 px-3 rounded-xl bg-white dark:bg-[#424242] hover:bg-blue-50 dark:hover:bg-[#424242]/80 border border-slate-200 dark:border-neutral-600/70 text-xs font-semibold text-blue-600 dark:text-[#C8B273] flex items-center justify-center gap-1.5 shadow-sm active:scale-98 transition-all"
              >
                <Search className="w-3.5 h-3.5" />
                Change Degree / Course
              </button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="transition-all duration-300">
            <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
              Actions
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  onGoToToday();
                  onClose();
                }}
                className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-[#424242] dark:hover:bg-[#424242]/80 border border-slate-100 dark:border-neutral-600/70 text-left transition-all active:scale-95 flex flex-col justify-between h-20 group shadow-2xs"
              >
                <Sparkles className="w-4 h-4 text-blue-500 dark:text-[#C8B273] group-hover:scale-110 transition-transform" />
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-[#F6CAC9]">
                    Jump to Today
                  </div>
                  <div className="text-[10px] text-slate-400 dark:text-[#F6CAC9]/70">Current day view</div>
                </div>
              </button>

              <button
                onClick={() => {
                  onRefresh();
                  onClose();
                }}
                disabled={isLoading}
                className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-[#424242] dark:hover:bg-[#424242]/80 border border-slate-100 dark:border-neutral-600/70 text-left transition-all active:scale-95 flex flex-col justify-between h-20 disabled:opacity-50 group shadow-2xs"
              >
                <RotateCw
                  className={`w-4 h-4 text-emerald-500 dark:text-[#C8B273] group-hover:rotate-180 transition-transform duration-500 ${
                    isLoading ? "animate-spin" : ""
                  }`}
                />
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-[#F6CAC9]">
                    Reload Timetable
                  </div>
                  <div className="text-[10px] text-slate-400 dark:text-[#F6CAC9]/70">Fetch latest data</div>
                </div>
              </button>
            </div>
          </div>

          {/* Interactive Feature Tour */}
          <div className="transition-all duration-300">
            <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
              Guide
            </div>
            <button
              onClick={() => {
                onClose();
                onStartTour();
              }}
              className="w-full p-3 rounded-xl bg-gradient-to-r from-blue-50/80 to-indigo-50/80 hover:from-blue-100/80 hover:to-indigo-100/80 dark:from-[#834655]/30 dark:to-[#9F5069]/30 border border-blue-200/70 dark:border-[#9F5069]/40 flex items-center justify-between text-left transition-all active:scale-98 group shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white dark:bg-[#C8B273] dark:text-[#424242] flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                  <Compass className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-[#F6CAC9]">
                    Feature Tour & Guide
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-[#F6CAC9]/70">
                    Interactive walkthrough of features
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-blue-500 dark:text-[#C8B273] group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {/* Export to Calendar */}
          <div className="transition-all duration-300">
            <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
              Sync
            </div>
            <button
              onClick={handleExportWeekIcs}
              className="w-full p-3 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-[#424242] dark:hover:bg-[#424242]/80 border border-slate-100 dark:border-neutral-600/70 flex items-center justify-between text-left transition-all active:scale-98 group shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-[#834655]/40 text-indigo-600 dark:text-[#F6CAC9] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-[#F6CAC9]">
                    Export Week to Calendar
                  </div>
                  <div className="text-[10px] text-slate-400 dark:text-[#F6CAC9]/70">Download .ics for Apple / Google Cal</div>
                </div>
              </div>
              <Download className="w-4 h-4 text-slate-400 dark:text-[#C8B273] group-hover:text-blue-500 transition-colors" />
            </button>
          </div>

          {/* Recent Programs */}
          {recentPrograms.length > 1 && (
            <div className="transition-all duration-300">
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
                          ? "bg-blue-50/70 border-blue-200 dark:bg-[#834655]/40 dark:border-[#9F5069]/60"
                          : "bg-slate-50/50 hover:bg-slate-100 dark:bg-[#424242]/50 dark:hover:bg-[#424242] dark:border-neutral-600/60"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-[#834655] text-slate-700 dark:text-[#F6CAC9] shrink-0">
                          {code}
                        </span>
                        <span className="text-xs font-medium text-slate-700 dark:text-[#fbf7ed] truncate">
                          {title}
                        </span>
                      </div>
                      {isCurrent ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-[#C8B273] shrink-0" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-[#F6CAC9]/70 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Theme Selector */}
          <div className="transition-all duration-300">
            <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
              Theme
            </div>
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-[#303030] border border-slate-200/60 dark:border-neutral-600/70">
              <button
                onClick={() => onSetTheme("light")}
                className={`py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  theme === "light"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-900 dark:text-[#F6CAC9]/70 dark:hover:text-[#F6CAC9]"
                }`}
              >
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                Light
              </button>

              <button
                onClick={() => onSetTheme("dark")}
                className={`py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  theme === "dark"
                    ? "bg-slate-900 text-white dark:bg-[#C8B273] dark:text-[#424242] font-bold shadow-sm"
                    : "text-slate-500 hover:text-slate-900 dark:text-[#F6CAC9]/70 dark:hover:text-[#F6CAC9]"
                }`}
              >
                <Moon className="w-3.5 h-3.5 text-blue-400 dark:text-[#424242]" />
                Dark
              </button>

              <button
                onClick={() => onSetTheme("auto")}
                className={`py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  theme === "auto"
                    ? "bg-white text-slate-900 dark:bg-[#C8B273] dark:text-[#424242] font-bold shadow-sm"
                    : "text-slate-500 hover:text-slate-900 dark:text-[#F6CAC9]/70 dark:hover:text-[#F6CAC9]"
                }`}
              >
                <Laptop className="w-3.5 h-3.5 text-slate-400 dark:text-[#424242]" />
                Auto
              </button>
            </div>
          </div>
        </div>

        {/* Drawer Footer */}
        <div
          className="p-3 bg-slate-50/80 dark:bg-[#303030] border-t border-slate-100 dark:border-neutral-600/70 text-center text-[10px] text-slate-400 dark:text-[#F6CAC9]/70 shrink-0"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 12px)" }}
        >
          Scientia Timetabler EU • Dublin (Europe/Dublin)
        </div>
      </motion.div>
    </div>
  )}
</AnimatePresence>
  );
};
