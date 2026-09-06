import React from "react";
import { PWAInstallModal } from "./PWAInstallModal";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
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
  Smartphone,
  Share2,
  MessageSquare,
} from "lucide-react";
import { ProgramSearchResult, DayData } from "../types/timetable";
import { generateLessonsIcs, downloadIcsFile } from "../services/icalExport";
import { parseProgramCodeAndTitle } from "../services/transformer";
import { triggerHapticFeedback } from "../services/haptics";
import { StorageService } from "../services/storage";
import { useTheme, THEME_OPTIONS } from "../hooks/useTheme";
import { usePWAInstall } from "../hooks/usePWAInstall";

// Cute half-length single wavy line divider
const CuteWavyDivider: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div
    className={`flex items-center justify-center gap-2.5 py-1.5 select-none pointer-events-none ${className}`}
    aria-hidden="true"
  >
    {/* Cute Left Sparkle Star */}
    <svg className="w-2.5 h-2.5 text-indigo-400/80 dark:text-indigo-300/80 shrink-0 animate-pulse" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
    </svg>

    {/* Half-length cute single wavy line */}
    <div className="w-1/2 max-w-[140px] flex items-center justify-center">
      <svg className="w-full h-2.5 overflow-visible" viewBox="0 0 128 10" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="cuteWaveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="50%" stopColor="#c084fc" />
            <stop offset="100%" stopColor="#f472b6" />
          </linearGradient>
        </defs>
        <path
          d="M 4 5 Q 16 1, 28 5 T 52 5 T 76 5 T 100 5 T 124 5"
          stroke="url(#cuteWaveGrad)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    </div>

    {/* Cute Right Sparkle Star */}
    <svg className="w-2.5 h-2.5 text-pink-400/80 dark:text-pink-300/80 shrink-0 animate-pulse" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
    </svg>
  </div>
);

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
  const { isInstalled, installApp, canPromptNatively, browserEnv } = usePWAInstall();
  const [showInstallGuide, setShowInstallGuide] = React.useState(false);
  const [isMoreOpen, setIsMoreOpen] = React.useState(false);
  const [isAboutOpen, setIsAboutOpen] = React.useState(false);
  const mainDragControls = useDragControls();
  const moreDragControls = useDragControls();
  const aboutDragControls = useDragControls();

  React.useEffect(() => {
    if (!isOpen) {
      setIsMoreOpen(false);
      setIsAboutOpen(false);
    }
  }, [isOpen]);

  // Keyboard accessibility: Escape cleanly steps back or closes
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isAboutOpen) {
          setIsAboutOpen(false);
        } else if (isMoreOpen) {
          setIsMoreOpen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isMoreOpen, isAboutOpen, onClose]);



  const { code: shortCode, title: programTitle } = parseProgramCodeAndTitle(
    selectedProgram.Name,
    selectedProgram.Description
  );

  // Export full week schedule to .ics
  const handleExportWeekIcs = () => {
    const allLessons = weekSchedule.flatMap((d) => d.lessons);
    if (allLessons.length === 0) return;

    const fullIcs = generateLessonsIcs(allLessons);
    downloadIcsFile(`timetable_${shortCode.replace(/[^a-z0-9]/gi, "_")}.ics`, fullIcs);
    triggerHapticFeedback();
  };

  const [shareCopied, setShareCopied] = React.useState(false);

  const handleShareWithFriend = async () => {
    triggerHapticFeedback();
    const shareData = {
      title: "MyTimetable",
      text: "Fast, offline-ready timetable for university classes and lectures!",
      url: window.location.origin || window.location.href,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err: any) {
        if (err?.name === "AbortError") return;
      }
    }
    const targetUrl = window.location.origin || window.location.href;
    if (navigator?.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(targetUrl);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
        return;
      } catch {}
    }
    try {
      const el = document.createElement("textarea");
      el.value = targetUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {}
  };

  return (
    <>
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
                  scale: 1,
                  opacity: 1,
                },
                visible: {
                  y: 0,
                  scale: 1,
                  opacity: 1,
                  transition: {
                    type: "tween",
                    ease: [0.16, 1, 0.3, 1], // Smooth cubic ease-out without overshoot or bounce
                    duration: 0.3,
                  },
                },
                stacked: {
                  y: 12,
                  scale: 0.95,
                  opacity: 0.65,
                  transition: {
                    type: "tween",
                    ease: [0.16, 1, 0.3, 1],
                    duration: 0.25,
                  },
                },
                exit: {
                  y: "100%",
                  scale: 1,
                  opacity: 1,
                  transition: {
                    type: "tween",
                    ease: [0.32, 0, 0.67, 0],
                    duration: 0.2,
                  },
                },
              }}
              initial="hidden"
              animate={isMoreOpen || isAboutOpen ? "stacked" : "visible"}
              exit="exit"
              drag="y"
              dragListener={false}
              dragControls={mainDragControls}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.4 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 80 || info.velocity.y > 320) {
                  triggerHapticFeedback();
                  onClose();
                }
              }}
              className="relative z-10 w-full sm:max-w-md h-[88dvh] max-h-[88dvh] bg-black rounded-t-3xl sm:rounded-2xl border border-white/20 overflow-hidden flex flex-col shadow-2xl"
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

              {/* Preference Drawer Header Area */}
              <div className="preference-drawer-header shrink-0 relative z-10 select-none">
                {/* Big Minimise Handle at the Top */}
                <motion.div
                  onPointerDown={(e) => mainDragControls.start(e)}
                  onClick={() => {
                    triggerHapticFeedback();
                    onClose();
                  }}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.92 }}
                  className="w-full pt-3.5 pb-2 cursor-grab active:cursor-grabbing touch-none flex flex-col items-center justify-center group transition-transform shrink-0 relative z-10"
                  title="Tap or drag down to minimise"
                >
                  <div className="w-20 h-2 bg-zinc-600 group-hover:bg-zinc-500 rounded-full transition-colors shadow-xs preference-drawer-handle" />
                </motion.div>

                {/* Drawer Header */}
                <div className="px-4 py-3 border-b border-white/15 flex items-center justify-between shrink-0 bg-black/85 backdrop-blur-md relative z-10 preference-drawer-bar">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-zinc-800 text-white border border-zinc-700 flex items-center justify-center shrink-0 preference-drawer-icon-box">
                      <GraduationCap className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="font-black text-lg sm:text-xl text-white tracking-tight leading-none m-0 p-0 preference-drawer-title">
                      Preference
                    </h2>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isOffline && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border border-white/20 bg-zinc-900 text-white font-bold">
                        <WifiOff className="w-2.5 h-2.5 text-white" />
                        Offline
                      </span>
                    )}
                    <button
                      onClick={onClose}
                      onPointerDown={(e) => e.stopPropagation()}
                      onTouchStart={(e) => e.stopPropagation()}
                      className="p-1.5 rounded-xl text-white border border-white/20 hover:bg-zinc-900 active:scale-95 transition-all preference-drawer-close-btn cursor-pointer"
                      title="Close"
                    >
                      <X className="w-5 h-5 text-white" />
                    </button>
                  </div>
                </div>
              </div>

            {/* Drawer Scrollable Body */}
            <div
              className="flex-1 overflow-y-auto overscroll-contain px-4 pt-4 pb-0 space-y-4 no-scrollbar bg-transparent relative z-10 flex flex-col touch-pan-y"
            >
              {/* Active Course Card */}
              <div
                className={`transition-all duration-300 transform ${
                  isOpen ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
                }`}
              >
                <div className="text-[11px] font-black text-white uppercase tracking-wider mb-1.5">
                  Current Course
                </div>
                <div className="p-3.5 rounded-xl bg-zinc-950 border border-white/20 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-zinc-800 text-zinc-100 border border-zinc-700">
                      {shortCode}
                    </span>
                    <span className="text-[11px] font-bold text-zinc-400">
                      {StorageService.getActiveUniversityId() === "dcu" ? "DCU" : "TU Dublin"}
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
                    className="w-full mt-1.5 py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 border border-zinc-600 shadow-sm active:scale-98 transition-all"
                  >
                    <Search className="w-3.5 h-3.5 text-white" />
                    Change Degree / Course
                  </button>
                </div>
              </div>

              {/* Cute Wavy Lines Divider in Middle of Settings */}
              <CuteWavyDivider />

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

                {/* Theme Selector: Dark, Light, Zara */}
                <div className="grid grid-cols-3 gap-2">
                  {THEME_OPTIONS.map((opt) => {
                    const isSelected = themeMode === opt.id;
                    const Icon = opt.id === "dark" ? Moon : opt.id === "zara" ? Sparkles : Sun;

                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setThemeMode(opt.id);
                          triggerHapticFeedback();
                        }}
                        className={`p-2 sm:p-2.5 rounded-xl border transition-all active:scale-95 flex items-center justify-between text-left ${
                          isSelected
                            ? "bg-zinc-800 text-white border-white/40 shadow-xs ring-1 ring-white/30"
                            : "bg-zinc-950 hover:bg-zinc-900 border-white/20 text-white"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          {/* Mini Palette Swatch */}
                          <div
                            className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border shrink-0 flex items-center justify-center shadow-xs"
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
                          <div className="text-xs font-black truncate flex items-center gap-1">
                            <Icon className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{opt.label}</span>
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

              {/* Quick Actions Grouped Box */}
              <div className="pt-2 transition-all duration-300">
                <div className="rounded-xl bg-zinc-950 border border-white/20 overflow-hidden divide-y divide-white/10 shadow-xs">
                  {/* Row 1: Install App */}
                  <button
                    type="button"
                    onClick={async () => {
                      triggerHapticFeedback();
                      if (canPromptNatively) {
                        await installApp();
                      } else {
                        setShowInstallGuide(true);
                      }
                    }}
                    className="w-full p-3 hover:bg-zinc-900/80 flex items-center justify-between text-left transition-all active:bg-zinc-900 group cursor-pointer"
                    title={isInstalled ? "App is already installed" : "Install MyTimetable as an App"}
                  >
                    <div className="flex items-center gap-2.5 pl-1 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-zinc-800 text-white border border-zinc-700 flex items-center justify-center shrink-0 shadow-xs">
                        {isInstalled ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Smartphone className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
                        )}
                      </div>
                      <span className="text-xs sm:text-sm font-black text-white leading-tight truncate">
                        {isInstalled ? "App Installed" : "Install App"}
                      </span>
                    </div>
                    <div className="pr-1 flex items-center shrink-0">
                      {isInstalled ? (
                        <span className="text-[10px] font-bold py-0.5 px-2 rounded-md bg-emerald-950/80 border border-emerald-500/40 text-emerald-300">
                          Active
                        </span>
                      ) : (
                        <Download className="w-4 h-4 text-white group-hover:translate-y-0.5 transition-transform" />
                      )}
                    </div>
                  </button>

                  {/* Row 2: Share with friend */}
                  <button
                    type="button"
                    onClick={handleShareWithFriend}
                    className="w-full p-3 hover:bg-zinc-900/80 flex items-center justify-between text-left transition-all active:bg-zinc-900 group cursor-pointer"
                    title="Share MyTimetable with a friend"
                  >
                    <div className="flex items-center gap-2.5 pl-1 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-zinc-800 text-white border border-zinc-700 flex items-center justify-center shrink-0 shadow-xs">
                        {shareCopied ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Share2 className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
                        )}
                      </div>
                      <span className="text-xs sm:text-sm font-black text-white leading-tight truncate">
                        {shareCopied ? "Link Copied!" : "Share with friend"}
                      </span>
                    </div>
                    <div className="pr-1 flex items-center shrink-0">
                      {shareCopied ? (
                        <span className="text-[10px] font-bold py-0.5 px-2 rounded-md bg-emerald-950/80 border border-emerald-500/40 text-emerald-300">
                          Copied!
                        </span>
                      ) : (
                        <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-white group-hover:translate-x-0.5 transition-transform" />
                      )}
                    </div>
                  </button>

                  {/* Row 3: Tell your concerns */}
                  <a
                    href="https://forms.gle/ysT2eijFZoxq9qFF9"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => triggerHapticFeedback()}
                    className="w-full p-3 hover:bg-zinc-900/80 flex items-center justify-between text-left transition-all active:bg-zinc-900 group cursor-pointer no-underline"
                    title="Tell your concerns or report feedback"
                  >
                    <div className="flex items-center gap-2.5 pl-1 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-zinc-800 text-white border border-zinc-700 flex items-center justify-center shrink-0 shadow-xs">
                        <MessageSquare className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
                      </div>
                      <span className="text-xs sm:text-sm font-black text-white leading-tight truncate">
                        Tell your concerns
                      </span>
                    </div>
                    <div className="pr-1 flex items-center shrink-0">
                      <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-white group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </a>
                </div>
              </div>

              {/* "More Options" Grouped Box */}
              <div className="pt-2 transition-all duration-300">
                <div className="text-[11px] font-black text-white uppercase tracking-wider mb-1.5 px-0.5">
                  More Options
                </div>
                <div className="rounded-xl bg-zinc-950 border border-white/20 overflow-hidden divide-y divide-white/10 shadow-xs">
                  {/* Row 1: More */}
                  <button
                    type="button"
                    onClick={() => {
                      triggerHapticFeedback();
                      setIsMoreOpen(true);
                    }}
                    className="w-full p-3 hover:bg-zinc-900/80 flex items-center justify-between text-left transition-all active:bg-zinc-900 group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 pl-1 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-zinc-800 text-white border border-zinc-700 flex items-center justify-center shrink-0 shadow-xs">
                        <MoreHorizontal className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
                      </div>
                      <span className="text-xs sm:text-sm font-black text-white leading-tight truncate">
                        More
                      </span>
                    </div>
                    <div className="pr-1.5 flex items-center shrink-0">
                      <ChevronRight className="w-4 h-4 text-white group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </button>

                  {/* Row 2: About Me */}
                  <button
                    type="button"
                    onClick={() => {
                      triggerHapticFeedback();
                      setIsAboutOpen(true);
                    }}
                    className="w-full p-3 hover:bg-zinc-900/80 flex items-center justify-between text-left transition-all active:bg-zinc-900 group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 pl-1 min-w-0">
                      <div className="w-7 h-7 rounded-lg overflow-hidden border border-zinc-700 shrink-0 bg-zinc-800 flex items-center justify-center shadow-xs">
                        <img
                          src="/rick-about.png"
                          alt="Rick"
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                        />
                      </div>
                      <span className="text-xs sm:text-sm font-black text-white leading-tight truncate">
                        About Me
                      </span>
                    </div>
                    <div className="pr-1.5 flex items-center shrink-0">
                      <ChevronRight className="w-4 h-4 text-white group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </button>
                </div>
              </div>

              {/* Independent Student Project Disclaimer */}
              <div className="pt-3.5 px-2 text-center select-text">
                <p className="text-[10.5px] leading-relaxed text-zinc-400 font-medium">
                  MyTimetable is an independent, open-source student companion app and is not officially affiliated with or endorsed by TU Dublin, DCU, or Scientia.
                </p>
              </div>

              {/* Rick & Morty Peeking Sticker Attached to Bottom */}
              <div
                className="mt-auto pt-6 flex justify-center items-end select-none pointer-events-none overflow-hidden -mx-4 -mb-px shrink-0 leading-none"
              >
                <img
                  src="/rick-morty-clean.png?v=2"
                  alt="Rick and Morty"
                  className="w-48 sm:w-56 max-w-[240px] object-contain select-none pointer-events-none block translate-y-1"
                  loading="eager"
                />
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>

    {/* Secondary "More Settings" Bottom Sheet (Jumps up from bottom IN FRONT with background blur) */}
    <AnimatePresence>
      {isOpen && isMoreOpen && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden pointer-events-auto select-none">
          {/* Backdrop for "More" with background blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/75 backdrop-blur-md cursor-pointer drawer-backdrop"
            onClick={() => setIsMoreOpen(false)}
            onTouchEnd={(e) => {
              e.preventDefault();
              setIsMoreOpen(false);
            }}
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
            dragListener={false}
            dragControls={moreDragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 80 || info.velocity.y > 320) {
                triggerHapticFeedback();
                setIsMoreOpen(false);
              }
            }}
            className="relative z-[80] w-full sm:max-w-md h-[88dvh] max-h-[88dvh] bg-black rounded-t-3xl sm:rounded-2xl border border-white/20 overflow-hidden flex flex-col shadow-2xl"
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

                  {/* More Settings Drawer Header Area */}
                  <div className="preference-drawer-header shrink-0 relative z-10 select-none">
                    {/* Minimise Handle at the Top */}
                    <motion.div
                      onPointerDown={(e) => moreDragControls.start(e)}
                      onClick={() => {
                        triggerHapticFeedback();
                        setIsMoreOpen(false);
                      }}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.92 }}
                      className="w-full pt-3.5 pb-2 cursor-grab active:cursor-grabbing touch-none flex flex-col items-center justify-center group transition-transform shrink-0 relative z-10"
                      title="Tap or drag down to minimise"
                    >
                      <div className="w-20 h-2 bg-zinc-600 group-hover:bg-zinc-500 rounded-full transition-colors shadow-xs preference-drawer-handle" />
                    </motion.div>

                    {/* Drawer Header */}
                    <div className="px-4 py-3 border-b border-white/15 flex items-center justify-between shrink-0 bg-black/85 backdrop-blur-md relative z-10 preference-drawer-bar min-h-[54px]">
                      <button
                        onClick={() => {
                          triggerHapticFeedback();
                          setIsMoreOpen(false);
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        className="flex items-center gap-1.5 text-xs font-bold py-1 px-2.5 rounded-xl border border-white/20 hover:bg-zinc-900 text-white transition-colors preference-drawer-back-btn cursor-pointer relative z-10"
                        title="Back to preferences"
                      >
                        <ChevronLeft className="w-3.5 h-3.5 text-white" />
                        <span>Back</span>
                      </button>

                      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none select-none">
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
                        onPointerDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        className="p-1.5 rounded-xl text-white border border-white/20 hover:bg-zinc-900 active:scale-95 transition-all preference-drawer-close-btn cursor-pointer relative z-10"
                        title="Close"
                      >
                        <X className="w-5 h-5 text-white" />
                      </button>
                    </div>
                  </div>

                  {/* More Drawer Scrollable Body */}
                  <div
                    className="flex-1 overflow-y-auto overscroll-contain px-4 pt-4 pb-0 space-y-4 no-scrollbar bg-transparent relative z-10 flex flex-col touch-pan-y"
                  >
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
                          className="p-3 rounded-xl bg-zinc-950 hover:bg-zinc-900 border border-white/20 text-left transition-all active:scale-95 flex flex-col justify-between h-20 group shadow-xs"
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
                          className="p-3 rounded-xl bg-zinc-950 hover:bg-zinc-900 border border-white/20 text-left transition-all active:scale-95 flex flex-col justify-between h-20 disabled:opacity-50 group shadow-xs"
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

                    {/* Cute Wavy Lines Divider in Middle of More Settings */}
                    <CuteWavyDivider />

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
                        className="w-full p-3 rounded-xl bg-zinc-950 hover:bg-zinc-900 border border-white/20 flex items-center justify-between text-left transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-zinc-800 text-white border border-zinc-700 flex items-center justify-center shrink-0">
                            <Compass className="w-4 h-4 text-white" />
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
                        className="w-full p-3 rounded-xl bg-zinc-950 hover:bg-zinc-900 border border-white/20 flex items-center justify-between text-left transition-all active:scale-98 group shadow-xs"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-zinc-800 text-white border border-zinc-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                            <Calendar className="w-4 h-4 text-white" />
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
                                className={`w-full text-left p-2.5 rounded-xl border transition-all active:scale-98 flex items-center justify-between ${
                                  isCurrent
                                    ? "bg-zinc-900 border-white/40"
                                    : "bg-zinc-950 hover:bg-zinc-900 border-white/20"
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0 pr-2">
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-100 shrink-0 border border-zinc-700">
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

                    {/* Independent Student Project Disclaimer */}
                    <div className="pt-2 px-2 text-center select-text">
                      <p className="text-[10px] leading-relaxed text-zinc-500 font-medium">
                        MyTimetable is an independent, open-source student companion app and is not officially affiliated with or endorsed by TU Dublin, DCU, or Scientia.
                      </p>
                    </div>

                    {/* Rick & Morty Peeking Sticker Attached to Bottom */}
                    <div
                      className="mt-auto pt-6 flex justify-center items-end select-none pointer-events-none overflow-hidden -mx-4 -mb-px shrink-0 leading-none"
                    >
                      <img
                        src="/rick-morty-clean.png?v=2"
                        alt="Rick and Morty"
                        className="w-48 sm:w-56 max-w-[240px] object-contain select-none pointer-events-none block translate-y-1"
                        loading="eager"
                      />
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

      {/* Secondary "About Me" Bottom Sheet (Jumps up from bottom IN FRONT with background blur) */}
      <AnimatePresence>
        {isOpen && isAboutOpen && (
          <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden pointer-events-auto select-none">
            {/* Backdrop for "About Me" with background blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/75 backdrop-blur-md cursor-pointer drawer-backdrop"
              onClick={() => setIsAboutOpen(false)}
              onTouchEnd={(e) => {
                e.preventDefault();
                setIsAboutOpen(false);
              }}
            />

            {/* About Sheet Container */}
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
              dragListener={false}
              dragControls={aboutDragControls}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.4 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 60 || info.velocity.y > 250) {
                  triggerHapticFeedback();
                  setIsAboutOpen(false);
                }
              }}
              className="relative z-[80] w-full sm:max-w-md h-[88dvh] max-h-[88dvh] bg-black rounded-t-3xl sm:rounded-2xl border border-white/20 overflow-hidden flex flex-col shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Fixed Central Ambient Glow */}
              <div
                className="absolute inset-0 pointer-events-none overflow-hidden z-0 select-none flex items-center justify-center"
                aria-hidden="true"
              >
                <div
                  className="w-[320px] h-[320px] sm:w-[400px] sm:h-[400px] rounded-full blur-3xl opacity-85"
                  style={{
                    background:
                      "radial-gradient(circle, rgba(56, 189, 248, 0.32) 0%, rgba(99, 102, 241, 0.22) 35%, rgba(168, 85, 247, 0.12) 55%, transparent 72%)",
                  }}
                />
                <div
                  className="absolute w-[280px] h-[280px] sm:w-[350px] sm:h-[350px] rounded-full blur-2xl opacity-75"
                  style={{
                    background:
                      "radial-gradient(circle, rgba(34, 197, 94, 0.24) 0%, rgba(56, 189, 248, 0.15) 45%, transparent 70%)",
                    transform: "translate(-10px, -20px)",
                  }}
                />
              </div>

              {/* About Drawer Header Area */}
              <div className="preference-drawer-header shrink-0 relative z-10 select-none">
                {/* Minimise Handle */}
                <motion.div
                  onPointerDown={(e) => aboutDragControls.start(e)}
                  onClick={() => {
                    triggerHapticFeedback();
                    setIsAboutOpen(false);
                  }}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.92 }}
                  className="w-full pt-3.5 pb-2 cursor-grab active:cursor-grabbing touch-none flex flex-col items-center justify-center group transition-transform shrink-0 relative z-10"
                  title="Tap or drag down to minimise"
                >
                  <div className="w-20 h-2 bg-zinc-600 group-hover:bg-zinc-500 rounded-full transition-colors shadow-xs preference-drawer-handle" />
                </motion.div>

                {/* Header Bar */}
                <div className="px-4 py-3 border-b border-white/15 flex items-center justify-between shrink-0 bg-black/85 backdrop-blur-md relative z-10 preference-drawer-bar min-h-[54px]">
                  <button
                    onClick={() => {
                      triggerHapticFeedback();
                      setIsAboutOpen(false);
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    className="flex items-center gap-1.5 text-xs font-bold py-1 px-2.5 rounded-xl border border-white/20 hover:bg-zinc-900 text-white transition-colors preference-drawer-back-btn cursor-pointer relative z-10"
                    title="Back to preferences"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 text-white" />
                    <span>Back</span>
                  </button>

                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none select-none">
                    <span className="font-black text-sm text-white block leading-none">
                      About Me
                    </span>
                    <span className="text-[10px] font-bold text-zinc-400">Rick Sanchez</span>
                  </div>

                  <button
                    onClick={() => {
                      setIsAboutOpen(false);
                      onClose();
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    className="p-1.5 rounded-xl text-white border border-white/20 hover:bg-zinc-900 active:scale-95 transition-all preference-drawer-close-btn cursor-pointer relative z-10"
                    title="Close"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>

              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto overscroll-contain px-5 pt-4 pb-12 space-y-4 no-scrollbar bg-transparent relative z-10 flex flex-col touch-pan-y scroll-smooth">
                {/* Hero Avatar Card */}
                <div className="flex flex-col items-center text-center pt-2">
                  <div className="relative mb-3 group">
                    <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl overflow-hidden border-2 border-white/30 shadow-2xl bg-zinc-900 ring-4 ring-cyan-500/25">
                      <img
                        src="/rick-about.png"
                        alt="Rick Sanchez"
                        className="w-full h-full object-cover select-none"
                      />
                    </div>
                    <div className="absolute -bottom-2 -right-1 px-2.5 py-0.5 rounded-full bg-zinc-900 border border-white/30 text-[10px] font-black text-cyan-300 shadow-md flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-cyan-400 animate-pulse" />
                      <span>C-137</span>
                    </div>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
                    Rick Sanchez
                  </h3>
                  <p className="text-xs font-semibold text-zinc-400 mt-1">
                    Scientist. Whatever.
                  </p>
                </div>

                <CuteWavyDivider />

                {/* Intro Text Paragraphs */}
                <div className="space-y-2.5 text-xs sm:text-[13px] text-zinc-200 leading-relaxed font-medium">
                  <div className="p-3.5 rounded-2xl bg-zinc-950 border border-white/15 shadow-xs">
                    Okay, phase coupler at forty-two percent, voltage regulator’s drifting again because apparently this piece of shit was assembled by blind fucking monkeys. Morty, don’t touch the blue wire. No, seriously, keep your dumb little hands off it unless you want the field geometry to fold in on itself and turn this whole garage into a screaming ball of plasma.
                  </div>

                  <div className="p-3.5 rounded-2xl bg-zinc-950 border border-white/15 shadow-xs">
                    Flux gate stable... barely. Oscillator’s off by point-zero-three. Fuck it, compensate through the secondary coil, drop resistance by six ohms, reroute through the auxiliary bus... there.
                  </div>

                  <div className="p-3.5 rounded-2xl bg-zinc-950 border border-white/15 shadow-xs space-y-2">
                    <p className="font-semibold text-zinc-300">Why the fuck is the heat sink vibrating?</p>
                    <p className="text-zinc-400">Oh, good. Fantastic. Love that.</p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-zinc-950 border border-white/15 shadow-xs">
                    Kill the feedback loop before this bastard starts cooking itself, isolate the quantum relay, bypass the fried regulator, and if that capacitor pops again I’m throwing this whole goddamn thing into another dimension.
                  </div>

                  <div className="p-3.5 rounded-2xl bg-zinc-950 border border-white/15 shadow-xs space-y-1.5 font-semibold text-zinc-300">
                    <p>Morty, hand me the micro-driver.</p>
                    <p>The small one.</p>
                    <p className="text-red-400 font-bold">No, the fucking small one.</p>
                    <p className="text-zinc-400 italic">Jesus fucking Christ.</p>
                  </div>
                </div>

                {/* Rick & Morty Peeking Sticker Attached to Bottom */}
                <div
                  className="pt-6 pb-4 flex justify-center items-end select-none pointer-events-none overflow-hidden -mx-5 -mb-px shrink-0 leading-none"
                >
                  <img
                    src="/rick-morty-clean.png?v=2"
                    alt="Rick and Morty"
                    className="w-48 sm:w-56 max-w-[240px] object-contain select-none pointer-events-none block translate-y-1"
                    loading="eager"
                  />
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PWA Install Guide for unsupported browsers (Safari, Firefox, etc.) */}
      <PWAInstallModal
        isOpen={showInstallGuide}
        onClose={() => setShowInstallGuide(false)}
        browserEnv={browserEnv}
      />
    </>
  );
};
