import React, { useState, useMemo } from "react";
import moment from "moment-timezone";
import { Clock, MapPin } from "lucide-react";
import { DayData, NormalizedLesson } from "../types/timetable";
import { EmptyState } from "./EmptyState";
import { LessonDetailModal } from "./LessonDetailModal";
import { getLessonColorTheme, getLessonGroupRoomStrings } from "../services/transformer";

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

  // Determine grid hour bounds (default 8 AM to 7 PM, dynamically expanded if lessons exist outside)
  const { startHour, endHour, hoursList } = useMemo(() => {
    let minH = 9;
    let maxH = 18;

    lessons.forEach((l) => {
      const sH = l.StartDateTime.hour();
      const eH = l.EndDateTime.hour() + (l.EndDateTime.minute() > 0 ? 1 : 0);
      if (sH < minH) minH = Math.max(7, sH);
      if (eH > maxH) maxH = Math.min(22, eH);
    });

    const list: number[] = [];
    for (let h = minH; h <= maxH; h++) {
      list.push(h);
    }
    return { startHour: minH, endHour: maxH, hoursList: list };
  }, [lessons]);

  const HOUR_HEIGHT = 72; // Pixels per hour row

  // Calculate live current time position in pixels
  const nowHour = currentLiveTime.hour();
  const nowMinute = currentLiveTime.minute();
  const isWithinGrid = nowHour >= startHour && nowHour <= endHour;
  const currentMinutesFromStart = (nowHour - startHour) * 60 + nowMinute;
  const currentLiveY = (currentMinutesFromStart / 60) * HOUR_HEIGHT;

  return (
    <div className="w-full pb-2">
      {/* Subheader: Date & class counter */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-2 mb-1">
        <div className="flex items-baseline gap-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            {activeDate.format("dddd, D MMMM")}
          </h2>
          {isToday && (
            <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
              • {currentLiveTime.format("h:mm A")}
            </span>
          )}
        </div>

        {!isLoading && !error && lessons.length > 0 && (
          <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
            {lessons.length} {lessons.length === 1 ? "class" : "classes"}
          </span>
        )}
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="max-w-2xl mx-auto px-4 space-y-3 py-4">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 animate-pulse space-y-2.5"
            >
              <div className="flex justify-between">
                <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-1/4" />
                <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-12" />
              </div>
              <div className="h-4.5 bg-slate-200 dark:bg-slate-800 rounded w-2/3" />
            </div>
          ))}
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
        <div className="max-w-md mx-auto px-4 py-6">
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
          className="relative flex w-full border-t border-slate-200/70 dark:border-slate-800/80 bg-white/20 dark:bg-slate-950/20"
        >
          {/* Left Time Column (Hours Gutter) */}
          <div className="w-16 sm:w-20 shrink-0 border-r border-slate-200/70 dark:border-slate-800/80 relative select-none bg-slate-50/50 dark:bg-slate-900/30">
            {hoursList.map((hour) => (
              <div
                key={hour}
                style={{ height: `${HOUR_HEIGHT}px` }}
                className="relative"
              >
                <span className="absolute -top-2.5 right-2 sm:right-3 text-[11px] font-semibold text-slate-400 dark:text-slate-500 tracking-tight">
                  {formatHourLabel(hour)}
                </span>
              </div>
            ))}

            {/* Live Time Text in Gutter */}
            {isToday && isWithinGrid && (
              <div
                style={{ top: `${currentLiveY}px` }}
                className="absolute right-2 -translate-y-1/2 z-30 pointer-events-none transition-all duration-300"
              >
                <span className="text-[10px] sm:text-[11px] font-extrabold text-blue-600 dark:text-blue-400 bg-white/95 dark:bg-slate-900/95 px-1 py-0.5 rounded shadow-sm ring-1 ring-blue-500/20">
                  {currentLiveTime.format("h:mm A")}
                </span>
              </div>
            )}
          </div>

          {/* Right Main Grid Slot Area */}
          <div className="relative flex-1">
            {/* Grid Divider Lines */}
            {hoursList.map((hour) => (
              <div
                key={hour}
                style={{ height: `${HOUR_HEIGHT}px` }}
                className="border-t first:border-t-0 border-slate-100 dark:border-slate-800/60 w-full"
              />
            ))}

            {/* Live Time Horizontal Line & Blue Dot Indicator */}
            {isToday && isWithinGrid && (
              <div
                style={{ top: `${currentLiveY}px` }}
                className="absolute left-0 right-0 z-20 flex items-center pointer-events-none -translate-y-1/2 transition-all duration-300"
              >
                {/* Blue circle dot at line start */}
                <div className="w-2.5 h-2.5 rounded-full bg-blue-600 dark:bg-blue-400 ring-2 ring-white dark:ring-slate-950 -ml-1.25 shrink-0 shadow-md" />
                {/* Horizontal time guide line */}
                <div className="flex-1 h-[2px] bg-blue-600 dark:bg-blue-400 shadow-sm" />
              </div>
            )}

            {/* Positioned Lesson Cards on the Grid */}
            {lessons.map((lesson, idx) => {
              const theme = getLessonColorTheme(lesson);
              const startMinutes =
                (lesson.StartDateTime.hour() - startHour) * 60 +
                lesson.StartDateTime.minute();
              const durationMinutes = lesson.EndDateTime.diff(
                lesson.StartDateTime,
                "minutes"
              );

              const topPx = (startMinutes / 60) * HOUR_HEIGHT;
              const heightPx = Math.max(
                46,
                (durationMinutes / 60) * HOUR_HEIGHT - 4
              );

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
                  className={`absolute rounded-xl border p-2.5 cursor-pointer shadow-sm transition-all overflow-hidden flex flex-col justify-between active:scale-[0.99] group ${
                    theme.bg
                  } ${
                    active
                      ? "ring-2 ring-blue-500 shadow-md shadow-blue-500/15 z-10"
                      : past
                      ? "opacity-60 saturate-50"
                      : "z-0"
                  }`}
                >
                  {/* Left accent color strip */}
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1.5 ${theme.accent}`}
                  />

                  {/* Top line: Time & Category */}
                  <div className="flex items-center justify-between gap-1.5 pl-1.5 leading-none">
                    <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                      {lesson.StartDateTime.format("HH:mm")} –{" "}
                      {lesson.EndDateTime.format("HH:mm")}
                    </span>

                    <span
                      className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${theme.pill}`}
                    >
                      {lesson.EventType}
                    </span>
                  </div>

                  {/* Title */}
                  <div className="pl-1.5 my-auto py-0.5">
                    <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white line-clamp-2 leading-snug">
                      {lesson.Description}
                    </h4>
                  </div>

                  {/* Bottom: Group - Room */}
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-700 dark:text-slate-300 pl-1.5 truncate">
                    <MapPin className={`w-3 h-3 ${theme.icon} shrink-0`} />
                    <span className="truncate font-medium">
                      {getLessonGroupRoomStrings(lesson).join(" · ")}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Lesson Detail Modal */}
      <LessonDetailModal
        lesson={selectedLesson}
        onClose={() => setSelectedLesson(null)}
      />
    </div>
  );
};

