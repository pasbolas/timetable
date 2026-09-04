import React, { useRef, useEffect, useMemo, useCallback, useState } from "react";
import moment from "moment-timezone";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { DayData } from "../types/timetable";
import { TIMETABLE_CONFIG } from "../config/timetableConfig";
import { triggerHapticFeedback } from "../services/haptics";

interface WeekDateStripProps {
  activeDate: moment.Moment;
  onSelectDate: (date: moment.Moment) => void;
  weekSchedule: DayData[];
  currentLiveTime: moment.Moment;
}

const smoothTransition = {
  duration: 0.28,
  ease: [0.16, 1, 0.3, 1],
};

export const WeekDateStrip: React.FC<WeekDateStripProps> = ({
  activeDate,
  onSelectDate,
  weekSchedule,
  currentLiveTime,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isProgrammaticScrollRef = useRef(false);
  const scrollEndTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSelectedDateRef = useRef<string>(activeDate.format("YYYY-MM-DD"));
  const lastHapticDateRef = useRef<string | null>(activeDate.format("YYYY-MM-DD"));
  const tz = TIMETABLE_CONFIG.timezone;

  // Anchor week for the horizontal slider (centers around the selected or initial week)
  const [baseAnchorWeek, setBaseAnchorWeek] = useState(() =>
    activeDate.clone().tz(tz).startOf("isoWeek").format("YYYY-MM-DD")
  );

  // Generate 9 stable weeks (63 days): 4 weeks before anchor, anchor week, 4 weeks after.
  // This ensures normal browsing and scrolling across adjacent weeks never shifts or re-mounts the array.
  const datePills = useMemo(() => {
    const days: moment.Moment[] = [];
    const baseWeekStart = moment.tz(baseAnchorWeek, tz).subtract(4, "weeks");
    for (let i = 0; i < 63; i++) {
      days.push(baseWeekStart.clone().add(i, "days"));
    }
    return days;
  }, [baseAnchorWeek, tz]);

  // Re-anchor only when active date moves beyond 3 weeks from current anchor
  useEffect(() => {
    const activeMoment = activeDate.clone().tz(tz);
    const anchorMoment = moment.tz(baseAnchorWeek, tz);
    const weeksDiff = Math.abs(activeMoment.diff(anchorMoment, "weeks"));
    if (weeksDiff > 3) {
      setBaseAnchorWeek(activeMoment.clone().startOf("isoWeek").format("YYYY-MM-DD"));
    }
  }, [activeDate, baseAnchorWeek, tz]);

  // Days with lessons lookup set
  const daysWithLessons = useMemo(() => {
    const set = new Set<string>();
    weekSchedule.forEach((d) => {
      if (d.lessons.length > 0) {
        set.add(d.dateKey);
      }
    });
    return set;
  }, [weekSchedule]);

  // Full calendar expansion state and active view month
  const [isExpanded, setIsExpanded] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => activeDate.clone().startOf("month"));

  // Keep viewMonth synced to activeDate whenever calendar opens or activeDate changes
  useEffect(() => {
    setViewMonth(activeDate.clone().startOf("month"));
  }, [isExpanded, activeDate]);

  const handleCloseCalendar = useCallback(() => {
    setViewMonth(activeDate.clone().startOf("month"));
    setIsExpanded(false);
  }, [activeDate]);

  // Handle escape key to dismiss expanded calendar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isExpanded) {
        handleCloseCalendar();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isExpanded, handleCloseCalendar]);

  // Generate 6-week (42 days) month grid for the expanded calendar
  const calendarDays = useMemo(() => {
    const startOfMonth = viewMonth.clone().startOf("month");
    const gridStart = startOfMonth.clone().startOf("isoWeek");
    const days: moment.Moment[] = [];
    for (let i = 0; i < 42; i++) {
      days.push(gridStart.clone().add(i, "days"));
    }
    return days;
  }, [viewMonth]);

  // Smoothly center a specific date pill in the scroll container
  const centerDate = useCallback((dateStr: string, smooth = true) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    if (container.clientWidth === 0) {
      requestAnimationFrame(() => centerDate(dateStr, smooth));
      return;
    }

    const targetEl = container.querySelector(`[data-date="${dateStr}"]`) as HTMLElement;
    if (targetEl) {
      isProgrammaticScrollRef.current = true;
      const containerWidth = container.clientWidth;
      const elOffset = targetEl.offsetLeft;
      const elWidth = targetEl.clientWidth;
      const targetScroll = elOffset - containerWidth / 2 + elWidth / 2;

      container.scrollTo({
        left: targetScroll,
        top: 0,
        behavior: smooth ? "smooth" : "auto",
      });

      if (scrollEndTimeoutRef.current) {
        clearTimeout(scrollEndTimeoutRef.current);
      }

      setTimeout(() => {
        isProgrammaticScrollRef.current = false;
      }, smooth ? 280 : 30);
    }
  }, []);

  // When activeDate changes externally (e.g. from top bar 'Today', or expanded calendar)
  useEffect(() => {
    if (isExpanded) return;

    const activeDateKey = activeDate.format("YYYY-MM-DD");
    // If the change came from the user's manual scroll settling, it's already centered!
    if (lastSelectedDateRef.current === activeDateKey) {
      return;
    }

    lastSelectedDateRef.current = activeDateKey;
    centerDate(activeDateKey, true);
  }, [activeDate, isExpanded, centerDate]);

  // Initial alignment on mount and whenever returning from expanded view
  useEffect(() => {
    if (!isExpanded) {
      centerDate(activeDate.format("YYYY-MM-DD"), false);
      const timer = setTimeout(() => {
        centerDate(activeDate.format("YYYY-MM-DD"), false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isExpanded, centerDate, activeDate]);

  // Recalculate centering on window resize
  useEffect(() => {
    const handleResize = () => {
      centerDate(activeDate.format("YYYY-MM-DD"), false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [activeDate, centerDate]);

  // Handle scroll events with momentum settling
  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    if (container.scrollTop !== 0) {
      container.scrollTop = 0;
    }

    // Ignore scroll events during programmatic scrollTo
    if (isProgrammaticScrollRef.current) {
      return;
    }

    if (scrollEndTimeoutRef.current) {
      clearTimeout(scrollEndTimeoutRef.current);
    }

    // Detect when scrolling has settled on a pill
    scrollEndTimeoutRef.current = setTimeout(() => {
      if (isProgrammaticScrollRef.current) return;

      const containerWidth = container.clientWidth;
      const containerCenter = container.scrollLeft + containerWidth / 2;
      const buttons = container.querySelectorAll<HTMLElement>("[data-date]");
      let closestDateStr: string | null = null;
      let minDistance = Infinity;

      buttons.forEach((btn) => {
        const btnCenter = btn.offsetLeft + btn.clientWidth / 2;
        const dist = Math.abs(btnCenter - containerCenter);
        if (dist < minDistance) {
          minDistance = dist;
          closestDateStr = btn.getAttribute("data-date");
        }
      });

      const currentDateKey = activeDate.format("YYYY-MM-DD");
      if (closestDateStr && closestDateStr !== currentDateKey) {
        const foundMoment = datePills.find((d) => d.format("YYYY-MM-DD") === closestDateStr);
        if (foundMoment) {
          lastSelectedDateRef.current = closestDateStr;
          triggerHapticFeedback();
          onSelectDate(foundMoment);
        }
      }
    }, 140);
  };

  const handlePrevDay = () => {
    triggerHapticFeedback();
    const newDate = activeDate.clone().subtract(1, "days");
    const newDateStr = newDate.format("YYYY-MM-DD");
    lastSelectedDateRef.current = newDateStr;
    onSelectDate(newDate);
    centerDate(newDateStr, true);
  };

  const handleNextDay = () => {
    triggerHapticFeedback();
    const newDate = activeDate.clone().add(1, "days");
    const newDateStr = newDate.format("YYYY-MM-DD");
    lastSelectedDateRef.current = newDateStr;
    onSelectDate(newDate);
    centerDate(newDateStr, true);
  };

  return (
    <>
      {/* Dim backdrop when expanded */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/60 pointer-events-auto"
            onClick={handleCloseCalendar}
          />
        )}
      </AnimatePresence>

      <footer
        className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none w-full px-3 sm:px-4 transition-all flex flex-col items-center justify-end"
        style={{
          paddingBottom: "max(env(safe-area-inset-bottom, 0px), 8px)",
          paddingTop: "4px",
        }}
      >
        <motion.div
          layout
          transition={smoothTransition}
          data-tour="date-strip"
          className={`pointer-events-auto mx-auto rounded-2xl bg-white border-2 border-black transition-colors select-none ${
            isExpanded
              ? "w-full max-w-[360px] sm:max-w-[380px] p-3.5 sm:p-4 aspect-square sm:aspect-auto min-h-[365px] flex flex-col justify-between touch-pan-y"
              : "w-full max-w-lg px-2.5 pt-1 pb-1 flex flex-col touch-pan-x"
          }`}
          onClick={isExpanded ? (e) => e.stopPropagation() : undefined}
        >
          {isExpanded ? (
            /* ========================================================= */
            /* EXPANDED PROPER CALENDAR IN SQUARE FORM                   */
            /* ========================================================= */
            <div className="flex-1 flex flex-col justify-between">
              {/* Top Drag-Down Handle (Pull down to cancel) */}
              <motion.div
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0, bottom: 0.12 }}
                onDragEnd={(_, info) => {
                  if (info.offset.y > 35 || info.velocity.y > 160) {
                    triggerHapticFeedback();
                    handleCloseCalendar();
                  }
                }}
                className="w-full flex justify-center pt-0.5 pb-1 cursor-grab active:cursor-grabbing"
                title="Pull down to cancel"
              >
                <div className="w-10 h-1.5 rounded-full bg-black hover:bg-zinc-700 transition-colors" />
              </motion.div>

              {/* Header Row: Month Navigation, Today, Cancel */}
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-black">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-black text-black uppercase tracking-tight">
                    {viewMonth.format("MMMM YYYY")}
                  </span>
                  <div className="flex items-center gap-0.5 ml-1">
                    <button
                      type="button"
                      onClick={() => setViewMonth((prev) => prev.clone().subtract(1, "month"))}
                      className="p-1 rounded-lg border border-black hover:bg-zinc-100 text-black transition-colors"
                      title="Previous month"
                    >
                      <ChevronLeft className="w-3.5 h-3.5 text-black" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMonth((prev) => prev.clone().add(1, "month"))}
                      className="p-1 rounded-lg border border-black hover:bg-zinc-100 text-black transition-colors"
                      title="Next month"
                    >
                      <ChevronRight className="w-3.5 h-3.5 text-black" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHapticFeedback();
                      setViewMonth(currentLiveTime.clone().startOf("month"));
                      onSelectDate(currentLiveTime);
                      setIsExpanded(false);
                    }}
                    className="px-2 py-1 rounded-lg text-xs font-black text-black border-2 border-black bg-white hover:bg-black hover:text-white transition-colors"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseCalendar}
                    className="px-2.5 py-1 rounded-lg text-xs font-black bg-white text-black border-2 border-black hover:bg-zinc-100 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>

              {/* 7 Days of Week Header */}
              <div className="grid grid-cols-7 gap-1 pt-2 pb-1 text-center">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, i) => (
                  <div key={i} className="text-[10px] font-black text-black uppercase">
                    {d}
                  </div>
                ))}
              </div>

              {/* Month Grid Cells: Shared Numbers Rearrange Here */}
              <div className="grid grid-cols-7 gap-1 flex-1 my-1">
                {calendarDays.map((dayMoment) => {
                  const dateStr = dayMoment.format("YYYY-MM-DD");
                  const isCurrentMonth = dayMoment.isSame(viewMonth, "month");
                  const isActive = dateStr === activeDate.format("YYYY-MM-DD");
                  const isToday = dateStr === currentLiveTime.format("YYYY-MM-DD");
                  const hasClasses = daysWithLessons.has(dateStr);

                  return (
                    <button
                      key={dateStr}
                      type="button"
                      onClick={() => {
                        triggerHapticFeedback();
                        onSelectDate(dayMoment);
                        setIsExpanded(false);
                      }}
                      className={`h-9 sm:h-10 w-full rounded-xl flex flex-col items-center justify-center relative transition-colors ${
                        isActive
                          ? "text-white font-black z-10"
                          : isToday
                          ? "bg-white text-black font-black border-2 border-black"
                          : !isCurrentMonth
                          ? "text-zinc-400 hover:bg-zinc-100"
                          : "text-black font-bold hover:bg-zinc-100"
                      }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="active-date-highlight"
                          transition={smoothTransition}
                          className="absolute inset-0 rounded-xl bg-black z-0"
                        />
                      )}

                      <motion.span
                        layoutId={`date-num-${dateStr}`}
                        transition={smoothTransition}
                        className="text-xs sm:text-sm font-bold leading-none relative z-10"
                      >
                        {dayMoment.format("D")}
                      </motion.span>

                      <div className="h-1 flex items-center justify-center mt-0.5 relative z-10">
                        {hasClasses && (
                          <span
                            className={`w-1 h-1 rounded-full ${
                              isActive
                                ? "bg-white"
                                : "bg-black"
                            }`}
                          />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Bottom Drag-to-cancel Hint */}
              <div className="pt-1 text-center text-[10px] font-bold text-black">
                Pull down or tap Cancel to close
              </div>
            </div>
          ) : (
            /* ========================================================= */
            /* COMPACT FLOATING DATE DOCK VIEW                           */
            /* ========================================================= */
            <>
              {/* Top Pull Handle and Month Header (Pull up or tap to expand full calendar) */}
              <motion.div
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0.12, bottom: 0 }}
                onDragEnd={(_, info) => {
                  if (info.offset.y < -15 || info.velocity.y < -120) {
                    triggerHapticFeedback();
                    setIsExpanded(true);
                  }
                }}
                onClick={() => {
                  triggerHapticFeedback();
                  setIsExpanded(true);
                }}
                className="cursor-pointer select-none group touch-pan-x"
                title="Pull up or tap to expand full calendar"
              >
                {/* Visual Pull Bar */}
                <div className="w-full flex items-center justify-center pt-0.5 pb-1">
                  <div className="w-8 h-1 rounded-full bg-black group-hover:bg-zinc-700 transition-colors" />
                </div>

                <div className="flex items-center justify-between px-2 mb-0.5 text-black">
                  <span className="text-[11px] font-black tracking-tight text-black uppercase">
                    {activeDate.format("MMMM YYYY")}
                  </span>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={handlePrevDay}
                      className="p-0.5 rounded-full border border-black hover:bg-zinc-100 text-black transition-colors"
                      title="Previous day"
                    >
                      <ChevronLeft className="w-3 h-3 text-black" />
                    </button>
                    <button
                      onClick={handleNextDay}
                      className="p-0.5 rounded-full border border-black hover:bg-zinc-100 text-black transition-colors"
                      title="Next day"
                    >
                      <ChevronRight className="w-3 h-3 text-black" />
                    </button>
                  </div>
                </div>
              </motion.div>

              {/* Date Selector Strip Container */}
              <div className="relative py-0.5 overflow-hidden select-none">
                {/* Stationary Skeleton Box for the Highlight Slot */}
                <div
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[44px] h-[50px] rounded-xl border-2 border-black bg-transparent pointer-events-none z-20"
                  aria-hidden="true"
                />

                {/* Scrollable Date Track */}
                <div
                  ref={scrollContainerRef}
                  onScroll={handleScroll}
                  className="flex items-center gap-2 overflow-x-auto overflow-y-hidden touch-pan-x overscroll-x-contain no-scrollbar h-[56px] relative z-10"
                  style={{
                    scrollbarWidth: "none",
                    msOverflowStyle: "none",
                    paddingLeft: "calc(50% - 22px)",
                    paddingRight: "calc(50% - 22px)",
                    scrollSnapType: "x mandatory",
                    touchAction: "pan-x",
                    WebkitOverflowScrolling: "touch",
                    WebkitMaskImage: "linear-gradient(to right, transparent, black 16px, black calc(100% - 16px), transparent)",
                    maskImage: "linear-gradient(to right, transparent, black 16px, black calc(100% - 16px), transparent)",
                  }}
                >
                  {datePills.map((dayMoment) => {
                    const dateStr = dayMoment.format("YYYY-MM-DD");
                    const isActive = dateStr === activeDate.format("YYYY-MM-DD");
                    const isToday = dateStr === currentLiveTime.format("YYYY-MM-DD");
                    const hasClasses = daysWithLessons.has(dateStr);

                    return (
                      <button
                        key={dateStr}
                        data-date={dateStr}
                        data-active={isActive ? "true" : "false"}
                        onClick={() => {
                          if (lastHapticDateRef.current !== dateStr) {
                            lastHapticDateRef.current = dateStr;
                            triggerHapticFeedback();
                          }
                          lastSelectedDateRef.current = dateStr;
                          onSelectDate(dayMoment);
                          centerDate(dateStr, true);
                        }}
                        style={{
                          scrollSnapAlign: "center",
                          touchAction: "pan-x",
                        }}
                        className={`relative shrink-0 flex flex-col items-center justify-center w-[44px] h-[50px] rounded-xl text-center select-none touch-pan-x transition-colors duration-150 ${
                          isActive
                            ? "bg-black text-white font-black z-10"
                            : isToday
                            ? "bg-white text-black font-black border-2 border-black hover:bg-zinc-100"
                            : "bg-white text-black font-bold hover:bg-zinc-100"
                        }`}
                      >
                        {/* Day of Week */}
                        <span
                          className={`text-[9px] font-bold uppercase tracking-wider leading-none relative z-10 ${
                            isActive ? "text-white" : "text-black"
                          }`}
                        >
                          {dayMoment.format("ddd")}
                        </span>

                        {/* Day Number */}
                        <span
                          className={`text-sm font-extrabold my-0.5 leading-none relative z-10 ${
                            isActive ? "text-white" : "text-black"
                          }`}
                        >
                          {dayMoment.format("D")}
                        </span>

                        {/* Micro Dot Badge */}
                        <div className="h-1 flex items-center justify-center relative z-10">
                          {hasClasses && (
                            <span
                              className={`w-1 h-1 rounded-full ${
                                isActive
                                  ? "bg-white"
                                  : "bg-black"
                              }`}
                            />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </motion.div>
      </footer>
    </>
  );
};

