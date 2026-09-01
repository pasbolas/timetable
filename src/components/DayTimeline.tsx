import React, { useState } from "react";
import moment from "moment-timezone";
import { DayData, NormalizedLesson } from "../types/timetable";
import { LessonCard } from "./LessonCard";
import { BreakCard } from "./BreakCard";
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

  // Combine lessons and breaks into a unified chronological stream
  interface TimelineItem {
    type: "lesson" | "break";
    sortTime: number;
    lesson?: NormalizedLesson;
    breakItem?: (typeof breaks)[0];
  }

  const timelineItems: TimelineItem[] = [];
  lessons.forEach((lesson) => {
    timelineItems.push({
      type: "lesson",
      sortTime: lesson.StartDateTime.valueOf(),
      lesson,
    });
  });

  breaks.forEach((b) => {
    timelineItems.push({
      type: "break",
      sortTime: b.start.valueOf(),
      breakItem: b,
    });
  });

  timelineItems.sort((a, b) => a.sortTime - b.sortTime);

  return (
    <div className="max-w-2xl mx-auto px-3.5 py-3">
      {/* Micro Day Subheader */}
      <div className="flex items-center justify-between py-1 mb-2">
        <div className="flex items-baseline gap-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            {activeDate.format("dddd, D MMMM")}
          </h2>
          {isToday && (
            <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
              • {currentLiveTime.format("HH:mm")}
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
        <div className="space-y-2 py-2">
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
              <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {!isLoading && error && (
        <EmptyState
          type="error"
          errorMessage={error}
          onRetry={onRetry}
        />
      )}

      {/* Empty States */}
      {!isLoading && !error && lessons.length === 0 && (
        <EmptyState
          type={isWeekend ? "weekend" : "free-day"}
          date={activeDate}
        />
      )}

      {/* Timeline Stream */}
      {!isLoading && !error && timelineItems.length > 0 && (
        <div data-tour="timeline-stream" className="space-y-0.5">
          {timelineItems.map((item, idx) => {
            if (item.type === "break" && item.breakItem) {
              return (
                <BreakCard
                  key={item.breakItem.id}
                  dayBreak={item.breakItem}
                />
              );
            }

            if (item.type === "lesson" && item.lesson) {
              const active = isToday && isLessonActive(item.lesson.StartDateTime, item.lesson.EndDateTime);
              const past = isToday && isLessonPast(item.lesson.EndDateTime);
              // Mark the first lesson card for tour spotlighting
              const isFirstLesson = !timelineItems.slice(0, idx).some((it) => it.type === "lesson");

              return (
                <LessonCard
                  key={item.lesson.id}
                  lesson={item.lesson}
                  isActiveNow={active}
                  isPast={past}
                  onClick={() => setSelectedLesson(item.lesson!)}
                  dataTour={isFirstLesson ? "lesson-card" : undefined}
                />
              );
            }

            return null;
          })}
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
