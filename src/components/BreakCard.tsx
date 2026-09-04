import React from "react";
import { Coffee } from "lucide-react";
import { DayBreak } from "../types/timetable";

interface BreakCardProps {
  dayBreak: DayBreak;
}

export const BreakCard: React.FC<BreakCardProps> = ({ dayBreak }) => {
  const hours = Math.floor(dayBreak.durationMinutes / 60);
  const minutes = dayBreak.durationMinutes % 60;
  let durationStr = "";
  if (hours > 0 && minutes > 0) {
    durationStr = `${hours}h ${minutes}m`;
  } else if (hours > 0) {
    durationStr = `${hours}h`;
  } else {
    durationStr = `${minutes}m`;
  }

  return (
    <div className="flex items-center justify-center my-2">
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-black text-[11px] font-bold border-2 border-black">
        <Coffee className="w-3 h-3 text-black" />
        <span>{durationStr} free</span>
        <span className="text-black">•</span>
        <span className="text-black font-semibold">
          {dayBreak.start.format("HH:mm")} – {dayBreak.end.format("HH:mm")}
        </span>
      </div>
    </div>
  );
};

