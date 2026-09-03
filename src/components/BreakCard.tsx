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
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100/80 dark:bg-[#834655]/30 text-slate-500 dark:text-[#F6CAC9] text-[11px] font-medium border border-slate-200/50 dark:border-[#9F5069]/40">
        <Coffee className="w-3 h-3 text-amber-500 dark:text-[#C8B273]" />
        <span>{durationStr} free</span>
        <span className="text-slate-300 dark:text-[#9F5069]">•</span>
        <span className="text-slate-400 dark:text-[#F6CAC9]/80">
          {dayBreak.start.format("HH:mm")} – {dayBreak.end.format("HH:mm")}
        </span>
      </div>
    </div>
  );
};
