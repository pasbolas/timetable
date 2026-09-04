import React, { useState, useMemo } from "react";
import moment from "moment-timezone";
import { Clock, Info, ChevronRight, MapPin, User } from "lucide-react";
import { DayData, NormalizedLesson } from "../types/timetable";
import { EmptyState } from "./EmptyState";
import { LessonDetailModal } from "./LessonDetailModal";

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

  return (
    <div
      className={`w-full flex-1 flex flex-col ${
        !isLoading && !error && lessons.length === 0
          ? "h-full overflow-hidden"
          : ""
      }`}
    >
      {/* Subheader: Date & class counter - Sticky below TopBar at top of scrollport */}
      <div
        className="sticky z-20 bg-white border-b-2 border-black flex items-center justify-between px-4 sm:px-6 py-2.5 transition-colors"
        style={{ top: "calc(54px + env(safe-area-inset-top, 0px))" }}
      >
        <div className="flex items-baseline gap-2">
          <h2 className="text-base font-black text-black">
            {activeDate.format("dddd, D MMMM")}
          </h2>
          {isToday && (
            <span className="text-[11px] font-bold text-black">
              • {currentLiveTime.format("h:mm A")}
            </span>
          )}
        </div>

        {!isLoading && !error && lessons.length > 0 && (
          <span className="text-[11px] font-bold text-black">
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
              className="p-4 rounded-2xl bg-white border-2 border-black animate-pulse space-y-2.5"
            >
              <div className="flex justify-between">
                <div className="h-3.5 bg-zinc-200 rounded w-1/4" />
                <div className="h-3.5 bg-zinc-200 rounded w-12" />
              </div>
              <div className="h-4.5 bg-zinc-200 rounded w-2/3" />
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
        <div
          className="max-w-md mx-auto px-4 flex-1 flex flex-col items-center justify-center select-none"
          style={{
            paddingBottom: "calc(80px + env(safe-area-inset-bottom, 0px))",
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
          className="relative flex-1 flex w-full bg-white min-h-[calc(100vh-100px)]"
        >
          {/* Left Time Column (Hours Gutter) */}
          <div
            style={{
              paddingTop: `${GRID_PADDING_Y}px`,
              paddingBottom: "calc(130px + env(safe-area-inset-bottom, 0px))",
            }}
            className="w-16 sm:w-20 shrink-0 border-r-2 border-black relative select-none bg-white min-h-full"
          >
            {hoursList.map((hour) => {
              const isLast = hour === endHour;
              return (
                <div
                  key={hour}
                  style={{ height: isLast ? "0px" : `${HOUR_HEIGHT}px` }}
                  className="relative"
                >
                  <span className="absolute top-0 -translate-y-1/2 right-2 sm:right-3 text-[11px] font-black text-black tracking-tight">
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
                  className="absolute right-0 w-[3px] bg-black pointer-events-none"
                  aria-hidden="true"
                >
                  {/* Elapsed day progress fill */}
                  <div
                    style={{ height: `${Math.max(0, currentLiveY - GRID_PADDING_Y)}px` }}
                    className="w-full bg-black"
                  />
                </div>

                {/* Floating Current Time Pill Badge */}
                <div
                  style={{ top: `${currentLiveY}px` }}
                  className="absolute right-2 -translate-y-1/2 z-30 pointer-events-none flex items-center justify-end"
                >
                  <span className="text-[10px] sm:text-[11px] font-bold text-black bg-white px-1.5 py-0.5 rounded border-2 border-black flex items-center gap-1 shadow-sm">
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
            className="relative flex-1 min-h-full bg-white"
          >
            {/* Grid Divider Lines */}
            {hoursList.map((hour) => {
              const isLast = hour === endHour;
              return (
                <div
                  key={hour}
                  style={{ height: isLast ? "0px" : `${HOUR_HEIGHT}px` }}
                  className="border-t border-black w-full"
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
                  <div className="w-3 h-3 rounded-full bg-black border-2 border-white ring-2 ring-black relative z-10" />
                </div>
                {/* Horizontal slider beam (solid 2D line) */}
                <div className="flex-1 h-[2px] bg-black" />
              </div>
            )}

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
                  className={`absolute rounded-xl border-2 border-black cursor-pointer transition-colors overflow-hidden flex flex-col justify-between active:scale-[0.99] group bg-white hover:bg-zinc-50 ${
                    isCompact
                      ? "p-2 sm:px-2.5 sm:py-2"
                      : isExtended
                        ? "p-3 sm:p-4"
                        : "p-2.5 sm:p-3"
                  } ${
                    active
                      ? "ring-2 ring-black border-black z-10"
                      : past
                        ? "opacity-60 border-black z-0"
                        : "border-black z-0"
                  }`}
                >
                  {/* Left accent black strip */}
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-black" />

                  {/* --- TIER 1: COMPACT LAYOUT (1 HOUR / <= 60 MINS) --- */}
                  {isCompact && (
                    <div className="flex flex-col justify-between h-full pl-1.5">
                      {/* Top Row: Time + Badge + Tucked Mini Info Button */}
                      <div className="flex items-center justify-between gap-1 leading-none">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-[11px] font-bold text-black flex items-center gap-1 shrink-0">
                            <Clock className="w-3 h-3 text-black shrink-0" />
                            {lesson.StartDateTime.format("HH:mm")} – {lesson.EndDateTime.format("HH:mm")}
                          </span>
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md truncate bg-black text-white border border-black">
                            {lesson.EventType}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLesson(lesson);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-white hover:bg-zinc-100 text-black border border-black shadow-xs active:scale-95 transition-all group/btn shrink-0"
                          title="View class details"
                        >
                          <span>Info</span>
                          <ChevronRight className="w-2.5 h-2.5 text-black group-hover/btn:translate-x-0.5 transition-transform" />
                        </button>
                      </div>

                      {/* Bottom Row: Title + Location inline (No overlap, hidden for labs) */}
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-bold text-xs text-black truncate flex-1 leading-snug">
                          {lesson.Description}
                        </h4>
                        {!isLab && lesson.Location && (
                          <span className="text-[10px] font-bold text-black flex items-center gap-0.5 shrink-0">
                            <MapPin className="w-2.5 h-2.5 text-black shrink-0" />
                            <span className="truncate max-w-[110px] sm:max-w-[160px]">
                              {lesson.Location}
                            </span>
                          </span>
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
                          <span className="text-[11px] font-bold text-black flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-black shrink-0" />
                            {lesson.StartDateTime.format("HH:mm")} – {lesson.EndDateTime.format("HH:mm")}
                          </span>
                          <span className="text-[10px] font-bold text-black">
                            ({Math.round((durationMinutes / 60) * 10) / 10}h)
                          </span>
                        </div>

                        <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-black text-white border border-black">
                          {lesson.EventType}
                        </span>
                      </div>

                      {/* Middle: Title & Room (Room hidden for labs) */}
                      <div className="my-auto py-1">
                        <h4 className="font-bold text-xs sm:text-sm text-black line-clamp-2 leading-snug">
                          {lesson.Description}
                        </h4>
                        {!isLab && lesson.Location && (
                          <div className="flex items-center gap-1 text-[11px] font-bold text-black mt-1">
                            <MapPin className="w-3 h-3 text-black shrink-0" />
                            <span className="truncate">{lesson.Location}</span>
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
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold bg-white hover:bg-zinc-100 text-black border border-black shadow-xs active:scale-95 transition-all group/btn"
                          title="View class details, groups, and rooms"
                        >
                          <Info className="w-3 h-3 text-black shrink-0" />
                          <span>More Info</span>
                          <ChevronRight className="w-3 h-3 text-black group-hover/btn:translate-x-0.5 transition-transform" />
                        </button>

                        {lesson.staffName && (
                          <span className="text-[11px] font-bold text-black truncate max-w-[160px] hidden sm:inline-block">
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
                      <div className="flex items-center justify-between gap-2 border-b border-black pb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-black flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-black shrink-0" />
                            {lesson.StartDateTime.format("HH:mm")} – {lesson.EndDateTime.format("HH:mm")}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-black border border-black">
                            {Math.round((durationMinutes / 60) * 10) / 10} hrs session
                          </span>
                        </div>

                        <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-black text-white border border-black">
                          {lesson.EventType}
                        </span>
                      </div>

                      {/* Main Body: Title, Module Code & Metadata Cards */}
                      <div className="space-y-2 flex-1 my-auto">
                        <div>
                          <h4 className="font-extrabold text-sm sm:text-base text-black leading-snug">
                            {lesson.Description}
                          </h4>
                          <div className="text-[11px] font-mono text-black mt-0.5">
                            {lesson.Name}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                          {!isLab && lesson.Location && (
                            <div className="flex items-center gap-1.5 text-xs text-black bg-white px-2.5 py-1.5 rounded-lg border border-black">
                              <MapPin className="w-3.5 h-3.5 text-black shrink-0" />
                              <span className="truncate font-bold">{lesson.Location}</span>
                            </div>
                          )}

                          {lesson.staffName && (
                            <div className="flex items-center gap-1.5 text-xs text-black bg-white px-2.5 py-1.5 rounded-lg border border-black">
                              <User className="w-3.5 h-3.5 text-black shrink-0" />
                              <span className="truncate font-bold">{lesson.staffName}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Bottom Action Footer */}
                      <div className="pt-2 border-t border-black flex items-center justify-between gap-2 mt-auto">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLesson(lesson);
                          }}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-zinc-100 text-black border border-black shadow-sm active:scale-95 transition-all group/btn"
                          title="View full session details, groups, and rooms"
                        >
                          <Info className="w-3.5 h-3.5 text-black shrink-0" />
                          <span>Session Details & Groups</span>
                          <ChevronRight className="w-3.5 h-3.5 text-black group-hover/btn:translate-x-0.5 transition-transform" />
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

      {/* Lesson Detail Modal */}
      <LessonDetailModal
        lesson={selectedLesson}
        onClose={() => setSelectedLesson(null)}
      />
    </div>
  );
};

