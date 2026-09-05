import { AlertCircle, RotateCcw, Calendar } from "lucide-react";
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
  date: _date,
  errorMessage,
  onRetry,
  onOpenSearch,
}) => {
  if (type === "error") {
    return (
      <div className="flex flex-col items-center justify-center py-2 px-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-black border-2 border-white text-white flex items-center justify-center mb-4">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h3 className="text-base font-black text-white mb-1">
          Unable to Load Schedule
        </h3>
        <p className="text-xs text-white font-medium max-w-xs mb-5">
          {errorMessage || "An error occurred while fetching timetable events. Please check your network connection."}
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold border-2 border-white active:scale-95 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Retry Fetch
          </button>
        )}
      </div>
    );
  }

  if (type === "no-program") {
    return (
      <div className="flex flex-col items-center justify-center py-2 px-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-black border-2 border-white text-white flex items-center justify-center mb-4">
          <Calendar className="w-7 h-7" />
        </div>
        <h3 className="text-base font-black text-white mb-1">
          No Course Selected
        </h3>
        <p className="text-xs text-white font-medium max-w-xs mb-4">
          Select your degree program or course code to view your weekly lecture schedule.
        </p>
        {onOpenSearch && (
          <button
            onClick={onOpenSearch}
            className="px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold border-2 border-white active:scale-95 transition-all"
          >
            Search Courses
          </button>
        )}
      </div>
    );
  }

  // Days with no class: weekend or free day
  return (
    <div className="flex flex-col items-center justify-center py-4 px-4 text-center select-none animate-in fade-in duration-300">
      <div className="relative mb-3 flex items-center justify-center">
        <img
          src="/pickle-rick.png"
          alt="Pickle Rick"
          className="w-44 sm:w-52 max-w-[210px] h-auto object-contain select-none pointer-events-none drop-shadow-xl"
          loading="eager"
        />
      </div>
      <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
        No class for you today morty
      </h3>
    </div>
  );
};

