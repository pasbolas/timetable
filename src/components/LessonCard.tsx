import React from "react";
import { MapPin } from "lucide-react";
import { NormalizedLesson } from "../types/timetable";
import { getLessonColorTheme, getLessonGroupRoomStrings } from "../services/transformer";

interface LessonCardProps {
  lesson: NormalizedLesson;
  isActiveNow: boolean;
  isPast: boolean;
  onClick: () => void;
  dataTour?: string;
}

export const LessonCard: React.FC<LessonCardProps> = ({
  lesson,
  isActiveNow,
  isPast,
  onClick,
  dataTour,
}) => {
  const theme = getLessonColorTheme(lesson);

  return (
    <div
      data-tour={dataTour}
      onClick={onClick}
      className={`relative overflow-hidden rounded-xl border transition-colors cursor-pointer active:scale-[0.99] p-3.5 my-2 ${
        theme.bg
      } ${
        isActiveNow
          ? "border-2 border-blue-600 dark:border-blue-400"
          : isPast
          ? "opacity-60 saturate-50 border-stone-200 dark:border-neutral-800"
          : "border-stone-200 dark:border-neutral-800"
      }`}
    >
      {/* Sleek vertical accent line */}
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${theme.accent}`} />

      {/* Top Header: Time and Event Type Pill */}
      <div className="flex items-center justify-between gap-2 mb-1.5 pl-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-900 dark:text-white">
            {lesson.StartDateTime.format("HH:mm")} – {lesson.EndDateTime.format("HH:mm")}
          </span>
          {isActiveNow && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              NOW
            </span>
          )}
        </div>

        <span
          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${theme.pill}`}
        >
          {lesson.EventType}
        </span>
      </div>

      {/* Subject Title */}
      <div className="mb-2 pl-1">
        <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-snug">
          {lesson.Description}
        </h3>
      </div>

      {/* Bottom: Group - Room */}
      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 pl-1 truncate">
        <MapPin className={`w-3.5 h-3.5 ${theme.icon} shrink-0`} />
        <span className="truncate">
          {getLessonGroupRoomStrings(lesson).join(" · ")}
        </span>
      </div>
    </div>
  );
};
