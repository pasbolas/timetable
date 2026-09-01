import React from "react";
import { SlidersHorizontal, Sparkles, WifiOff } from "lucide-react";
import { ProgramSearchResult } from "../types/timetable";
import { parseProgramCodeAndTitle } from "../services/transformer";

interface TopBarProps {
  selectedProgram: ProgramSearchResult;
  onOpenMenu: () => void;
  onGoToToday: () => void;
  isTodayActive: boolean;
  isOffline: boolean;
  isLoading: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  selectedProgram,
  onOpenMenu,
  onGoToToday,
  isTodayActive,
  isOffline,
  isLoading,
}) => {
  const { code: shortCode, title: programTitle } = parseProgramCodeAndTitle(
    selectedProgram.Name,
    selectedProgram.Description
  );

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-100 dark:border-slate-800/80 transition-colors">
      <div className="max-w-2xl mx-auto px-3.5 py-2.5 flex items-center justify-between gap-2">
        {/* Left: Course Chip (Tap opens Menu Drawer) */}
        <button
          onClick={onOpenMenu}
          data-tour="course-chip"
          className="flex items-center gap-2 overflow-hidden text-left py-1 px-2 -ml-1 rounded-xl hover:bg-slate-100/80 dark:hover:bg-slate-800/60 active:scale-98 transition-all group"
          title="Open course details and menu"
        >
          <span className="shrink-0 text-xs font-bold px-2 py-0.5 rounded-lg bg-blue-600 text-white shadow-sm shadow-blue-500/20">
            {shortCode}
          </span>
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate max-w-[170px] sm:max-w-xs group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {programTitle}
          </span>
        </button>

        {/* Right: Minimalist Actions (Today if not today + Expandable Menu Button) */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Offline indicator */}
          {isOffline && (
            <span
              className="p-1.5 rounded-lg text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50"
              title="Viewing offline cached schedule"
            >
              <WifiOff className="w-3.5 h-3.5" />
            </span>
          )}

          {/* Jump to Today (shown only when not currently on today) */}
          {!isTodayActive && (
            <button
              onClick={onGoToToday}
              data-tour="today-button"
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 active:scale-95 transition-all flex items-center gap-1"
              title="Jump to today"
            >
              <Sparkles className="w-3 h-3" />
              <span>Today</span>
            </button>
          )}

          {/* Expandable Pane Button */}
          <button
            onClick={onOpenMenu}
            data-tour="menu-button"
            className={`p-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all relative ${
              isLoading ? "animate-pulse text-blue-600" : ""
            }`}
            title="Menu & Settings"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
