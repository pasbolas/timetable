import React from "react";
import { Coffee, SunMedium, AlertCircle, RotateCcw, Calendar } from "lucide-react";
import moment from "moment-timezone";

interface EmptyStateProps {
  type: "weekend" | "free-day" | "error" | "no-program";
  date?: moment.Moment;
  errorMessage?: string | null;
  onRetry?: () => void;
  onOpenSearch?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  type,
  date,
  errorMessage,
  onRetry,
  onOpenSearch,
}) => {
  if (type === "error") {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-white border-2 border-black text-black flex items-center justify-center mb-4">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h3 className="text-base font-black text-black mb-1">
          Unable to Load Schedule
        </h3>
        <p className="text-xs text-black font-medium max-w-xs mb-5">
          {errorMessage || "An error occurred while fetching timetable events. Please check your network connection."}
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-black hover:bg-zinc-800 text-white text-xs font-bold border-2 border-black active:scale-95 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Retry Fetch
          </button>
        )}
      </div>
    );
  }

  if (type === "weekend") {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-in fade-in duration-300">
        <div className="w-16 h-16 rounded-2xl bg-white border-2 border-black text-black flex items-center justify-center mb-4">
          <SunMedium className="w-8 h-8" />
        </div>
        <h3 className="text-base font-black text-black mb-1">
          Weekend Break
        </h3>
        <p className="text-xs text-black font-medium max-w-xs">
          No classes scheduled on {date?.format("dddd")}. Take some time to relax, recharge, or catch up on coursework! ☕
        </p>
      </div>
    );
  }

  if (type === "no-program") {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-white border-2 border-black text-black flex items-center justify-center mb-4">
          <Calendar className="w-7 h-7" />
        </div>
        <h3 className="text-base font-black text-black mb-1">
          No Course Selected
        </h3>
        <p className="text-xs text-black font-medium max-w-xs mb-4">
          Select your degree program or course code to view your weekly lecture schedule.
        </p>
        {onOpenSearch && (
          <button
            onClick={onOpenSearch}
            className="px-4 py-2 rounded-xl bg-black hover:bg-zinc-800 text-white text-xs font-bold border-2 border-black active:scale-95 transition-all"
          >
            Search Courses
          </button>
        )}
      </div>
    );
  }

  // Free day
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-in fade-in duration-300">
      <div className="w-16 h-16 rounded-2xl bg-white border-2 border-black text-black flex items-center justify-center mb-4">
        <Coffee className="w-8 h-8" />
      </div>
      <h3 className="text-base font-black text-black mb-1">
        No Classes Today
      </h3>
      <p className="text-xs text-black font-medium max-w-xs">
        You have no scheduled lectures or labs for {date?.format("dddd, D MMMM")}. Enjoy your free day! 🎉
      </p>
    </div>
  );
};

