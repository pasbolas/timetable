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
      className="sticky top-0 z-30 bg-[#f4f1e0]/90 dark:bg-[#424242]/90 backdrop-blur-md border-b border-stone-300/60 dark:border-neutral-600/70 transition-colors"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <div className="max-w-2xl h-[54px] mx-auto px-3 flex items-center justify-between gap-2">
        {/* Left: Course Chip (Tap opens Menu Drawer) */}
        <button
          onClick={onOpenMenu}
          data-tour="course-chip"
          className="flex items-center gap-2 overflow-hidden text-left py-1 px-1.5 -ml-1 rounded-2xl hover:bg-stone-200/60 dark:hover:bg-neutral-600/50 active:scale-98 transition-all group max-w-[calc(100%-140px)] sm:max-w-md"
          title="Open course details and menu"
        >
          <span className="font-bold text-xs shrink-0 cursor-pointer py-0.5 px-2.5 rounded-full shadow-sm bg-blue-600 text-white dark:bg-[#834655] dark:text-[#F6CAC9] dark:border dark:border-[#9F5069]/60 shadow-blue-500/25 dark:shadow-[#834655]/40">
            {shortCode}
          </span>
          <span className="text-xs font-medium text-slate-700 dark:text-[#F6CAC9] truncate group-hover:text-blue-600 dark:group-hover:text-[#C8B273] transition-colors">
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
              variant="flat"
              onPress={onGoToToday}
              data-tour="today-button"
              startContent={<Sparkles className="w-3.5 h-3.5 text-blue-500 dark:text-[#C8B273]" />}
              className="h-8 px-2.5 text-xs font-semibold rounded-xl min-w-0 shadow-sm bg-blue-50 text-blue-600 dark:bg-[#834655]/40 dark:text-[#C8B273] dark:border dark:border-[#C8B273]/40"
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
            className="w-8 h-8 rounded-xl text-slate-600 dark:text-[#F6CAC9] hover:text-slate-900 dark:hover:text-[#C8B273]"
            title="Menu & Settings"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
};
