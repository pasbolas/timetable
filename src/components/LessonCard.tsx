import React from "react";
import { MapPin } from "lucide-react";
import { NormalizedLesson } from "../types/timetable";
import { getLessonGroupRoomStrings } from "../services/transformer";

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
  const isLecture =
    lesson.EventType?.toLowerCase().includes("lecture") ||
    lesson.EventType?.toLowerCase() === "lec";

  return (
    <div
      data-tour={dataTour}
      onClick={onClick}
      className={`relative overflow-hidden rounded-xl border-2 border-white bg-black transition-colors cursor-pointer active:scale-[0.99] p-3.5 my-2 hover:bg-zinc-900 ${
        isActiveNow
          ? "ring-2 ring-white"
          : isPast
          ? "opacity-60"
          : ""
      }`}
    >
      {/* Sleek vertical accent line */}
      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-white" />

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
          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md text-white border border-white ${
            isLecture ? "bg-[#228B22]" : "bg-white text-black"
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
      <div className="flex items-center gap-1.5 text-xs font-semibold text-white pl-1 truncate">
        <MapPin className="w-3.5 h-3.5 text-white shrink-0" />
        <span className="truncate">
          {getLessonGroupRoomStrings(lesson).join(" · ")}
        </span>
      </div>
    </div>
  );
};

