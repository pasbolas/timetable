import React from "react";
import { NormalizedLesson } from "../types/timetable";
import { getLessonGroupRoomStrings } from "../services/transformer";
import { RoomBadge } from "./RoomBadge";

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
  const isLab =
    lesson.EventType?.toLowerCase().includes("lab") ||
    Boolean(lesson.collapsedLocations);
  const isLecture =
    lesson.EventType?.toLowerCase().includes("lecture") ||
    lesson.EventType?.toLowerCase() === "lec";
  const isTutorial =
    Boolean(lesson.EventType && /\b(tut|tutorial|tutorials)\b/i.test(lesson.EventType)) ||
    Boolean(lesson.Description && /\b(tutorial|tutorials)\b/i.test(lesson.Description));

  return (
    <div
      data-tour={dataTour}
      onClick={onClick}
      className={`relative overflow-hidden rounded-xl border-2 transition-colors cursor-pointer active:scale-[0.99] p-3.5 my-2 timetable-widget ${
        isLecture
          ? "lecture-widget"
          : isLab
          ? "lab-widget"
          : isTutorial
          ? "tutorial-widget"
          : "border-white bg-black hover:bg-zinc-900"
      } ${
        isActiveNow
          ? "ring-2 ring-white"
          : isPast
          ? "opacity-60"
          : ""
      }`}
    >
      {/* Sleek vertical accent line */}
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${isLecture ? "lecture-accent-bar" : isLab ? "lab-accent-bar" : isTutorial ? "tutorial-accent-bar" : "bg-white"}`} />

      {/* Top Header: Time and Event Type Pill */}
      <div className="flex items-center justify-between gap-2 mb-1.5 pl-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-white">
            {lesson.StartDateTime.format("HH:mm")} – {lesson.EndDateTime.format("HH:mm")}
          </span>
          {isActiveNow && (
            <span className="inline-flex items-center gap-1 text-[10px] font-black text-black bg-white px-1.5 py-0.5 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
              NOW
            </span>
          )}
        </div>

        <span
          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
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

      {/* Subject Title */}
      <div className="mb-2 pl-1">
        <h3 className="font-black text-sm sm:text-base text-white leading-snug">
          {lesson.Description}
        </h3>
      </div>

      {/* Bottom: Group - Room */}
      <div className="mt-2 pl-1 truncate flex items-center">
        <RoomBadge
          location={lesson.Location || getLessonGroupRoomStrings(lesson)[0]}
          size="sm"
        />
      </div>
    </div>
  );
};

