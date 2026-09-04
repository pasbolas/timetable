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
      className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b-2 border-black transition-colors select-none"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <div className="max-w-[1600px] h-[58px] mx-auto px-3 sm:px-4 lg:px-6 flex items-center justify-between gap-3">
        {/* Left: Course Chip (Tap opens Menu Drawer) */}
        <button
          onClick={onOpenMenu}
          data-tour="course-chip"
          className="flex items-center gap-2 overflow-hidden text-left py-1 px-2.5 rounded-xl border-2 border-black bg-white hover:bg-zinc-100 active:scale-98 transition-colors group shrink-0 max-w-[260px] sm:max-w-xs md:max-w-[280px] lg:max-w-sm min-w-0"
          title="Open course details and menu"
        >
          <span className="font-bold text-xs shrink-0 cursor-pointer py-0.5 px-2 rounded-full bg-black text-white border border-black">
            {shortCode}
          </span>
          <span className="text-xs font-bold text-black truncate">
            {programTitle}
          </span>
        </button>

        {/* Center (Desktop Only): Week Switcher & Date Range */}
        {activeDate && (
          <div className="hidden md:flex items-center gap-2.5">
            {/* Week Nav Buttons */}
            <div className="flex items-center gap-0.5 bg-zinc-100 p-0.5 rounded-xl border border-black/20">
              <button
                onClick={handlePrevWeek}
                className="p-1 rounded-lg hover:bg-white text-black border border-transparent hover:border-black transition-colors"
                title="Previous week"
              >
                <ChevronLeft className="w-4 h-4 text-black" />
              </button>
              <button
                onClick={handleNextWeek}
                className="p-1 rounded-lg hover:bg-white text-black border border-transparent hover:border-black transition-colors"
                title="Next week"
              >
                <ChevronRight className="w-4 h-4 text-black" />
              </button>
            </div>

            {/* Jump to This Week (if not current week) */}
            {!isTodayActive && (
              <button
                onClick={onGoToToday}
                className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-xl bg-white hover:bg-black hover:text-white text-black border-2 border-black transition-colors shadow-xs"
                title="Jump to current week"
              >
                <Sparkles className="w-3 h-3" />
                <span>Today</span>
              </button>
            )}

            {/* Week Date Range Title */}
            <div className="flex items-center gap-1.5 text-xs lg:text-sm font-black text-black h-5 overflow-hidden">
              <Calendar className="w-3.5 h-3.5 text-black shrink-0 hidden lg:inline-block" />
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={weekStartMoment.format("YYYY-MM-DD")}
                  initial={{ opacity: 0, y: 6, filter: "blur(2px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -6, filter: "blur(2px)" }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="inline-block"
                >
                  {weekStartMoment.format("D MMM")} – {weekEndMoment.format("D MMM YYYY")}
                </motion.span>
              </AnimatePresence>
              <span className="text-xs font-bold text-zinc-500">
                (Week {activeDate.isoWeek()})
              </span>
            </div>
          </div>
        )}

        {/* Right Section */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Desktop Class Count Badge */}
          {weekSchedule && weekSchedule.length > 0 && (
            <span className="hidden md:inline-flex text-xs font-bold px-2.5 py-1 rounded-lg bg-zinc-100 text-black border border-black/20">
              {totalClassesCount} {totalClassesCount === 1 ? "class" : "classes"} scheduled
            </span>
          )}

          {/* Desktop 5 Days / 7 Days Toggle */}
          {onToggleSevenDays && (
            <div className="hidden md:flex items-center rounded-xl border-2 border-black bg-white p-0.5 text-xs font-bold">
              <button
                onClick={() => onToggleSevenDays(false)}
                className={`px-2 py-0.5 rounded-lg transition-colors ${
                  !displaySevenDays
                    ? "bg-black text-white"
                    : "text-black hover:bg-zinc-100"
                }`}
              >
                5 Days
              </button>
              <button
                onClick={() => onToggleSevenDays(true)}
                className={`px-2 py-0.5 rounded-lg transition-colors flex items-center gap-1 ${
                  displaySevenDays
                    ? "bg-black text-white"
                    : "text-black hover:bg-zinc-100"
                }`}
              >
                <span>7 Days</span>
                {hasWeekendClasses && !displaySevenDays && (
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                )}
              </button>
            </div>
          )}

          {/* Offline indicator */}
          {isOffline && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg border-2 border-black bg-white text-black">
              <WifiOff className="w-3 h-3 text-black" />
              Offline
            </span>
          )}

          {/* Mobile Jump to Today (shown only on mobile when not today) */}
          {!isTodayActive && (
            <Button
              size="sm"
              variant="flat"
              onPress={onGoToToday}
              data-tour="today-button"
              startContent={<Sparkles className="w-3.5 h-3.5 text-black" />}
              className="md:hidden h-8 px-2.5 text-xs font-bold rounded-xl min-w-0 bg-white text-black border-2 border-black hover:bg-black hover:text-white transition-colors"
              title="Jump to today"
            >
              Today
            </Button>
          )}

          {/* Expandable Menu Button */}
          <Button
            isIconOnly
            size="sm"
            variant="light"
            onPress={onOpenMenu}
            data-tour="menu-button"
            isLoading={isLoading}
            className="w-8 h-8 rounded-xl text-black border-2 border-black bg-white hover:bg-zinc-100"
            title="Menu & Settings"
          >
            <SlidersHorizontal className="w-4 h-4 text-black" />
          </Button>
        </div>
      </div>
    </header>
  );
};
