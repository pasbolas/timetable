import React, { useRef, useEffect, useMemo, useCallback } from "react";
import moment from "moment-timezone";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayData } from "../types/timetable";
import { TIMETABLE_CONFIG } from "../config/timetableConfig";

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

    buttons.forEach((btn) => {
      const btnCenter = btn.offsetLeft + btn.clientWidth / 2;
      const dist = Math.abs(btnCenter - containerCenter);

      // Distance radius across which zoom scaling takes effect
      const radius = 160;
      const progress = Math.max(0, 1 - dist / radius);
      
      // Scale smoothly from 0.78x at edges to 1.10x at the exact middle
      const scale = 0.78 + 0.32 * Math.pow(progress, 1.3);
      // Fade slightly as items move away from center
      const opacity = 0.45 + 0.55 * progress;

      btn.style.transform = `scale(${scale.toFixed(3)})`;
      btn.style.opacity = `${opacity.toFixed(3)}`;
    });
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
    onSelectDate(activeDate.clone().subtract(1, "days"));
  };

  const handleNextDay = () => {
    onSelectDate(activeDate.clone().add(1, "days"));
  };

  return (
    <footer
      data-tour="date-strip"
      className="sticky bottom-0 z-30 bg-white/95 dark:bg-slate-950/95 border-t border-slate-200/80 dark:border-slate-800/80 backdrop-blur-md shadow-[0_-4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.5)] transition-colors"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 8px)" }}
    >
      <div className="max-w-2xl mx-auto px-3 pt-1 pb-0.5">
        {/* Month Header and Micro Navigation */}
        <div className="flex items-center justify-between px-1 mb-0.5 text-slate-500 dark:text-slate-400">
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            {activeDate.format("MMMM YYYY")}
          </span>
          <div className="flex items-center gap-0.5">
            <button
              onClick={handlePrevDay}
              className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              title="Previous day"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleNextDay}
              className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              title="Next day"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Date Selector Strip Container */}
        <div className="relative py-0.5 overflow-hidden">
          {/* Stationary Skeleton Box for the Highlight Slot */}
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[52px] h-[60px] rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-slate-100/70 dark:bg-slate-900/60 pointer-events-none -z-0 shadow-inner"
            aria-hidden="true"
          />

          {/* Scrollable Date Track */}
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 scroll-smooth relative z-10"
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              paddingLeft: "calc(50% - 24px)",
              paddingRight: "calc(50% - 24px)",
              scrollSnapType: "x mandatory",
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
                    onSelectDate(dayMoment);
                  }}
                  style={{
                    scrollSnapAlign: "center",
                    transformOrigin: "center center",
                  }}
                  className={`relative shrink-0 flex flex-col items-center justify-center w-12 py-2 rounded-2xl text-center transition-[background-color,color] duration-150 will-change-transform select-none ${
                    isActive
                      ? "bg-blue-600 text-white font-bold shadow-sm shadow-blue-600/20 z-10"
                      : isToday
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 font-semibold ring-1 ring-blue-200 dark:ring-blue-800/60"
                      : isWeekend
                      ? "text-slate-400 dark:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-900"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                  }`}
                >
                  {/* Day of Week */}
                  <span className="text-[10px] font-semibold uppercase tracking-wider opacity-85 leading-tight">
                    {dayMoment.format("ddd")}
                  </span>

                  {/* Day Number */}
                  <span className="text-base font-bold my-0.5 leading-none">
                    {dayMoment.format("D")}
                  </span>

                  {/* Micro Dot Badge */}
                  <div className="h-1.5 flex items-center justify-center mt-0.5">
                    {hasClasses && (
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isActive ? "bg-white" : "bg-blue-500 dark:bg-blue-400"
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

