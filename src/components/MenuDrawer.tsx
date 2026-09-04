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
            className="fixed inset-0 bg-black/60 cursor-pointer"
            onClick={onClose}
          />

          {/* Clean Bottom Sheet */}
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
                  damping: 18,
                  stiffness: 260,
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
                  damping: 20,
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
            dragElastic={0.35}
            onDragEnd={(_, info) => {
              if (info.offset.y > 80 || info.velocity.y > 320) {
                triggerHapticFeedback();
                onClose();
              }
            }}
            className="relative z-10 w-full sm:max-w-md h-[88dvh] max-h-[88dvh] bg-white rounded-t-3xl sm:rounded-2xl border-2 border-black overflow-hidden flex flex-col touch-pan-y"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Big Minimise Handle at the Top */}
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
              <div className="w-20 h-2 bg-black group-hover:bg-zinc-700 rounded-full transition-colors shadow-xs" />
            </motion.div>

            {/* Drawer Header */}
            <div className="px-4 py-3 border-b-2 border-black flex items-center justify-between shrink-0 bg-white">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center">
                  <GraduationCap className="w-4 h-4 text-white" />
                </div>
                <div>
                  <span className="font-black text-sm text-black block leading-none">
                    Preferences & Menu
                  </span>
                  <span className="text-[10px] font-bold text-black">Timetable options</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {isOffline && (
                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border border-black bg-white text-black font-bold">
                    <WifiOff className="w-2.5 h-2.5 text-black" />
                    Offline
                  </span>
                )}
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-xl text-black border border-black hover:bg-zinc-100 active:scale-95 transition-all"
                >
                  <X className="w-5 h-5 text-black" />
                </button>
              </div>
            </div>

            {/* Drawer Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar bg-white">
              {/* Active Course Card */}
              <div
                className={`transition-all duration-300 transform ${
                  isOpen ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
                }`}
              >
                <div className="text-[11px] font-black text-black uppercase tracking-wider mb-1.5">
                  Current Course
                </div>
                <div className="p-3.5 rounded-xl bg-white border-2 border-black space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-black text-white border border-black">
                      {shortCode}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-black line-clamp-2">
                    {programTitle}
                  </div>
                  <button
                    onClick={() => {
                      onClose();
                      onOpenSearch();
                    }}
                    className="w-full mt-1.5 py-2 px-3 rounded-xl bg-black hover:bg-zinc-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 border-2 border-black shadow-sm active:scale-98 transition-all"
                  >
                    <Search className="w-3.5 h-3.5 text-white" />
                    Change Degree / Course
                  </button>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="transition-all duration-300">
                <div className="text-[11px] font-black text-black uppercase tracking-wider mb-1.5">
                  Actions
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      onGoToToday();
                      onClose();
                    }}
                    className="p-3 rounded-xl bg-white hover:bg-zinc-100 border-2 border-black text-left transition-all active:scale-95 flex flex-col justify-between h-20 group shadow-xs"
                  >
                    <Sparkles className="w-4 h-4 text-black group-hover:scale-110 transition-transform" />
                    <div>
                      <div className="text-xs font-black text-black">
                        Jump to Today
                      </div>
                      <div className="text-[10px] font-medium text-black">Current day view</div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      onRefresh();
                      onClose();
                    }}
                    disabled={isLoading}
                    className="p-3 rounded-xl bg-white hover:bg-zinc-100 border-2 border-black text-left transition-all active:scale-95 flex flex-col justify-between h-20 disabled:opacity-50 group shadow-xs"
                  >
                    <RotateCw
                      className={`w-4 h-4 text-black group-hover:rotate-180 transition-transform duration-500 ${
                        isLoading ? "animate-spin" : ""
                      }`}
                    />
                    <div>
                      <div className="text-xs font-black text-black">
                        Reload Timetable
                      </div>
                      <div className="text-[10px] font-medium text-black">Fetch latest data</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Interactive Feature Tour */}
              <div className="transition-all duration-300">
                <div className="text-[11px] font-black text-black uppercase tracking-wider mb-1.5">
                  Guide
                </div>
                <button
                  onClick={() => {
                    onClose();
                    onStartTour();
                  }}
                  className="w-full p-3 rounded-xl bg-white hover:bg-zinc-100 border-2 border-black flex items-center justify-between text-left transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center shrink-0">
                      <Compass className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-black">
                        Feature Tour & Guide
                      </div>
                      <div className="text-[10px] font-medium text-black">
                        Interactive walkthrough of features
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-black group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>

              {/* Export to Calendar */}
              <div className="transition-all duration-300">
                <div className="text-[11px] font-black text-black uppercase tracking-wider mb-1.5">
                  Sync
                </div>
                <button
                  onClick={handleExportWeekIcs}
                  className="w-full p-3 rounded-xl bg-white hover:bg-zinc-100 border-2 border-black flex items-center justify-between text-left transition-all active:scale-98 group shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Calendar className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-black">
                        Export Week to Calendar
                      </div>
                      <div className="text-[10px] font-medium text-black">Download .ics for Apple / Google Cal</div>
                    </div>
                  </div>
                  <Download className="w-4 h-4 text-black transition-colors" />
                </button>
              </div>

              {/* Recent Programs */}
              {recentPrograms.length > 1 && (
                <div className="transition-all duration-300">
                  <div className="text-[11px] font-black text-black uppercase tracking-wider mb-1.5">
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
                          className={`w-full text-left p-2.5 rounded-xl border-2 transition-all active:scale-98 flex items-center justify-between ${
                            isCurrent
                              ? "bg-zinc-100 border-black"
                              : "bg-white hover:bg-zinc-100 border-black"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 pr-2">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-black text-white shrink-0 border border-black">
                              {code}
                            </span>
                            <span className="text-xs font-bold text-black truncate">
                              {title}
                            </span>
                          </div>
                          {isCurrent ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-black shrink-0" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-black shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div
              className="p-3 bg-white border-t-2 border-black text-center text-[10px] font-bold text-black shrink-0"
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
