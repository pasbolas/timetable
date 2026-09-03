import React, { useRef, useEffect, useMemo, useCallback } from "react";
import moment from "moment-timezone";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayData } from "../types/timetable";
import { TIMETABLE_CONFIG } from "../config/timetableConfig";
import { triggerHapticFeedback } from "../services/haptics";

interface WeekDateStripProps {
  activeDate: moment.Moment;
  onSelectDate: (date: moment.Moment) => void;
  weekSchedule: DayData[];
  currentLiveTime: moment.Moment;
}

export const WeekDateStrip: React.FC<WeekDateStripProps> = ({
  activeDate,
  onSelectDate,
  weekSchedule,
  currentLiveTime,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isProgrammaticScrollRef = useRef(false);
  const scrollEndTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastHapticDateRef = useRef<string | null>(activeDate.format("YYYY-MM-DD"));
  const tz = TIMETABLE_CONFIG.timezone;

  // Generate 5 continuous weeks (35 days) centered around the current week
  const datePills = useMemo(() => {
    const days: moment.Moment[] = [];
    const baseWeekStart = currentLiveTime.clone().tz(tz).startOf("isoWeek").subtract(1, "weeks");
    for (let i = 0; i < 35; i++) {
      days.push(baseWeekStart.clone().add(i, "days"));
    }
    return days;
  }, [currentLiveTime, tz]);

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

  // Compute and apply scale/opacity to each date pill based on distance from the center
  const updatePillScales = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

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

      // Distance radius across which zoom scaling takes effect
      const radius = 130;
      const progress = Math.max(0, 1 - dist / radius);
      
      // Scale smoothly from 0.86x at edges to 1.05x at the exact middle
      const scale = 0.86 + 0.19 * Math.pow(progress, 1.3);
      // Fade slightly as items move away from center
      const opacity = 0.55 + 0.45 * progress;

      btn.style.transform = `scale(${scale.toFixed(3)})`;
      btn.style.opacity = `${opacity.toFixed(3)}`;
    });

    // Provide instant tactile response when a date bubble enters the center highlight box during manual user scrolling
    if (
      !isProgrammaticScrollRef.current &&
      closestDateStr &&
      minDistance < 22 &&
      closestDateStr !== lastHapticDateRef.current
    ) {
      lastHapticDateRef.current = closestDateStr;
      triggerHapticFeedback();
    }
  }, []);

  // Smoothly center the active date in the middle of the scroll view
  const centerActiveDate = useCallback((smooth = true) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const activeEl = container.querySelector('[data-active="true"]') as HTMLElement;
    if (activeEl) {
      isProgrammaticScrollRef.current = true;
      const containerWidth = container.clientWidth;
      const elOffset = activeEl.offsetLeft;
      const elWidth = activeEl.clientWidth;
      const targetScroll = elOffset - containerWidth / 2 + elWidth / 2;

      container.scrollTo({
        left: targetScroll,
        top: 0,
        behavior: smooth ? "smooth" : "auto",
      });

      // Update scales during and after scroll
      updatePillScales();
      setTimeout(() => {
        updatePillScales();
        isProgrammaticScrollRef.current = false;
      }, 350);
    }
  }, [updatePillScales]);

  // Center on activeDate changes or mount
  useEffect(() => {
    centerActiveDate(true);
  }, [activeDate, centerActiveDate]);

  // Recalculate scales on window resize
  useEffect(() => {
    const handleResize = () => {
      centerActiveDate(false);
      updatePillScales();
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [centerActiveDate, updatePillScales]);

  // Handle scroll events (user swiping through the strip)
  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (container && container.scrollTop !== 0) {
      container.scrollTop = 0;
    }
    updatePillScales();

    // If user is manually scrolling, snap/select the centered date when scrolling settles
    if (scrollEndTimeoutRef.current) {
      clearTimeout(scrollEndTimeoutRef.current);
    }

    if (!isProgrammaticScrollRef.current) {
      scrollEndTimeoutRef.current = setTimeout(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const containerCenter = container.scrollLeft + container.clientWidth / 2;
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

        if (closestDateStr && closestDateStr !== activeDate.format("YYYY-MM-DD")) {
          const foundMoment = datePills.find((d) => d.format("YYYY-MM-DD") === closestDateStr);
          if (foundMoment) {
            onSelectDate(foundMoment);
          }
        }
      }, 120);
    }
  };

  const handlePrevDay = () => {
    triggerHapticFeedback();
    onSelectDate(activeDate.clone().subtract(1, "days"));
  };

  const handleNextDay = () => {
    triggerHapticFeedback();
    onSelectDate(activeDate.clone().add(1, "days"));
  };

  return (
    <footer
      className="fixed bottom-0 left-0 right-0 z-30 pointer-events-none w-full px-3 sm:px-4 transition-all"
      style={{
        paddingBottom: "max(env(safe-area-inset-bottom, 0px), 8px)",
        paddingTop: "4px",
      }}
    >
      <div
        data-tour="date-strip"
        className="pointer-events-auto max-w-lg mx-auto rounded-2xl bg-white/70 dark:bg-[#1a1e23]/80 backdrop-blur-2xl border border-white/60 dark:border-white/10 shadow-[0_12px_36px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_14px_40px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.08)] px-2.5 pt-1.5 pb-1 transition-colors"
      >
        {/* Month Header and Micro Navigation */}
        <div className="flex items-center justify-between px-2 mb-0.5 text-slate-500 dark:text-slate-400">
          <span className="text-[11px] font-bold tracking-tight text-slate-800 dark:text-slate-200 uppercase">
            {activeDate.format("MMMM YYYY")}
          </span>
          <div className="flex items-center gap-0.5">
            <button
              onClick={handlePrevDay}
              className="p-0.5 rounded-full hover:bg-stone-200/60 dark:hover:bg-neutral-600 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              title="Previous day"
            >
              <ChevronLeft className="w-3 h-3" />
            </button>
            <button
              onClick={handleNextDay}
              className="p-0.5 rounded-full hover:bg-stone-200/60 dark:hover:bg-neutral-600 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              title="Next day"
            >
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Date Selector Strip Container */}
        <div className="relative py-0.5 overflow-hidden touch-pan-x select-none">
          {/* Stationary Skeleton Box for the Highlight Slot */}
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[44px] h-[50px] rounded-xl border border-slate-300/60 dark:border-white/10 bg-white/40 dark:bg-white/5 pointer-events-none -z-0 shadow-inner"
            aria-hidden="true"
          />

          {/* Scrollable Date Track */}
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex items-center gap-1.5 overflow-x-auto overflow-y-hidden touch-pan-x overscroll-x-contain overscroll-y-none no-scrollbar h-[54px] scroll-smooth relative z-10"
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              paddingLeft: "calc(50% - 21px)",
              paddingRight: "calc(50% - 21px)",
              scrollSnapType: "x mandatory",
              overflowY: "hidden",
              touchAction: "pan-x",
              overscrollBehaviorY: "none",
              WebkitMaskImage: "linear-gradient(to right, transparent, black 16px, black calc(100% - 16px), transparent)",
              maskImage: "linear-gradient(to right, transparent, black 16px, black calc(100% - 16px), transparent)",
            }}
          >
            {datePills.map((dayMoment) => {
              const dateStr = dayMoment.format("YYYY-MM-DD");
              const isActive = dateStr === activeDate.format("YYYY-MM-DD");
              const isToday = dateStr === currentLiveTime.format("YYYY-MM-DD");
              const hasClasses = daysWithLessons.has(dateStr);
              const isWeekend = dayMoment.isoWeekday() >= 6;

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
                    onSelectDate(dayMoment);
                  }}
                  style={{
                    scrollSnapAlign: "center",
                    transformOrigin: "center center",
                    touchAction: "pan-x",
                  }}
                  className={`relative shrink-0 flex flex-col items-center justify-center w-[42px] h-[48px] rounded-xl text-center transition-[background-color,color] duration-150 will-change-transform select-none touch-pan-x ${
                    isActive
                      ? "bg-blue-600 text-white dark:bg-[#C8B273] dark:text-[#424242] font-black shadow-sm shadow-blue-600/20 dark:shadow-[#C8B273]/30 z-10"
                      : isToday
                      ? "bg-blue-50 text-blue-700 dark:bg-[#834655]/40 dark:text-[#F6CAC9] font-semibold ring-1 ring-blue-200 dark:ring-[#C8B273]/50"
                      : isWeekend
                      ? "text-slate-400 dark:text-neutral-500 hover:bg-stone-200/50 dark:hover:bg-neutral-600/40"
                      : "text-slate-700 dark:text-[#F6CAC9]/90 hover:bg-stone-200/50 dark:hover:bg-neutral-600/40"
                  }`}
                >
                  {/* Day of Week */}
                  <span className="text-[9px] font-semibold uppercase tracking-wider opacity-85 leading-none">
                    {dayMoment.format("ddd")}
                  </span>

                  {/* Day Number */}
                  <span className="text-sm font-extrabold my-0.5 leading-none">
                    {dayMoment.format("D")}
                  </span>

                  {/* Micro Dot Badge */}
                  <div className="h-1 flex items-center justify-center">
                    {hasClasses && (
                      <span
                        className={`w-1 h-1 rounded-full ${
                          isActive
                            ? "bg-white dark:bg-[#424242]"
                            : "bg-blue-500 dark:bg-[#C8B273]"
                        }`}
                      />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </footer>
  );
};

