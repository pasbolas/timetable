import React from "react";
import { SlidersHorizontal, Sparkles, WifiOff } from "lucide-react";
import { Button, Chip } from "@heroui/react";
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
    <header
      className="sticky top-0 z-30 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200/70 dark:border-slate-800/80 transition-colors"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <div className="max-w-2xl h-[54px] mx-auto px-3 flex items-center justify-between gap-2">
        {/* Left: Course Chip (Tap opens Menu Drawer) */}
        <button
          onClick={onOpenMenu}
          data-tour="course-chip"
          className="flex items-center gap-2 overflow-hidden text-left py-1 px-1.5 -ml-1 rounded-2xl hover:bg-slate-100/80 dark:hover:bg-slate-800/60 active:scale-98 transition-all group max-w-[calc(100%-140px)] sm:max-w-md"
          title="Open course details and menu"
        >
          <Chip
            size="sm"
            color="primary"
            variant="shadow"
            className="font-bold text-xs shrink-0 cursor-pointer shadow-sm shadow-blue-500/25"
          >
            {shortCode}
          </Chip>
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {programTitle}
          </span>
        </button>

        {/* Right: Minimalist Actions (Today if not today + Expandable Menu Button) */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Offline indicator */}
          {isOffline && (
            <Chip
              size="sm"
              color="warning"
              variant="flat"
              startContent={<WifiOff className="w-3 h-3" />}
              className="text-[11px] font-medium"
            >
              Offline
            </Chip>
          )}

          {/* Jump to Today (shown only when not currently on today) */}
          {!isTodayActive && (
            <Button
              size="sm"
              color="primary"
              variant="flat"
              onPress={onGoToToday}
              data-tour="today-button"
              startContent={<Sparkles className="w-3.5 h-3.5 text-blue-500" />}
              className="h-8 px-2.5 text-xs font-semibold rounded-xl min-w-0 shadow-sm"
              title="Jump to today"
            >
              Today
            </Button>
          )}

          {/* Expandable Menu Button with Ripple */}
          <Button
            isIconOnly
            size="sm"
            variant="light"
            onPress={onOpenMenu}
            data-tour="menu-button"
            isLoading={isLoading}
            className="w-8 h-8 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            title="Menu & Settings"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
};
