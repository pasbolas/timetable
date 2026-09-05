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
  ChevronLeft,
  Download,
  GraduationCap,
  Sun,
  Moon,
  Palette,
  Check,
  MoreHorizontal,
} from "lucide-react";
import { ProgramSearchResult, DayData } from "../types/timetable";
import { generateLessonIcs, downloadIcsFile } from "../services/icalExport";
import { parseProgramCodeAndTitle } from "../services/transformer";
import { triggerHapticFeedback } from "../services/haptics";
import { useTheme, THEME_OPTIONS } from "../hooks/useTheme";

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
  const { themeMode, setThemeMode } = useTheme();
  const [isMoreOpen, setIsMoreOpen] = React.useState(false);

  React.useEffect(() => {
    if (!isOpen) {
      setIsMoreOpen(false);
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
    triggerHapticFeedback();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden pointer-events-auto select-none">
          {/* Backdrop with fade transition & background blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md cursor-pointer drawer-backdrop"
            onClick={onClose}
          />

          {/* Clean Bottom Sheet */}
          <motion.div
            variants={{
              hidden: {
                y: "100%",
              },
              visible: {
                y: 0,
                transition: {
                  type: "tween",
                  ease: [0.16, 1, 0.3, 1], // Smooth cubic ease-out without overshoot or bounce
                  duration: 0.3,
                },
              },
              exit: {
                y: "100%",
                transition: {
                  type: "tween",
                  ease: [0.32, 0, 0.67, 0],
                  duration: 0.2,
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
            className="relative z-10 w-full sm:max-w-md h-[88dvh] max-h-[88dvh] bg-black rounded-t-3xl sm:rounded-2xl border-2 border-white overflow-hidden flex flex-col touch-pan-y"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Fixed Central Ambient Glow matching reference design */}
            <div
              className="absolute inset-0 pointer-events-none overflow-hidden z-0 select-none flex items-center justify-center"
              aria-hidden="true"
            >
              {/* Primary Radial Glow Core */}
              <div
                className="w-[320px] h-[320px] sm:w-[400px] sm:h-[400px] rounded-full blur-3xl opacity-85"
                style={{
                  background:
                    "radial-gradient(circle, rgba(99, 102, 241, 0.32) 0%, rgba(147, 130, 255, 0.22) 35%, rgba(196, 181, 253, 0.12) 55%, transparent 72%)",
                }}
              />
              {/* Secondary Soft Blue Accent Glow */}
              <div
                className="absolute w-[280px] h-[280px] sm:w-[350px] sm:h-[350px] rounded-full blur-2xl opacity-75"
                style={{
                  background:
                    "radial-gradient(circle, rgba(96, 165, 250, 0.26) 0%, rgba(147, 197, 253, 0.15) 45%, transparent 70%)",
                  transform: "translate(10px, 20px)",
                }}
              />
            </div>

            {/* Big Minimise Handle at the Top */}
            <motion.div
              onClick={() => {
                triggerHapticFeedback();
                onClose();
              }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.92 }}
              className="w-full pt-3.5 pb-2 cursor-pointer flex flex-col items-center justify-center group transition-transform shrink-0 relative z-10"
              title="Tap or drag down to minimise"
            >
              <div className="w-20 h-2 bg-white group-hover:bg-zinc-300 rounded-full transition-colors shadow-xs" />
            </motion.div>

            {/* Drawer Header */}
            <div className="px-4 py-3 border-b-2 border-white flex items-center justify-between shrink-0 bg-black/85 backdrop-blur-md relative z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-white text-black flex items-center justify-center">
                  <GraduationCap className="w-4 h-4 text-black" />
                </div>
                <div>
                  <span className="font-black text-sm text-white block leading-none">
                    Preferences & Menu
                  </span>
                  <span className="text-[10px] font-bold text-zinc-400">Timetable options</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {isOffline && (
                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border border-white bg-black text-white font-bold">
                    <WifiOff className="w-2.5 h-2.5 text-white" />
                    Offline
                  </span>
                )}
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-xl text-white border border-white hover:bg-zinc-900 active:scale-95 transition-all"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* Drawer Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar bg-transparent relative z-10">
              {/* Active Course Card */}
              <div
                className={`transition-all duration-300 transform ${
                  isOpen ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
                }`}
              >
                <div className="text-[11px] font-black text-white uppercase tracking-wider mb-1.5">
                  Current Course
                </div>
                <div className="p-3.5 rounded-xl bg-black border-2 border-white space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-white text-black border border-white">
                      {shortCode}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-white line-clamp-2">
                    {programTitle}
                  </div>
                  <button
                    onClick={() => {
                      onClose();
                      onOpenSearch();
                    }}
                    className="w-full mt-1.5 py-2 px-3 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold flex items-center justify-center gap-1.5 border-2 border-white shadow-sm active:scale-98 transition-all"
                  >
                    <Search className="w-3.5 h-3.5 text-black" />
                    Change Degree / Course
                  </button>
                </div>
              </div>

              {/* Colour Mode Switcher */}
              <div className="transition-all duration-300">
                <div className="flex items-center justify-between mb-2 px-0.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-black text-white uppercase tracking-wider">
                    <Palette className="w-3.5 h-3.5 text-white" />
                    <span>Theme</span>
                  </div>
                  <span className="text-[10px] font-bold text-zinc-400 capitalize">
                    {themeMode}
                  </span>
                </div>

                {/* 2-Option Selector: Dark and Light */}
                <div className="grid grid-cols-2 gap-2">
                  {THEME_OPTIONS.filter(o => o.id === 'dark' || o.id === 'light').map((opt) => {
                    const isSelected = themeMode === opt.id;
                    const Icon = opt.id === "dark" ? Moon : Sun;

                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setThemeMode(opt.id);
                          triggerHapticFeedback();
                        }}
                        className={`p-2.5 rounded-xl border-2 transition-all active:scale-95 flex items-center justify-between text-left ${
                          isSelected
                            ? "bg-white text-black border-white shadow-xs ring-1 ring-white/50"
                            : "bg-black hover:bg-zinc-900 border-white text-white"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {/* Mini Palette Swatch */}
                          <div
                            className="w-4 h-4 rounded-full border shrink-0 flex items-center justify-center shadow-xs"
                            style={{
                              backgroundColor: opt.previewBg,
                              borderColor: opt.previewBorder,
                            }}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: opt.previewText }}
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-black truncate flex items-center gap-1">
                              <Icon className="w-3.5 h-3.5" />
                              <span>{opt.label}</span>
                            </div>
                            <div
                              className={`text-[9px] font-semibold truncate ${
                                isSelected ? "text-zinc-600" : "text-zinc-400"
                              }`}
                            >
                              {opt.sublabel}
                            </div>
                          </div>
                        </div>

                        {isSelected && (
                          <Check className="w-3.5 h-3.5 shrink-0 ml-1 stroke-[3]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* "More" Pill Button */}
              <div className="pt-1 transition-all duration-300">
                <div className="text-[11px] font-black text-white uppercase tracking-wider mb-1.5 px-0.5">
                  More Options
                </div>
                <button
                  type="button"
                  onClick={() => {
                    triggerHapticFeedback();
                    setIsMoreOpen(true);
                  }}
                  className="w-full p-3 rounded-full bg-black hover:bg-zinc-900 border-2 border-white flex items-center justify-between text-left transition-all active:scale-98 group shadow-xs"
                >
                  <div className="flex items-center gap-2.5 pl-1.5 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-white text-black flex items-center justify-center shrink-0 shadow-xs">
                      <MoreHorizontal className="w-4 h-4 text-black" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-black text-white leading-tight truncate">
                        More
                      </div>
                      <div className="text-[10px] font-medium text-zinc-400 truncate">
                        Actions, sync, tour & courses
                      </div>
                    </div>
                  </div>
                  <div className="pr-1.5 flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-900 text-white border border-white/30 group-hover:border-white transition-colors">
                      Explore
                    </span>
                    <ChevronRight className="w-4 h-4 text-white group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>
              </div>
            </div>

            {/* Drawer Footer */}
            <div
              className="p-3 bg-black border-t-2 border-white text-center text-[10px] font-bold text-zinc-400 shrink-0"
              style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 12px)" }}
            >
              Scientia Timetabler EU • Dublin (Europe/Dublin)
            </div>
          </motion.div>

          {/* Secondary "More Settings" Bottom Sheet (Jumps up from bottom with background blur) */}
          <AnimatePresence>
            {isMoreOpen && (
              <div className="fixed inset-0 z-60 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden pointer-events-auto select-none">
                {/* Backdrop for "More" with background blur */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/65 backdrop-blur-md cursor-pointer drawer-backdrop"
                  onClick={() => setIsMoreOpen(false)}
                />

                {/* More Sheet Container */}
                <motion.div
                  variants={{
                    hidden: {
                      y: "100%",
                    },
                    visible: {
                      y: 0,
                      transition: {
                        type: "tween",
                        ease: [0.16, 1, 0.3, 1],
                        duration: 0.3,
                      },
                    },
                    exit: {
                      y: "100%",
                      transition: {
                        type: "tween",
                        ease: [0.32, 0, 0.67, 0],
                        duration: 0.2,
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
                      setIsMoreOpen(false);
                    }
                  }}
                  className="relative z-10 w-full sm:max-w-md h-[88dvh] max-h-[88dvh] bg-black rounded-t-3xl sm:rounded-2xl border-2 border-white overflow-hidden flex flex-col touch-pan-y"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Fixed Central Ambient Glow matching reference design */}
                  <div
                    className="absolute inset-0 pointer-events-none overflow-hidden z-0 select-none flex items-center justify-center"
                    aria-hidden="true"
                  >
                    <div
                      className="w-[320px] h-[320px] sm:w-[400px] sm:h-[400px] rounded-full blur-3xl opacity-85"
                      style={{
                        background:
                          "radial-gradient(circle, rgba(99, 102, 241, 0.32) 0%, rgba(147, 130, 255, 0.22) 35%, rgba(196, 181, 253, 0.12) 55%, transparent 72%)",
                      }}
                    />
                    <div
                      className="absolute w-[280px] h-[280px] sm:w-[350px] sm:h-[350px] rounded-full blur-2xl opacity-75"
                      style={{
                        background:
                          "radial-gradient(circle, rgba(96, 165, 250, 0.26) 0%, rgba(147, 197, 253, 0.15) 45%, transparent 70%)",
                        transform: "translate(10px, 20px)",
                      }}
                    />
                  </div>

                  {/* Minimise Handle at the Top */}
                  <motion.div
                    onClick={() => {
                      triggerHapticFeedback();
                      setIsMoreOpen(false);
                    }}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.92 }}
                    className="w-full pt-3.5 pb-2 cursor-pointer flex flex-col items-center justify-center group transition-transform shrink-0 relative z-10"
                    title="Tap or drag down to minimise"
                  >
                    <div className="w-20 h-2 bg-white group-hover:bg-zinc-300 rounded-full transition-colors shadow-xs" />
                  </motion.div>

                  {/* Drawer Header */}
                  <div className="px-4 py-3 border-b-2 border-white flex items-center justify-between shrink-0 bg-black/85 backdrop-blur-md relative z-10">
                    <button
                      onClick={() => {
                        triggerHapticFeedback();
                        setIsMoreOpen(false);
                      }}
                      className="flex items-center gap-1.5 text-xs font-bold py-1 px-2.5 rounded-xl border border-white hover:bg-zinc-900 text-white transition-colors"
                      title="Back to preferences"
                    >
                      <ChevronLeft className="w-3.5 h-3.5 text-white" />
                      <span>Back</span>
                    </button>

                    <div className="text-center">
                      <span className="font-black text-sm text-white block leading-none">
                        More Settings
                      </span>
                      <span className="text-[10px] font-bold text-zinc-400">Additional options</span>
                    </div>

                    <button
                      onClick={() => {
                        setIsMoreOpen(false);
                        onClose();
                      }}
                      className="p-1.5 rounded-xl text-white border border-white hover:bg-zinc-900 active:scale-95 transition-all"
                      title="Close"
                    >
                      <X className="w-5 h-5 text-white" />
                    </button>
                  </div>

                  {/* More Drawer Scrollable Body */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar bg-transparent relative z-10">
                    {/* Quick Actions */}
                    <div className="transition-all duration-300">
                      <div className="text-[11px] font-black text-white uppercase tracking-wider mb-1.5">
                        Actions
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => {
                            onGoToToday();
                            setIsMoreOpen(false);
                            onClose();
                          }}
                          className="p-3 rounded-xl bg-black hover:bg-zinc-900 border-2 border-white text-left transition-all active:scale-95 flex flex-col justify-between h-20 group shadow-xs"
                        >
                          <Sparkles className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
                          <div>
                            <div className="text-xs font-black text-white">
                              Jump to Today
                            </div>
                            <div className="text-[10px] font-medium text-zinc-400">Current day view</div>
                          </div>
                        </button>

                        <button
                          onClick={() => {
                            onRefresh();
                            setIsMoreOpen(false);
                            onClose();
                          }}
                          disabled={isLoading}
                          className="p-3 rounded-xl bg-black hover:bg-zinc-900 border-2 border-white text-left transition-all active:scale-95 flex flex-col justify-between h-20 disabled:opacity-50 group shadow-xs"
                        >
                          <RotateCw
                            className={`w-4 h-4 text-white group-hover:rotate-180 transition-transform duration-500 ${
                              isLoading ? "animate-spin" : ""
                            }`}
                          />
                          <div>
                            <div className="text-xs font-black text-white">
                              Reload Timetable
                            </div>
                            <div className="text-[10px] font-medium text-zinc-400">Fetch latest data</div>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Interactive Feature Tour */}
                    <div className="transition-all duration-300">
                      <div className="text-[11px] font-black text-white uppercase tracking-wider mb-1.5">
                        Guide
                      </div>
                      <button
                        onClick={() => {
                          setIsMoreOpen(false);
                          onClose();
                          onStartTour();
                        }}
                        className="w-full p-3 rounded-xl bg-black hover:bg-zinc-900 border-2 border-white flex items-center justify-between text-left transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-white text-black flex items-center justify-center shrink-0">
                            <Compass className="w-4 h-4 text-black" />
                          </div>
                          <div>
                            <div className="text-xs font-black text-white">
                              Feature Tour & Guide
                            </div>
                            <div className="text-[10px] font-medium text-zinc-400">
                              Interactive walkthrough of features
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-white group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    </div>

                    {/* Export to Calendar */}
                    <div className="transition-all duration-300">
                      <div className="text-[11px] font-black text-white uppercase tracking-wider mb-1.5">
                        Sync
                      </div>
                      <button
                        onClick={handleExportWeekIcs}
                        className="w-full p-3 rounded-xl bg-black hover:bg-zinc-900 border-2 border-white flex items-center justify-between text-left transition-all active:scale-98 group shadow-xs"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-white text-black flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                            <Calendar className="w-4 h-4 text-black" />
                          </div>
                          <div>
                            <div className="text-xs font-black text-white">
                              Export Week to Calendar
                            </div>
                            <div className="text-[10px] font-medium text-zinc-400">Download .ics for Apple / Google Cal</div>
                          </div>
                        </div>
                        <Download className="w-4 h-4 text-white transition-colors" />
                      </button>
                    </div>

                    {/* Recent Programs */}
                    {recentPrograms.length > 1 && (
                      <div className="transition-all duration-300">
                        <div className="text-[11px] font-black text-white uppercase tracking-wider mb-1.5">
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
                                  setIsMoreOpen(false);
                                  onClose();
                                }}
                                className={`w-full text-left p-2.5 rounded-xl border-2 transition-all active:scale-98 flex items-center justify-between ${
                                  isCurrent
                                    ? "bg-zinc-900 border-white"
                                    : "bg-black hover:bg-zinc-900 border-white"
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0 pr-2">
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white text-black shrink-0 border border-white">
                                    {code}
                                  </span>
                                  <span className="text-xs font-bold text-white truncate">
                                    {title}
                                  </span>
                                </div>
                                {isCurrent ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0" />
                                ) : (
                                  <ChevronRight className="w-3.5 h-3.5 text-white shrink-0" />
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
                    className="p-3 bg-black border-t-2 border-white text-center text-[10px] font-bold text-zinc-400 shrink-0"
                    style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 12px)" }}
                  >
                    Scientia Timetabler EU • Dublin (Europe/Dublin)
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      )}
    </AnimatePresence>
  );
};
