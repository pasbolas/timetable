import React from "react";
import { MapPin, User, Users } from "lucide-react";
import { NormalizedLesson } from "../types/timetable";
import { getEventCategory } from "../services/transformer";

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
  const category = getEventCategory(lesson.EventType);

  // Minimal theme accent tokens
  const themeStyles = {
    lecture: {
      bg: "bg-blue-50/50 hover:bg-blue-50 dark:bg-slate-900/80 dark:hover:bg-slate-900 border-slate-200/80 dark:border-slate-800",
      accent: "bg-blue-600",
      pill: "bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300",
      roomIcon: "text-blue-600 dark:text-blue-400",
    },
    laboratory: {
      bg: "bg-purple-50/50 hover:bg-purple-50 dark:bg-slate-900/80 dark:hover:bg-slate-900 border-slate-200/80 dark:border-slate-800",
      accent: "bg-purple-600",
      pill: "bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300",
      roomIcon: "text-purple-600 dark:text-purple-400",
    },
    tutorial: {
      bg: "bg-emerald-50/50 hover:bg-emerald-50 dark:bg-slate-900/80 dark:hover:bg-slate-900 border-slate-200/80 dark:border-slate-800",
      accent: "bg-emerald-600",
      pill: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300",
      roomIcon: "text-emerald-600 dark:text-emerald-400",
    },
    studio: {
      bg: "bg-amber-50/50 hover:bg-amber-50 dark:bg-slate-900/80 dark:hover:bg-slate-900 border-slate-200/80 dark:border-slate-800",
      accent: "bg-amber-600",
      pill: "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300",
      roomIcon: "text-amber-600 dark:text-amber-400",
    },
    clinical: {
      bg: "bg-rose-50/50 hover:bg-rose-50 dark:bg-slate-900/80 dark:hover:bg-slate-900 border-slate-200/80 dark:border-slate-800",
      accent: "bg-rose-600",
      pill: "bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300",
      roomIcon: "text-rose-600 dark:text-rose-400",
    },
    kitchen: {
      bg: "bg-lime-50/50 hover:bg-lime-50 dark:bg-slate-900/80 dark:hover:bg-slate-900 border-slate-200/80 dark:border-slate-800",
      accent: "bg-lime-600",
      pill: "bg-lime-100 text-lime-800 dark:bg-lime-950/80 dark:text-lime-300",
      roomIcon: "text-lime-600 dark:text-lime-400",
    },
    music: {
      bg: "bg-fuchsia-50/50 hover:bg-fuchsia-50 dark:bg-slate-900/80 dark:hover:bg-slate-900 border-slate-200/80 dark:border-slate-800",
      accent: "bg-fuchsia-600",
      pill: "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-950/80 dark:text-fuchsia-300",
      roomIcon: "text-fuchsia-600 dark:text-fuchsia-400",
    },
    "off-site": {
      bg: "bg-cyan-50/50 hover:bg-cyan-50 dark:bg-slate-900/80 dark:hover:bg-slate-900 border-slate-200/80 dark:border-slate-800",
      accent: "bg-cyan-600",
      pill: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950/80 dark:text-cyan-300",
      roomIcon: "text-cyan-600 dark:text-cyan-400",
    },
    other: {
      bg: "bg-slate-50/70 hover:bg-slate-100/70 dark:bg-slate-900/80 dark:hover:bg-slate-900 border-slate-200/80 dark:border-slate-800",
      accent: "bg-slate-600",
      pill: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
      roomIcon: "text-slate-500",
    },
  }[category] || {
    bg: "bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800",
    accent: "bg-blue-600",
    pill: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
    roomIcon: "text-blue-600",
  };

  return (
    <div
      data-tour={dataTour}
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl border transition-all cursor-pointer active:scale-[0.99] p-3.5 my-2 shadow-sm ${
        themeStyles.bg
      } ${
        isActiveNow
          ? "ring-2 ring-blue-500/70 shadow-md shadow-blue-500/10"
          : isPast
          ? "opacity-60 saturate-50"
          : ""
      }`}
    >
      {/* Sleek vertical accent line */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${themeStyles.accent}`} />

      {/* Top Header: Time and Event Type Pill */}
      <div className="flex items-center justify-between gap-2 mb-1.5 pl-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-900 dark:text-white">
            {lesson.StartDateTime.format("HH:mm")} – {lesson.EndDateTime.format("HH:mm")}
          </span>
          {isActiveNow && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              NOW
            </span>
          )}
        </div>

        <span
          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${themeStyles.pill}`}
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

      {/* Location & Lecturer Info */}
      {!lesson.collapsedLocations && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-400 pl-1">
          {lesson.Location && (
            <div className="inline-flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
              <MapPin className={`w-3.5 h-3.5 ${themeStyles.roomIcon} shrink-0`} />
              <span className="truncate max-w-[200px]">{lesson.Location}</span>
            </div>
          )}

          {lesson.staffName && (
            <div className="inline-flex items-center gap-1 font-medium text-slate-500 dark:text-slate-400">
              <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate max-w-[160px]">{lesson.staffName}</span>
            </div>
          )}
        </div>
      )}

      {/* Collapsed Parallel Groups */}
      {lesson.collapsedLocations && lesson.Locations && (
        <div className="pl-1 pt-1.5 border-t border-slate-200/60 dark:border-slate-800/60">
          <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            <Users className="w-3 h-3" />
            Parallel Groups ({lesson.Locations.length})
          </div>
          <div className="flex flex-wrap gap-1.5">
            {lesson.Locations.map((loc, idx) => (
              <span
                key={idx}
                className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-300"
              >
                <strong>{loc.nameSpecification || `Group ${idx + 1}`}</strong>: {loc.location || "TBD"}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
