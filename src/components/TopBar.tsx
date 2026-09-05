import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import moment from "moment-timezone";
import {
  SlidersHorizontal,
  Sparkles,
  WifiOff,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from "lucide-react";
import { Button } from "@heroui/react";
import { DayData, ProgramSearchResult } from "../types/timetable";
import { parseProgramCodeAndTitle } from "../services/transformer";
import { triggerHapticFeedback } from "../services/haptics";

interface TopBarProps {
  selectedProgram: ProgramSearchResult;
  onOpenMenu: () => void;
  onGoToToday: () => void;
  isTodayActive: boolean;
  isOffline: boolean;
  isLoading: boolean;

  // Desktop Week Navigation & Day View Controls
  activeDate?: moment.Moment;
  onSelectDate?: (date: moment.Moment) => void;
  weekSchedule?: DayData[];
  showSevenDays?: boolean;
  onToggleSevenDays?: (val: boolean) => void;
  hasWeekendClasses?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  selectedProgram,
  onOpenMenu,
  onGoToToday,
  isTodayActive,
  isOffline,
  isLoading,
  activeDate,
  onSelectDate,
  weekSchedule = [],
  showSevenDays = false,
  onToggleSevenDays,
  hasWeekendClasses = false,
}) => {
  const { code: shortCode, title: programTitle } = parseProgramCodeAndTitle(
    selectedProgram.Name,
    selectedProgram.Description
  );

  const displaySevenDays = Boolean(showSevenDays || hasWeekendClasses);

  const displayedDays = useMemo(() => {
    if (!weekSchedule || weekSchedule.length === 0) return [];
    return displaySevenDays ? weekSchedule.slice(0, 7) : weekSchedule.slice(0, 5);
  }, [weekSchedule, displaySevenDays]);

  const totalClassesCount = useMemo(() => {
    return displayedDays.reduce((acc, d) => acc + d.lessons.length, 0);
  }, [displayedDays]);

  const weekStartMoment = useMemo(() => {
    return activeDate
      ? activeDate.clone().startOf("isoWeek")
      : moment().startOf("isoWeek");
  }, [activeDate]);

  const weekEndMoment = useMemo(() => {
    if (!activeDate) return moment().endOf("isoWeek");
    return displaySevenDays
      ? activeDate.clone().endOf("isoWeek")
      : activeDate.clone().startOf("isoWeek").add(4, "days");
  }, [activeDate, displaySevenDays]);

  const handlePrevWeek = () => {
    if (activeDate && onSelectDate) {
      triggerHapticFeedback();
      onSelectDate(activeDate.clone().subtract(1, "week"));
    }
  };

  const handleNextWeek = () => {
    if (activeDate && onSelectDate) {
      triggerHapticFeedback();
      onSelectDate(activeDate.clone().add(1, "week"));
    }
  };

  return (
    <header
      className="sticky top-0 z-30 bg-black border-b border-white/20 transition-colors select-none w-full max-w-full overflow-hidden top-bar-surface"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <div className="max-w-[1600px] h-[58px] mx-auto px-2.5 sm:px-4 lg:px-6 flex items-center justify-between gap-2 sm:gap-3 w-full max-w-full">
        {/* Left: Course Chip (Tap opens Menu Drawer) */}
        <button
          onClick={onOpenMenu}
          data-tour="course-chip"
          className="flex items-center gap-1.5 sm:gap-2 text-left py-1 px-2 sm:px-2.5 rounded-xl border border-white/25 bg-zinc-950 hover:bg-zinc-900 hover:border-white/40 active:scale-98 transition-colors group flex-1 min-w-0 md:max-w-[280px] lg:max-w-sm"
          title="Open course details and menu"
        >
          <span className="font-bold text-xs shrink-0 cursor-pointer py-0.5 px-2 rounded-full bg-zinc-800 text-zinc-100 border border-zinc-700">
            {shortCode}
          </span>
          <span className="text-xs font-bold text-white truncate min-w-0 flex-1">
            {programTitle}
          </span>
        </button>

        {/* Center (Desktop Only): Week Switcher & Date Range */}
        {activeDate && (
          <div className="hidden md:flex items-center gap-2.5">
            {/* Week Nav Buttons */}
            <div className="flex items-center gap-0.5 bg-zinc-900 p-0.5 rounded-xl border border-white/20">
              <button
                onClick={handlePrevWeek}
                className="p-1 rounded-lg hover:bg-zinc-800 text-white border border-transparent hover:border-white/40 transition-colors"
                title="Previous week"
              >
                <ChevronLeft className="w-4 h-4 text-white" />
              </button>
              <button
                onClick={handleNextWeek}
                className="p-1 rounded-lg hover:bg-zinc-800 text-white border border-transparent hover:border-white/40 transition-colors"
                title="Next week"
              >
                <ChevronRight className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Jump to This Week (if not current week) */}
            <AnimatePresence initial={false}>
              {!isTodayActive && (
                <motion.button
                  key="desktop-today-btn"
                  initial={{ width: 0, opacity: 0, scale: 0.8 }}
                  animate={{ width: "auto", opacity: 1, scale: 1 }}
                  exit={{ width: 0, opacity: 0, scale: 0.8 }}
                  transition={{ type: "spring", stiffness: 420, damping: 30 }}
                  onClick={onGoToToday}
                  className="inline-flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-xl bg-[#4ade80] hover:bg-[#86efac] text-black shadow-none border-0 transition-colors cursor-pointer overflow-hidden whitespace-nowrap"
                  title="Jump to current week"
                >
                  <Sparkles className="w-3 h-3 text-black fill-black shrink-0" />
                  <span>Today</span>
                </motion.button>
              )}
            </AnimatePresence>

            {/* Week Date Range Title */}
            <div className="flex items-center gap-1.5 text-xs lg:text-sm font-black text-white h-5 overflow-hidden">
              <Calendar className="w-3.5 h-3.5 text-white shrink-0 hidden lg:inline-block" />
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={weekStartMoment.format("YYYY-MM-DD")}
                  initial={{ opacity: 0, filter: "blur(5px)" }}
                  animate={{ opacity: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, filter: "blur(5px)" }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="inline-block"
                >
                  {weekStartMoment.format("D MMM")} – {weekEndMoment.format("D MMM YYYY")}
                </motion.span>
              </AnimatePresence>
              <span className="text-xs font-bold text-zinc-400">
                (Week {activeDate.isoWeek()})
              </span>
            </div>
          </div>
        )}

        {/* Right Section */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Desktop Class Count Badge */}
          {weekSchedule && weekSchedule.length > 0 && (
            <span className="hidden md:inline-flex text-xs font-bold px-2.5 py-1 rounded-lg bg-zinc-900 text-white border border-white/20">
              {totalClassesCount} {totalClassesCount === 1 ? "class" : "classes"} scheduled
            </span>
          )}

          {/* Desktop 5 Days / 7 Days Toggle */}
          {onToggleSevenDays && (
            <div className="hidden md:flex items-center rounded-xl border border-white/20 bg-zinc-950 p-0.5 text-xs font-bold">
              <button
                onClick={() => onToggleSevenDays(false)}
                className={`px-2 py-0.5 rounded-lg transition-colors ${
                  !displaySevenDays
                    ? "bg-zinc-800 text-white border border-zinc-700"
                    : "text-white hover:bg-zinc-900"
                }`}
              >
                5 Days
              </button>
              <button
                onClick={() => onToggleSevenDays(true)}
                className={`px-2 py-0.5 rounded-lg transition-colors flex items-center gap-1 ${
                  displaySevenDays
                    ? "bg-zinc-800 text-white border border-zinc-700"
                    : "text-white hover:bg-zinc-900"
                }`}
              >
                <span>7 Days</span>
                {hasWeekendClasses && !displaySevenDays && (
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                )}
              </button>
            </div>
          )}

          {/* Offline indicator */}
          {isOffline && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg border border-white/20 bg-zinc-950 text-white">
              <WifiOff className="w-3 h-3 text-white" />
              Offline
            </span>
          )}

          {/* Mobile Jump to Today (animated growing from nothing when not on today) */}
          <AnimatePresence initial={false}>
            {!isTodayActive && (
              <motion.div
                key="mobile-today-anim-wrapper"
                initial={{ width: 0, opacity: 0, scale: 0.85, marginRight: -8 }}
                animate={{ width: "auto", opacity: 1, scale: 1, marginRight: 0 }}
                exit={{ width: 0, opacity: 0, scale: 0.85, marginRight: -8 }}
                transition={{
                  type: "spring",
                  stiffness: 420,
                  damping: 30,
                  mass: 0.8,
                }}
                className="overflow-hidden md:hidden shrink-0 flex items-center origin-right"
              >
                <button
                  onClick={onGoToToday}
                  data-tour="today-button"
                  className="h-8 px-2.5 text-xs font-black rounded-xl shrink-0 bg-[#4ade80] hover:bg-[#86efac] text-black shadow-none border-0 transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap active:scale-95"
                  title="Jump to today"
                >
                  <Sparkles className="w-3.5 h-3.5 text-black shrink-0 fill-black" />
                  <span>Today</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Expandable Menu Button */}
          <Button
            isIconOnly
            size="sm"
            variant="light"
            onPress={onOpenMenu}
            data-tour="menu-button"
            isLoading={isLoading}
            className="w-8 h-8 rounded-xl text-white border border-white/25 bg-zinc-950 hover:bg-zinc-900 hover:border-white/40 shrink-0"
            title="Menu & Settings"
          >
            <SlidersHorizontal className="w-4 h-4 text-white shrink-0" />
          </Button>
        </div>
      </div>
    </header>
  );
};
