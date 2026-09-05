import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import moment from "moment-timezone";
import { Clock, Info, ChevronRight, User, Coffee } from "lucide-react";
import { DayData, NormalizedLesson } from "../types/timetable";
import { EmptyState } from "./EmptyState";
import { LessonDetailModal } from "./LessonDetailModal";
import { RoomBadge } from "./RoomBadge";

// Date transition variants for silky blur-in blur-out transitions
const dateBlurVariants = {
  initial: {
    opacity: 0,
    filter: "blur(14px)",
    scale: 0.992,
  },
  animate: {
    opacity: 1,
    filter: "blur(0px)",
    scale: 1,
    transition: {
      duration: 0.22,
      ease: [0.22, 1, 0.36, 1],
    },
    transitionEnd: {
      filter: "none",
    },
  },
  exit: {
    opacity: 0,
    filter: "blur(14px)",
    scale: 0.992,
    transition: {
      duration: 0.14,
      ease: [0.32, 0, 0.67, 0],
    },
  },
};

interface DayTimelineProps {
  activeDate: moment.Moment;
  dayData?: DayData;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  currentLiveTime: moment.Moment;
  isToday: boolean;
  isLessonActive: (start: moment.Moment, end: moment.Moment) => boolean;
  isLessonPast: (end: moment.Moment) => boolean;
}

// Convert 24-hour index to 12-hour formatted string (e.g. 9 -> "9 AM", 12 -> "12 PM", 14 -> "2 PM")
function formatHourLabel(hour: number): string {
  if (hour === 0 || hour === 24) return "12 AM";
  if (hour === 12) return "12 PM";
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

export const DayTimeline: React.FC<DayTimelineProps> = ({
  activeDate,
  dayData,
  isLoading,
  error,
  onRetry,
  currentLiveTime,
  isToday,
  isLessonActive,
  isLessonPast,
}) => {
  const [selectedLesson, setSelectedLesson] = useState<NormalizedLesson | null>(null);

  const isWeekend = activeDate.isoWeekday() >= 6;
  const lessons = dayData?.lessons || [];
  const breaks = dayData?.breaks || [];

  // Determine grid hour bounds (dynamically expanded if lessons or current time exist outside)
  const { startHour, endHour, hoursList } = useMemo(() => {
    let minH = 9;
    let maxH = 18;

    lessons.forEach((l) => {
      const sH = l.StartDateTime.hour();
      const eH = l.EndDateTime.hour() + (l.EndDateTime.minute() > 0 ? 1 : 0);
      if (sH < minH) minH = Math.max(7, sH);
      if (eH > maxH) maxH = Math.min(22, eH);
    });

    if (isToday) {
      const nowH = currentLiveTime.hour();
      if (nowH < minH) minH = Math.max(7, nowH);
      if (nowH >= maxH) maxH = Math.min(22, nowH + 1);
    }

    const list: number[] = [];
    for (let h = minH; h <= maxH; h++) {
      list.push(h);
    }
    return { startHour: minH, endHour: maxH, hoursList: list };
  }, [lessons, isToday, currentLiveTime]);

  const HOUR_HEIGHT = 72; // Pixels per hour row
  const GRID_PADDING_Y = 16; // Top and bottom padding for timetable grid in pixels

  // Calculate live current time position in pixels
  const nowHour = currentLiveTime.hour();
  const nowMinute = currentLiveTime.minute();
  const isWithinGrid = nowHour >= startHour && nowHour <= endHour;
  const currentMinutesFromStart = (nowHour - startHour) * 60 + nowMinute;
  const currentLiveY = GRID_PADDING_Y + (currentMinutesFromStart / 60) * HOUR_HEIGHT;

  const activeDateKey = activeDate.format("YYYY-MM-DD");

  // When switching between dates, smoothly reset scroll to top of day timeline
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeDateKey]);

  return (
    <div className="w-full max-w-full flex-1 flex flex-col">
      {/* Subheader: Date & class counter - Sticky flush below TopBar when scrolling lessons */}
      <div
        className="z-20 border-t-2 border-b-2 border-white flex items-center justify-between px-3 sm:px-6 py-2.5 transition-colors shadow-xs w-full max-w-full timeline-subheader-surface"
        style={{
          position: lessons.length > 0 ? "sticky" : "relative",
          top: lessons.length > 0 ? "calc(58px + env(safe-area-inset-top, 0px))" : undefined,
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeDateKey}
            initial={{ opacity: 0, filter: "blur(8px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, filter: "blur(8px)" }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            style={{ willChange: "filter, opacity" }}
            className="flex items-baseline gap-2"
          >
            <h2 className="text-base font-black text-white">
              {activeDate.format("dddd, D MMMM")}
            </h2>
            {isToday && (
              <span className="text-[11px] font-bold text-white">
                • {currentLiveTime.format("h:mm A")}
              </span>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center">
          <AnimatePresence mode="wait" initial={false}>
            {isLoading && (
              <motion.span
                key="loading"
                initial={{ opacity: 0, filter: "blur(6px)" }}
                animate={{ opacity: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, filter: "blur(6px)" }}
                transition={{ duration: 0.14 }}
                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-white"
              >
                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                Loading schedule...
              </motion.span>
            )}

            {!isLoading && !error && lessons.length > 0 && (
              <motion.span
                key={`count-${activeDateKey}`}
                initial={{ opacity: 0, filter: "blur(6px)" }}
                animate={{ opacity: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, filter: "blur(6px)" }}
                transition={{ duration: 0.14 }}
                className="text-[11px] font-bold text-white"
              >
                {lessons.length} {lessons.length === 1 ? "class" : "classes"}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Date Switch Animated Timeline Container */}
      <div className="relative flex-1 flex flex-col w-full overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeDateKey}
            variants={dateBlurVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            style={{ willChange: "filter, opacity, transform" }}
            className="flex-1 flex flex-col w-full"
          >
            {/* Loading Timetable Grid Skeleton */}
            {isLoading && (
        <div className="relative flex-1 flex w-full bg-transparent min-h-[calc(100vh-100px)] animate-pulse select-none">
          {/* Left Time Column (Hours Gutter Skeleton) */}
          <div
            style={{
              paddingTop: `${GRID_PADDING_Y}px`,
              paddingBottom: "calc(130px + env(safe-area-inset-bottom, 0px))",
            }}
            className="w-16 sm:w-20 shrink-0 border-r-2 border-white relative bg-black/75 backdrop-blur-[2px] min-h-full"
          >
            {[9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map((h, i, arr) => (
              <div
                key={h}
                style={{ height: i === arr.length - 1 ? "0px" : `${HOUR_HEIGHT}px` }}
                className="relative"
              >
                <span className="absolute top-0 -translate-y-1/2 right-2 sm:right-3 text-[11px] font-black text-white/40 tracking-tight">
                  {formatHourLabel(h)}
                </span>
              </div>
            ))}
          </div>

          {/* Right Main Grid Slot Area Skeleton */}
          <div
            style={{
              paddingTop: `${GRID_PADDING_Y}px`,
              paddingBottom: "calc(130px + env(safe-area-inset-bottom, 0px))",
            }}
            className="relative flex-1 min-h-full bg-transparent"
          >
            {/* Grid Divider Lines */}
            {[9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map((h, i, arr) => (
              <div
                key={h}
                style={{ height: i === arr.length - 1 ? "0px" : `${HOUR_HEIGHT}px` }}
                className="border-t border-white/20 w-full"
              />
            ))}

            {/* Skeleton Lesson Card 1: 9:00 - 11:00 (height 136px) */}
            <div
              style={{
                top: `${GRID_PADDING_Y + 4}px`,
                height: "136px",
                left: "8px",
                right: "12px",
              }}
              className="absolute rounded-xl border-2 border-white bg-black p-3.5 overflow-hidden shadow-sm flex flex-col justify-between"
            >
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-white" />
              <div>
                <div className="flex items-center justify-between pl-1 mb-2">
                  <div className="h-4 w-28 bg-zinc-800 rounded border border-white/20" />
                  <div className="h-4 w-16 bg-white rounded-md" />
                </div>
                <div className="pl-1 space-y-1.5">
                  <div className="h-4 w-3/4 bg-zinc-700 rounded" />
                  <div className="h-3 w-1/2 bg-zinc-800 rounded" />
                </div>
              </div>
              <div className="pl-1 flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-full bg-zinc-800" />
                <div className="h-3 w-36 bg-zinc-800 rounded" />
              </div>
            </div>

            {/* Skeleton Break Pill: 11:00 - 12:00 (height 60px) */}
            <div
              style={{
                top: `${GRID_PADDING_Y + 148}px`,
                height: "60px",
                left: "8px",
                right: "12px",
              }}
              className="absolute rounded-xl border-2 border-white bg-break-stripes px-3.5 py-2 overflow-hidden flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-black border-2 border-white flex items-center justify-center">
                  <Coffee className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="space-y-1">
                  <div className="h-3 w-20 bg-zinc-700 rounded" />
                  <div className="h-2.5 w-16 bg-zinc-800 rounded" />
                </div>
              </div>
              <div className="w-2.5 h-2.5 rounded-full bg-white/40 mr-1" />
            </div>

            {/* Skeleton Lesson Card 2: 12:00 - 14:00 (height 136px) */}
            <div
              style={{
                top: `${GRID_PADDING_Y + 220}px`,
                height: "136px",
                left: "8px",
                right: "12px",
              }}
              className="absolute rounded-xl border-2 border-white bg-black p-3.5 overflow-hidden shadow-sm flex flex-col justify-between"
            >
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-white" />
              <div>
                <div className="flex items-center justify-between pl-1 mb-2">
                  <div className="h-4 w-28 bg-zinc-800 rounded border border-white/20" />
                  <div className="h-4 w-16 bg-white rounded-md" />
                </div>
                <div className="pl-1 space-y-1.5">
                  <div className="h-4 w-2/3 bg-zinc-700 rounded" />
                  <div className="h-3 w-1/3 bg-zinc-800 rounded" />
                </div>
              </div>
              <div className="pl-1 flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-full bg-zinc-800" />
                <div className="h-3 w-40 bg-zinc-800 rounded" />
              </div>
            </div>

            {/* Skeleton Lesson Card 3: 15:00 - 17:00 (height 136px) */}
            <div
              style={{
                top: `${GRID_PADDING_Y + 436}px`,
                height: "136px",
                left: "8px",
                right: "12px",
              }}
              className="absolute rounded-xl border-2 border-white bg-black p-3.5 overflow-hidden shadow-sm flex flex-col justify-between"
            >
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-white" />
              <div>
                <div className="flex items-center justify-between pl-1 mb-2">
                  <div className="h-4 w-28 bg-zinc-800 rounded border border-white/20" />
                  <div className="h-4 w-16 bg-white rounded-md" />
                </div>
                <div className="pl-1 space-y-1.5">
                  <div className="h-4 w-2/3 bg-zinc-700 rounded" />
                  <div className="h-3 w-1/3 bg-zinc-800 rounded" />
                </div>
              </div>
              <div className="pl-1 flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-full bg-zinc-800" />
                <div className="h-3 w-40 bg-zinc-800 rounded" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {!isLoading && error && (
        <div className="max-w-md mx-auto px-4">
          <EmptyState type="error" errorMessage={error} onRetry={onRetry} />
        </div>
      )}

      {/* Empty State when no classes */}
      {!isLoading && !error && lessons.length === 0 && (
        <div
          className="max-w-md mx-auto px-4 flex-1 flex flex-col items-center justify-center select-none min-h-[calc(100dvh-200px)] py-6"
          style={{
            paddingBottom: "calc(90px + env(safe-area-inset-bottom, 0px))",
          }}
        >
          <EmptyState
            type={isWeekend ? "weekend" : "free-day"}
            date={activeDate}
          />
        </div>
      )}

      {/* Vertical Hour Grid Timetable Stream (Full Width Edge-to-Edge) */}
      {!isLoading && !error && lessons.length > 0 && (
        <div
          data-tour="timeline-stream"
          className="relative flex-1 flex w-full bg-transparent min-h-[calc(100vh-100px)]"
        >
          {/* Left Time Column (Hours Gutter) */}
          <div
            style={{
              paddingTop: `${GRID_PADDING_Y}px`,
              paddingBottom: "calc(130px + env(safe-area-inset-bottom, 0px))",
            }}
            className="w-16 sm:w-20 shrink-0 border-r-2 border-white relative select-none bg-black/75 backdrop-blur-[2px] min-h-full"
          >
            {hoursList.map((hour) => {
              const isLast = hour === endHour;
              return (
                <div
                  key={hour}
                  style={{ height: isLast ? "0px" : `${HOUR_HEIGHT}px` }}
                  className="relative"
                >
                  <span className="absolute top-0 -translate-y-1/2 right-2 sm:right-3 text-[11px] font-black text-white tracking-tight">
                    {formatHourLabel(hour)}
                  </span>
                </div>
              );
            })}

            {/* Current Time Slider Track & Badge in Gutter */}
            {isToday && isWithinGrid && (
              <>
                {/* Vertical slider track rail along the right edge of gutter */}
                <div
                  style={{
                    top: `${GRID_PADDING_Y}px`,
                    height: `${(endHour - startHour) * HOUR_HEIGHT}px`,
                  }}
                  className="absolute right-0 w-[3px] bg-white pointer-events-none"
                  aria-hidden="true"
                >
                  {/* Elapsed day progress fill */}
                  <div
                    style={{ height: `${Math.max(0, currentLiveY - GRID_PADDING_Y)}px` }}
                    className="w-full bg-white"
                  />
                </div>

                {/* Floating Current Time Pill Badge */}
                <div
                  style={{ top: `${currentLiveY}px` }}
                  className="absolute right-2 -translate-y-1/2 z-30 pointer-events-none flex items-center justify-end"
                >
                  <span className="text-[10px] sm:text-[11px] font-bold text-black bg-white px-1.5 py-0.5 rounded border-2 border-white flex items-center gap-1 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-black" />
                    {currentLiveTime.format("h:mm A")}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Right Main Grid Slot Area */}
          <div
            style={{
              paddingTop: `${GRID_PADDING_Y}px`,
              paddingBottom: "calc(130px + env(safe-area-inset-bottom, 0px))",
            }}
            className="relative flex-1 min-h-full bg-transparent"
          >
            {/* Grid Divider Lines */}
            {hoursList.map((hour) => {
              const isLast = hour === endHour;
              return (
                <div
                  key={hour}
                  style={{ height: isLast ? "0px" : `${HOUR_HEIGHT}px` }}
                  className="border-t border-white/20 w-full"
                />
              );
            })}

            {/* Full-width Current Time Slider & Knob (Plain 2D) */}
            {isToday && isWithinGrid && (
              <div
                style={{ top: `${currentLiveY}px` }}
                className="absolute left-0 right-0 z-20 flex items-center pointer-events-none -translate-y-1/2"
              >
                {/* 2D Knob on the rail boundary */}
                <div className="relative -ml-[6px] flex items-center justify-center shrink-0">
                  <div className="w-3 h-3 rounded-full bg-white border-2 border-black ring-2 ring-white relative z-10" />
                </div>
                {/* Horizontal slider beam (solid 2D line) */}
                <div className="flex-1 h-[2px] bg-white" />
              </div>
            )}

            {/* Positioned Break Pills in gaps strictly between lessons */}
            {breaks.map((breakItem) => {
              const startMinutes =
                (breakItem.start.hour() - startHour) * 60 +
                breakItem.start.minute();
              const durationMinutes = breakItem.durationMinutes;

              const topPx = GRID_PADDING_Y + (startMinutes / 60) * HOUR_HEIGHT;
              const actualGapHeight = (durationMinutes / 60) * HOUR_HEIGHT;
              const heightPx = Math.max(34, actualGapHeight - 6);

              const hours = Math.floor(durationMinutes / 60);
              const minutes = durationMinutes % 60;
              let durationStr = "";
              if (hours > 0 && minutes > 0) {
                durationStr = `${hours}h ${minutes}m`;
              } else if (hours > 0) {
                durationStr = `${hours}h`;
              } else {
                durationStr = `${minutes}m`;
              }

              const isCompactBreak = heightPx < 54;

              return (
                <div
                  key={breakItem.id}
                  style={{
                    top: `${topPx + 3}px`,
                    height: `${heightPx}px`,
                    left: "8px",
                    right: "8px",
                  }}
                  className="absolute rounded-xl border-2 border-white bg-break-stripes overflow-hidden select-none flex flex-col justify-center px-3 transition-all z-0 pointer-events-none"
                >
                  {isCompactBreak ? (
                    /* Compact 1-line Break Pill */
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Coffee className="w-3.5 h-3.5 text-white shrink-0" />
                        <span className="text-xs font-black text-white tracking-wide truncate">
                          Break Time
                        </span>
                        <span className="text-xs text-white font-bold">•</span>
                        <span className="text-[11px] font-bold text-white truncate">
                          {durationStr}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-bold text-white">
                          {breakItem.start.format("HH:mm")} – {breakItem.end.format("HH:mm")}
                        </span>
                        <span className="w-2 h-2 rounded-full bg-white shrink-0" />
                      </div>
                    </div>
                  ) : (
                    /* Multi-hour / Standard Break Pill */
                    <div className="flex flex-col justify-between py-1 h-full">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Coffee className="w-4 h-4 text-white shrink-0" />
                          <span className="text-xs sm:text-sm font-black text-white tracking-wide">
                            Break Time
                          </span>
                        </div>
                        {/* Top right indicator dot matching user's reference image */}
                        <span className="w-2 h-2 rounded-full bg-white shrink-0" />
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-white">
                        <span>{durationStr} free</span>
                        <span>•</span>
                        <span>
                          {breakItem.start.format("HH:mm")} – {breakItem.end.format("HH:mm")}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Positioned Lesson Cards on the Grid */}
            {lessons.map((lesson, idx) => {
              const startMinutes =
                (lesson.StartDateTime.hour() - startHour) * 60 +
                lesson.StartDateTime.minute();
              const durationMinutes = lesson.EndDateTime.diff(
                lesson.StartDateTime,
                "minutes"
              );

              const topPx = GRID_PADDING_Y + (startMinutes / 60) * HOUR_HEIGHT;
              const heightPx = Math.max(
                54,
                (durationMinutes / 60) * HOUR_HEIGHT - 4
              );

              const isCompact = durationMinutes <= 60; // 1 hour or less (~68px)
              const isExtended = durationMinutes > 120; // 3 hours or more (~212px+)
              const isMedium = !isCompact && !isExtended; // 1.5 - 2 hours (~104px - 140px)
              const isLab =
                lesson.EventType?.toLowerCase().includes("lab") ||
                Boolean(lesson.collapsedLocations);
              const isLecture =
                lesson.EventType?.toLowerCase().includes("lecture") ||
                lesson.EventType?.toLowerCase() === "lec";
              const isTutorial =
                Boolean(lesson.EventType && /\b(tut|tutorial|tutorials)\b/i.test(lesson.EventType)) ||
                Boolean(lesson.Description && /\b(tutorial|tutorials)\b/i.test(lesson.Description));

              const active =
                isToday &&
                isLessonActive(lesson.StartDateTime, lesson.EndDateTime);
              const past = isToday && isLessonPast(lesson.EndDateTime);

              return (
                <div
                  key={lesson.id}
                  data-tour={idx === 0 ? "lesson-card" : undefined}
                  onClick={() => setSelectedLesson(lesson)}
                  style={{
                    top: `${topPx + 2}px`,
                    height: `${heightPx}px`,
                    left: "8px",
                    right: "8px",
                  }}
                  className={`absolute rounded-xl border-2 cursor-pointer transition-colors overflow-hidden flex flex-col justify-between active:scale-[0.99] group timetable-widget ${
                    isLecture
                      ? "lecture-widget"
                      : isLab
                      ? "lab-widget"
                      : isTutorial
                      ? "tutorial-widget"
                      : "border-white bg-black hover:bg-zinc-900"
                  } ${
                    isCompact
                      ? "p-2 sm:px-2.5 sm:py-2"
                      : isExtended
                        ? "p-3 sm:p-4"
                        : "p-2.5 sm:p-3"
                  } ${
                    active
                      ? "ring-2 ring-white border-white z-10"
                      : past
                        ? "opacity-60 border-white z-0"
                        : "border-white z-0"
                  }`}
                >
                  {/* Left accent vertical strip */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${isLecture ? "lecture-accent-bar" : isLab ? "lab-accent-bar" : isTutorial ? "tutorial-accent-bar" : "bg-white"}`} />

                  {/* --- TIER 1: COMPACT LAYOUT (1 HOUR / <= 60 MINS) --- */}
                  {isCompact && (
                    <div className="flex flex-col justify-between h-full pl-1.5">
                      {/* Top Row: Time + Badge + Tucked Mini Info Button */}
                      <div className="flex items-center justify-between gap-1 leading-none">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-[11px] font-bold text-white flex items-center gap-1 shrink-0">
                            <Clock className="w-3 h-3 text-white shrink-0" />
                            {lesson.StartDateTime.format("HH:mm")} – {lesson.EndDateTime.format("HH:mm")}
                          </span>
                          <span
                            className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md truncate border ${
                              isLecture
                                ? "lecture-badge text-white border-transparent"
                                : isLab
                                ? "lab-badge text-white"
                                : isTutorial
                                ? "tutorial-badge"
                                : "bg-white text-black border-white"
                            }`}
                          >
                            {lesson.EventType}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLesson(lesson);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-black hover:bg-zinc-800 text-white border border-white shadow-xs active:scale-95 transition-all group/btn shrink-0"
                          title="View class details"
                        >
                          <span>Info</span>
                          <ChevronRight className="w-2.5 h-2.5 text-white group-hover/btn:translate-x-0.5 transition-transform" />
                        </button>
                      </div>

                      {/* Bottom Row: Title + Location inline (No overlap, hidden for labs) */}
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-bold text-xs text-white truncate flex-1 leading-snug">
                          {lesson.Description}
                        </h4>
                        {!isLab && lesson.Location && (
                          <div className="shrink-0 max-w-[130px] sm:max-w-[180px]">
                            <RoomBadge location={lesson.Location} size="xs" />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* --- TIER 2: MEDIUM LAYOUT (1.5 - 2 HOURS) --- */}
                  {isMedium && (
                    <div className="flex flex-col justify-between h-full pl-1.5">
                      {/* Top Row: Time + Duration + Badge */}
                      <div className="flex items-center justify-between gap-2 leading-none">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-white flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-white shrink-0" />
                            {lesson.StartDateTime.format("HH:mm")} – {lesson.EndDateTime.format("HH:mm")}
                          </span>
                          <span className="text-[10px] font-bold text-white">
                            ({Math.round((durationMinutes / 60) * 10) / 10}h)
                          </span>
                        </div>

                        <span
                          className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                            isLecture
                              ? "lecture-badge text-white border-transparent"
                              : isLab
                              ? "lab-badge text-white"
                              : isTutorial
                              ? "tutorial-badge"
                              : "bg-white text-black border-white"
                          }`}
                        >
                          {lesson.EventType}
                        </span>
                      </div>

                      {/* Middle: Title & Room (Room hidden for labs) */}
                      <div className="my-auto py-1">
                        <h4 className="font-bold text-xs sm:text-sm text-white line-clamp-2 leading-snug">
                          {lesson.Description}
                        </h4>
                        {!isLab && lesson.Location && (
                          <div className="mt-1.5 flex items-center">
                            <RoomBadge location={lesson.Location} size="sm" />
                          </div>
                        )}
                      </div>

                      {/* Bottom: More Info Button & Lecturer */}
                      <div className="pt-1 mt-auto flex items-center justify-between">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLesson(lesson);
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold bg-black hover:bg-zinc-800 text-white border border-white shadow-xs active:scale-95 transition-all group/btn"
                          title="View class details, groups, and rooms"
                        >
                          <Info className="w-3 h-3 text-white shrink-0" />
                          <span>More Info</span>
                          <ChevronRight className="w-3 h-3 text-white group-hover/btn:translate-x-0.5 transition-transform" />
                        </button>

                        {lesson.staffName && (
                          <span className="text-[11px] font-bold text-white truncate max-w-[160px] hidden sm:inline-block">
                            {lesson.staffName}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* --- TIER 3: EXTENDED LAYOUT (3+ HOURS) --- */}
                  {isExtended && (
                    <div className="flex flex-col justify-between h-full pl-2 space-y-2">
                      {/* Top Row: Time, Extended Duration Tag, Event Badge */}
                      <div className="flex items-center justify-between gap-2 border-b border-white pb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-white shrink-0" />
                            {lesson.StartDateTime.format("HH:mm")} – {lesson.EndDateTime.format("HH:mm")}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black text-white border border-white">
                            {Math.round((durationMinutes / 60) * 10) / 10} hrs session
                          </span>
                        </div>

                        <span
                          className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-lg border ${
                            isLecture
                              ? "lecture-badge text-white border-transparent"
                              : isLab
                              ? "lab-badge text-white"
                              : isTutorial
                              ? "tutorial-badge"
                              : "bg-white text-black border-white"
                          }`}
                        >
                          {lesson.EventType}
                        </span>
                      </div>

                      {/* Main Body: Title, Module Code & Metadata Cards */}
                      <div className="space-y-2 flex-1 my-auto">
                        <div>
                          <h4 className="font-extrabold text-sm sm:text-base text-white leading-snug">
                            {lesson.Description}
                          </h4>
                          <div className="text-[11px] font-mono text-zinc-400 mt-0.5">
                            {lesson.Name}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                          {!isLab && lesson.Location && (
                            <div className="flex items-center">
                              <RoomBadge location={lesson.Location} size="md" />
                            </div>
                          )}

                          {lesson.staffName && (
                            <div className="flex items-center gap-1.5 text-xs text-white bg-black px-2.5 py-1.5 rounded-lg border border-white">
                              <User className="w-3.5 h-3.5 text-white shrink-0" />
                              <span className="truncate font-bold">{lesson.staffName}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Bottom Action Footer */}
                      <div className="pt-2 border-t border-white flex items-center justify-between gap-2 mt-auto">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLesson(lesson);
                          }}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold bg-black hover:bg-zinc-800 text-white border border-white shadow-sm active:scale-95 transition-all group/btn"
                          title="View full session details, groups, and rooms"
                        >
                          <Info className="w-3.5 h-3.5 text-white shrink-0" />
                          <span>Session Details & Groups</span>
                          <ChevronRight className="w-3.5 h-3.5 text-white group-hover/btn:translate-x-0.5 transition-transform" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Lesson Detail Modal */}
      <LessonDetailModal
        lesson={selectedLesson}
        onClose={() => setSelectedLesson(null)}
      />
    </div>
  );
};

