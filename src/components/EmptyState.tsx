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
        <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4 shadow-sm">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1">
          Unable to Load Schedule
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mb-5">
          {errorMessage || "An error occurred while fetching timetable events. Please check your network connection."}
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md shadow-blue-600/20 active:scale-95 transition-all"
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
        <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4 shadow-md shadow-amber-500/10">
          <SunMedium className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1">
          Weekend Break
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
          No classes scheduled on {date?.format("dddd")}. Take some time to relax, recharge, or catch up on coursework! ☕
        </p>
      </div>
    );
  }

  if (type === "no-program") {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
          <Calendar className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1">
          No Course Selected
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mb-4">
          Select your degree program or course code to view your weekly lecture schedule.
        </p>
        {onOpenSearch && (
          <button
            onClick={onOpenSearch}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold shadow-md active:scale-95"
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
      <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 shadow-md shadow-emerald-500/10">
        <Coffee className="w-8 h-8" />
      </div>
      <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1">
        No Classes Today
      </h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
        You have no scheduled lectures or labs for {date?.format("dddd, D MMMM")}. Enjoy your free day! 🎉
      </p>
    </div>
  );
};
