import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import moment from "moment-timezone";
import { Clock, MapPin, User, Coffee, Users } from "lucide-react";
import { DayData, NormalizedLesson } from "../types/timetable";
import { EmptyState } from "./EmptyState";
import { LessonDetailModal } from "./LessonDetailModal";

interface DesktopWeekGridProps {
  activeDate: moment.Moment;
  onSelectDate: (date: moment.Moment) => void;
  weekSchedule: DayData[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  currentLiveTime: moment.Moment;
  isToday: (date: moment.Moment) => boolean;
  isLessonActive: (start: moment.Moment, end: moment.Moment) => boolean;
  isLessonPast: (end: moment.Moment) => boolean;
  showSevenDays?: boolean;
}

// Convert 24-hour index to 12-hour formatted string (e.g. 9 -> "9 AM", 12 -> "12 PM", 14 -> "2 PM")
function formatHourLabel(hour: number): string {
  if (hour === 0 || hour === 24) return "12 AM";
  if (hour === 12) return "12 PM";
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

interface PositionedLesson {
  lesson: NormalizedLesson;
  column: number;
  totalColumns: number;
}

/**
 * Distribute overlapping lessons in a day across parallel sub-columns
 * so concurrent classes never obscure each other.
 */
function layoutDayLessons(lessons: NormalizedLesson[]): PositionedLesson[] {
  if (lessons.length === 0) return [];

  // Sort by StartDateTime ascending, then duration descending
  const sorted = [...lessons].sort((a, b) => {
    const startDiff = a.StartDateTime.valueOf() - b.StartDateTime.valueOf();
    if (startDiff !== 0) return startDiff;
    return b.EndDateTime.valueOf() - a.EndDateTime.valueOf();
  });

  // Group into overlapping clusters
  const clusters: NormalizedLesson[][] = [];
  let currentCluster: NormalizedLesson[] = [];
  let clusterEnd: moment.Moment | null = null;

  sorted.forEach((lesson) => {
    if (!clusterEnd || lesson.StartDateTime.isBefore(clusterEnd)) {
      currentCluster.push(lesson);
      if (!clusterEnd || lesson.EndDateTime.isAfter(clusterEnd)) {
        clusterEnd = lesson.EndDateTime;
      }
    } else {
      clusters.push(currentCluster);
      currentCluster = [lesson];
      clusterEnd = lesson.EndDateTime;
    }
  });

  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  const results: PositionedLesson[] = [];

  clusters.forEach((cluster) => {
    // Greedy placement in sub-columns
    const columnEnds: moment.Moment[] = [];
    const positions: { lesson: NormalizedLesson; col: number }[] = [];

    cluster.forEach((lesson) => {
      let placed = false;
      for (let i = 0; i < columnEnds.length; i++) {
        if (!columnEnds[i].isAfter(lesson.StartDateTime)) {
          columnEnds[i] = lesson.EndDateTime;
          positions.push({ lesson, col: i });
          placed = true;
          break;
        }
      }
      if (!placed) {
        columnEnds.push(lesson.EndDateTime);
        positions.push({ lesson, col: columnEnds.length - 1 });
      }
    });

    const totalCols = columnEnds.length;
    positions.forEach((pos) => {
      results.push({
        lesson: pos.lesson,
        column: pos.col,
        totalColumns: totalCols,
      });
    });
  });

  return results;
}

export const DesktopWeekGrid: React.FC<DesktopWeekGridProps> = ({
  activeDate,
  onSelectDate,
  weekSchedule,
  isLoading,
  error,
  onRetry,
  currentLiveTime,
  isToday,
  isLessonActive,
  isLessonPast,
  showSevenDays = false,
}) => {
  const [selectedLesson, setSelectedLesson] = useState<NormalizedLesson | null>(null);

  // Check if Saturday or Sunday has scheduled classes in this week
  const hasWeekendClasses = useMemo(() => {
    return weekSchedule.some((d) => {
      const isoDay = d.day.isoWeekday();
      return (isoDay === 6 || isoDay === 7) && d.lessons.length > 0;
    });
  }, [weekSchedule]);

  const displaySevenDays = showSevenDays || hasWeekendClasses;

  // Days to display on grid
  const displayedDays = useMemo(() => {
    if (weekSchedule.length === 0) return [];
    return displaySevenDays ? weekSchedule.slice(0, 7) : weekSchedule.slice(0, 5);
  }, [weekSchedule, displaySevenDays]);

  // Calculate earliest start hour and latest end hour across all displayed days
  const { startHour, endHour, hoursList } = useMemo(() => {
    let minH = 9;
    let maxH = 18;

    displayedDays.forEach((day) => {
      day.lessons.forEach((l) => {
        const sH = l.StartDateTime.hour();
        const eH = l.EndDateTime.hour() + (l.EndDateTime.minute() > 0 ? 1 : 0);
        if (sH < minH) minH = Math.max(7, sH);
        if (eH > maxH) maxH = Math.min(22, eH);
      });
    });

    const list: number[] = [];
    for (let h = minH; h <= maxH; h++) {
      list.push(h);
    }
    return { startHour: minH, endHour: maxH, hoursList: list };
  }, [displayedDays]);

  const HOUR_HEIGHT = 70; // Pixels per hour row
  const GRID_PADDING_Y = 14;

  // Total classes scheduled in this week
  const totalClassesCount = useMemo(() => {
    return displayedDays.reduce((acc, d) => acc + d.lessons.length, 0);
  }, [displayedDays]);

  // Live time position
  const nowHour = currentLiveTime.hour();
  const nowMinute = currentLiveTime.minute();
  const isWithinGridHours = nowHour >= startHour && nowHour <= endHour;
  const currentMinutesFromStart = (nowHour - startHour) * 60 + nowMinute;
  const currentLiveY = GRID_PADDING_Y + (currentMinutesFromStart / 60) * HOUR_HEIGHT;

  // Active week key for seamless blur and unblur transitions
  const weekStartMoment = activeDate.clone().startOf("isoWeek");
  const weekKey = displayedDays[0]?.dateKey || weekStartMoment.format("YYYY-MM-DD");

  // Pure blur and unblur crossfade variants for week transitions (no panning/sliding)
  const weekBlurVariants = {
    enter: {
      opacity: 0,
      filter: "blur(12px)",
    },
    center: {
      opacity: 1,
      filter: "blur(0px)",
      transition: {
        duration: 0.28,
        ease: "easeOut",
      },
      transitionEnd: {
        filter: "none",
      },
    },
    exit: {
      opacity: 0,
      filter: "blur(12px)",
      transition: {
        duration: 0.18,
        ease: "easeIn",
      },
    },
  };

  return (
    <div className="w-full flex-1 min-h-0 flex flex-col max-w-[1600px] mx-auto px-2 sm:px-4 lg:px-6 pt-3 pb-3 overflow-hidden">

      {/* Loading Skeleton (Only on initial cold start when no days are loaded) */}
      {isLoading && displayedDays.length === 0 && (
        <div className="w-full flex-1 min-h-0 rounded-2xl border-2 border-white bg-black/60 backdrop-blur-xs overflow-hidden mb-2 animate-pulse select-none">
          <div className="grid grid-cols-[60px_repeat(5,1fr)] border-b-2 border-white bg-black/80 shrink-0">
            <div className="p-3 border-r-2 border-white" />
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className={`p-3 text-center ${i < 4 ? "border-r-2 border-white/20" : ""}`}>
                <div className="h-4 w-16 bg-zinc-700 rounded mx-auto mb-1" />
                <div className="h-3 w-10 bg-zinc-800 rounded mx-auto" />
              </div>
            ))}
          </div>
          <div className="h-[560px] grid grid-cols-[60px_repeat(5,1fr)]">
            <div className="border-r-2 border-white bg-black/60 flex flex-col justify-between py-4 px-2">
              {[9, 11, 13, 15, 17].map((h) => (
                <div key={h} className="h-3 w-8 bg-zinc-700/60 rounded" />
              ))}
            </div>
            {[0, 1, 2, 3, 4].map((col) => (
              <div key={col} className={`p-2 space-y-3 relative ${col < 4 ? "border-r-2 border-white/20" : ""}`}>
                {col % 2 === 0 ? (
                  <div className="h-28 rounded-xl border-2 border-white/30 bg-zinc-900 p-2" />
                ) : (
                  <div className="h-36 rounded-xl border-2 border-white/30 bg-zinc-900 p-2 mt-12" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error State */}
      {!isLoading && error && (
        <div className="max-w-md mx-auto my-12 px-4">
          <EmptyState type="error" errorMessage={error} onRetry={onRetry} />
        </div>
      )}

      {/* Fallback Empty State if no days data available at all */}
      {!isLoading && !error && displayedDays.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center py-16 px-4 select-none">
          <div className="max-w-md w-full p-6 rounded-2xl border-2 border-white bg-black/90 backdrop-blur-md shadow-sm text-center text-white">
            <div className="w-12 h-12 rounded-xl bg-zinc-900 border-2 border-white flex items-center justify-center mx-auto mb-3">
              <Coffee className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-black text-white mb-1">
              No Classes Scheduled This Week
            </h3>
            <p className="text-xs font-bold text-zinc-400 mb-4">
              Enjoy your free time, or check the previous or upcoming weeks for class timetables.
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => onSelectDate(activeDate.clone().subtract(1, "week"))}
                className="px-3 py-1.5 rounded-xl border-2 border-white text-xs font-bold hover:bg-zinc-900 transition-colors text-white"
              >
                ‹ Previous Week
              </button>
              <button
                onClick={() => onSelectDate(activeDate.clone().add(1, "week"))}
                className="px-3 py-1.5 rounded-xl border-2 border-white bg-white text-black text-xs font-bold hover:bg-zinc-200 transition-colors"
              >
                Next Week ›
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2D Week Grid Timetable View */}
      {!error && displayedDays.length > 0 && (
        <div className="w-full flex-1 min-h-0 flex flex-col rounded-2xl border-2 border-white bg-transparent overflow-hidden shadow-sm relative">
          {/* Subtle loading shimmer during background week fetches */}
          {isLoading && (
            <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-white/20 overflow-hidden z-40 pointer-events-none">
              <div className="h-full bg-white w-1/3 animate-indeterminate-bar" />
            </div>
          )}

          {/* Scrollable Container: Sticky header and grid share the exact same width and scrollbar */}
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden relative">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={weekKey}
                variants={weekBlurVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="w-full flex flex-col min-h-full"
              >
            {/* Pinned Sticky Top Header Row: Day Columns Header */}
            <div
              className={`sticky top-0 z-30 grid border-b-2 border-white bg-black/85 backdrop-blur-md select-none ${
                displaySevenDays
                  ? "grid-cols-[60px_repeat(7,minmax(0,1fr))]"
                  : "grid-cols-[60px_repeat(5,minmax(0,1fr))]"
              }`}
            >
              {/* Top-left corner time label */}
              <div className="p-2.5 border-r-2 border-white flex items-center justify-center bg-black/70 backdrop-blur-xs select-none">
                <Clock className="w-4 h-4 text-white/70" />
              </div>

              {/* Day Header Cells */}
              {displayedDays.map((dayData, idx) => {
                const isCurrentDay = isToday(dayData.day);
                const isSelectedDay = activeDate.isSame(dayData.day, "day");
                const isLast = idx === displayedDays.length - 1;

                return (
                  <div
                    key={dayData.dateKey}
                    onClick={() => onSelectDate(dayData.day)}
                    className={`p-2 sm:p-2.5 text-center cursor-pointer transition-colors select-none ${
                      !isLast ? "border-r-2 border-white/20" : ""
                    } ${
                      isCurrentDay
                        ? "bg-white text-black"
                        : isSelectedDay
                        ? "bg-zinc-900 text-white shadow-xs font-black border-b-2 border-white"
                        : "bg-transparent text-white hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span
                        className={`text-xs sm:text-sm font-black uppercase tracking-tight ${
                          isCurrentDay ? "text-black" : "text-white"
                        }`}
                      >
                        {dayData.day.format("ddd")}
                      </span>
                      <span
                        className={`text-xs font-bold ${
                          isCurrentDay ? "text-black/80" : "text-zinc-400"
                        }`}
                      >
                        {dayData.day.format("D MMM")}
                      </span>
                    </div>

                    <div className="flex items-center justify-center gap-1 mt-0.5">
                      {isCurrentDay ? (
                        <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded bg-black text-white">
                          TODAY
                        </span>
                      ) : dayData.lessons.length > 0 ? (
                        <span className="text-[11px] font-bold text-zinc-400">
                          {dayData.lessons.length} {dayData.lessons.length === 1 ? "class" : "classes"}
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium text-zinc-500">
                          Free
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Main 2D Hour Stream Grid */}
            <div
              className={`relative grid ${
                displaySevenDays
                  ? "grid-cols-[60px_repeat(7,minmax(0,1fr))]"
                  : "grid-cols-[60px_repeat(5,minmax(0,1fr))]"
              }`}
              style={{
                height: `${(endHour - startHour) * HOUR_HEIGHT + GRID_PADDING_Y * 2}px`,
              }}
            >
            {/* Left Hours Gutter */}
            <div
              style={{
                paddingTop: `${GRID_PADDING_Y}px`,
                paddingBottom: `${GRID_PADDING_Y}px`,
              }}
              className="border-r-2 border-white bg-black/75 backdrop-blur-xs relative select-none"
            >
              {hoursList.map((hour) => {
                const isLast = hour === endHour;
                return (
                  <div
                    key={hour}
                    style={{ height: isLast ? "0px" : `${HOUR_HEIGHT}px` }}
                    className="relative"
                  >
                    <span className="absolute top-0 -translate-y-1/2 right-2 text-[11px] font-black text-white tracking-tight">
                      {formatHourLabel(hour)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Day Columns */}
            {displayedDays.map((dayData, colIdx) => {
              const isCurrentDay = isToday(dayData.day);
              const isLast = colIdx === displayedDays.length - 1;
              const positionedLessons = layoutDayLessons(dayData.lessons);
              const breaks = dayData.breaks || [];

              return (
                <div
                  key={dayData.dateKey}
                  style={{
                    paddingTop: `${GRID_PADDING_Y}px`,
                    paddingBottom: `${GRID_PADDING_Y}px`,
                  }}
                  className={`relative min-h-full ${
                    !isLast ? "border-r-2 border-white/15" : ""
                  } ${isCurrentDay ? "bg-white/[0.04] backdrop-blur-[1px]" : "bg-transparent"}`}
                >
                  {/* Horizontal Hour Dividing Lines */}
                  {hoursList.map((hour) => {
                    const isLastHour = hour === endHour;
                    return (
                      <div
                        key={hour}
                        style={{ height: isLastHour ? "0px" : `${HOUR_HEIGHT}px` }}
                        className="border-t border-white/15 w-full pointer-events-none"
                      />
                    );
                  })}

                  {/* Empty Day Indicator (Only when other days have classes to avoid visual clutter) */}
                  {totalClassesCount > 0 && dayData.lessons.length === 0 && (
                    <div className="absolute inset-x-2 top-28 flex flex-col items-center justify-center p-3 rounded-xl border border-dashed border-white/25 bg-black/50 backdrop-blur-xs text-center pointer-events-none select-none">
                      <Coffee className="w-4 h-4 text-white/50 mb-1" />
                      <span className="text-[11px] font-bold text-white/60">
                        No classes
                      </span>
                    </div>
                  )}

                  {/* Positioned Breaks */}
                  {breaks.map((breakItem) => {
                    if (breakItem.durationMinutes < 30) return null;

                    const startMinutes =
                      (breakItem.start.hour() - startHour) * 60 +
                      breakItem.start.minute();
                    const topPx =
                      GRID_PADDING_Y + (startMinutes / 60) * HOUR_HEIGHT;
                    const heightPx = Math.max(
                      28,
                      (breakItem.durationMinutes / 60) * HOUR_HEIGHT - 6
                    );

                    return (
                      <div
                        key={breakItem.id}
                        style={{
                          top: `${topPx + 3}px`,
                          height: `${heightPx}px`,
                          left: "4px",
                          right: "4px",
                        }}
                        className="absolute rounded-lg border border-white/30 bg-black/70 backdrop-blur-xs bg-break-stripes overflow-hidden select-none flex items-center justify-between px-2 text-[10px] font-bold text-white/70 pointer-events-none z-0"
                      >
                        <div className="flex items-center gap-1 truncate">
                          <Coffee className="w-3 h-3 text-white/60 shrink-0" />
                          <span className="truncate">
                            Break ({breakItem.durationMinutes}m)
                          </span>
                        </div>
                        <span className="text-[9px] text-white/50 shrink-0">
                          {breakItem.start.format("HH:mm")}
                        </span>
                      </div>
                    );
                  })}

                  {/* Positioned Lesson Cards */}
                  {positionedLessons.map(({ lesson, column, totalColumns }) => {
                    const startMinutes =
                      (lesson.StartDateTime.hour() - startHour) * 60 +
                      lesson.StartDateTime.minute();
                    const durationMinutes = lesson.EndDateTime.diff(
                      lesson.StartDateTime,
                      "minutes"
                    );

                    const topPx =
                      GRID_PADDING_Y + (startMinutes / 60) * HOUR_HEIGHT;
                    const heightPx = Math.max(
                      46,
                      (durationMinutes / 60) * HOUR_HEIGHT - 4
                    );

                    const active =
                      isCurrentDay &&
                      isLessonActive(lesson.StartDateTime, lesson.EndDateTime);
                    const past = isCurrentDay && isLessonPast(lesson.EndDateTime);

                    // Sub-column layout for overlapping lessons
                    const colWidth = 100 / totalColumns;
                    const leftPercent = column * colWidth;

                    const isShort = durationMinutes <= 60;
                    const isLab =
                      lesson.EventType?.toLowerCase().includes("lab") ||
                      Boolean(lesson.collapsedLocations);
                    const isLecture =
                      lesson.EventType?.toLowerCase().includes("lecture") ||
                      lesson.EventType?.toLowerCase() === "lec";

                    return (
                      <div
                        key={lesson.id}
                        onClick={() => setSelectedLesson(lesson)}
                        style={{
                          top: `${topPx + 2}px`,
                          height: `${heightPx}px`,
                          left: `calc(${leftPercent}% + 3px)`,
                          width: `calc(${colWidth}% - 6px)`,
                        }}
                        className={`absolute rounded-xl border-2 border-white bg-black cursor-pointer overflow-hidden flex flex-col justify-between transition-all p-2 group hover:bg-zinc-900 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99] shadow-xs ${
                          active
                            ? "ring-2 ring-white border-white z-10 shadow-sm"
                            : past
                            ? "opacity-65 z-0"
                            : "z-0"
                        }`}
                        title={`${lesson.Description} (${lesson.StartDateTime.format(
                          "HH:mm"
                        )} – ${lesson.EndDateTime.format("HH:mm")})`}
                      >
                        {/* Left accent bar */}
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-white" />

                        {/* Top: Time + Type Badge */}
                        <div className="flex items-center justify-between gap-1 leading-none pl-1">
                          <span className="text-[10px] font-bold text-white flex items-center gap-1 truncate">
                            <Clock className="w-2.5 h-2.5 text-white shrink-0" />
                            {lesson.StartDateTime.format("HH:mm")} – {lesson.EndDateTime.format("HH:mm")}
                          </span>
                          <span
                            className={`text-[8px] font-extrabold uppercase tracking-wider px-1 py-0.5 rounded shrink-0 ${
                              isLecture
                                ? "bg-[#228B22] text-white"
                                : "bg-white text-black"
                            }`}
                          >
                            {lesson.EventType}
                          </span>
                        </div>

                        {/* Middle: Title */}
                        <div className="pl-1 my-auto">
                          <h4
                            className={`font-bold text-white leading-tight line-clamp-2 ${
                              isShort ? "text-[11px]" : "text-xs"
                            }`}
                          >
                            {lesson.Description}
                          </h4>
                        </div>

                        {/* Bottom: Location & Staff (if room available) */}
                        <div className="pl-1 flex items-center justify-between gap-1 text-[10px] font-bold text-white/80">
                          {!isLab && lesson.Location ? (
                            <span className="flex items-center gap-0.5 truncate" title={lesson.Location}>
                              <MapPin className="w-2.5 h-2.5 text-white shrink-0" />
                              <span className="truncate">{lesson.Location}</span>
                            </span>
                          ) : isLab && lesson.collapsedLocations ? (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-white bg-zinc-900 px-1.5 py-0.5 rounded border border-white/20 shrink-0" title="Click to view lab groups and rooms">
                              <Users className="w-2.5 h-2.5 text-white shrink-0" />
                              <span>{lesson.Locations?.length ? `${lesson.Locations.length} Groups` : "Lab Info"}</span>
                            </span>
                          ) : (
                            <span className="text-[9px] text-zinc-400 font-mono truncate">
                              {lesson.Name}
                            </span>
                          )}

                          {lesson.staffName && heightPx >= 80 && (
                            <span className="flex items-center gap-0.5 truncate text-[9px] text-zinc-400" title={lesson.staffName}>
                              <User className="w-2.5 h-2.5 text-white shrink-0" />
                              <span className="truncate max-w-[80px]">{lesson.staffName}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Current Live Time Marker (Only on Today's column) */}
                  {isCurrentDay && isWithinGridHours && (
                    <div
                      style={{ top: `${currentLiveY}px` }}
                      className="absolute left-0 right-0 z-20 flex items-center pointer-events-none -translate-y-1/2"
                    >
                      <div className="w-2.5 h-2.5 rounded-full bg-white border-2 border-black ring-2 ring-white shrink-0 -ml-1.5 relative z-10" />
                      <div className="flex-1 h-[2px] bg-white" />
                      <span className="text-[9px] font-black bg-white text-black px-1 py-0.2 rounded shadow-xs ml-1 mr-1 shrink-0">
                        {currentLiveTime.format("h:mm A")}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Centered Empty Week Overlay Message */}
            {totalClassesCount === 0 && (
              <div className="absolute inset-0 left-[60px] flex items-center justify-center p-4 z-20 pointer-events-none select-none">
                <div className="max-w-md w-full p-6 sm:p-7 rounded-2xl border-2 border-white bg-black/90 backdrop-blur-md shadow-lg text-center pointer-events-auto">
                  <div className="w-12 h-12 rounded-xl bg-zinc-900 border-2 border-white flex items-center justify-center mx-auto mb-3 shadow-xs">
                    <Coffee className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-black text-white mb-1">
                    No Classes Scheduled This Week
                  </h3>
                  <p className="text-xs font-bold text-zinc-400 mb-4">
                    Enjoy your free time, or check the previous or upcoming weeks for class timetables.
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => onSelectDate(activeDate.clone().subtract(1, "week"))}
                      className="px-3.5 py-1.5 rounded-xl border-2 border-white text-xs font-bold hover:bg-zinc-900 transition-colors bg-black text-white shadow-xs active:scale-95 cursor-pointer"
                    >
                      ‹ Previous Week
                    </button>
                    <button
                      onClick={() => onSelectDate(activeDate.clone().add(1, "week"))}
                      className="px-3.5 py-1.5 rounded-xl border-2 border-white bg-white text-black text-xs font-bold hover:bg-zinc-200 transition-colors shadow-xs active:scale-95 cursor-pointer"
                    >
                      Next Week ›
                    </button>
                  </div>
                </div>
              </div>
            )}
            </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Class Details Modal */}
      <LessonDetailModal
        lesson={selectedLesson}
        onClose={() => setSelectedLesson(null)}
      />
    </div>
  );
};
