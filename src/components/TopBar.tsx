import React from "react";
import { SlidersHorizontal, Sparkles, WifiOff } from "lucide-react";
import { Button } from "@heroui/react";
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
      className="sticky top-0 z-30 bg-white border-b-2 border-black transition-colors"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <div className="max-w-2xl h-[54px] mx-auto px-3 flex items-center justify-between gap-2">
        {/* Left: Course Chip (Tap opens Menu Drawer) */}
        <button
          onClick={onOpenMenu}
          data-tour="course-chip"
          className="flex items-center gap-2 overflow-hidden text-left py-1 px-2.5 rounded-xl border-2 border-black bg-white hover:bg-zinc-100 active:scale-98 transition-colors group flex-1 min-w-0"
          title="Open course details and menu"
        >
          <span className="font-bold text-xs shrink-0 cursor-pointer py-0.5 px-2 rounded-full bg-black text-white border border-black">
            {shortCode}
          </span>
          <span
            className={`text-xs font-bold text-black ${
              !isTodayActive ? "truncate" : "whitespace-nowrap overflow-visible"
            }`}
          >
            {programTitle}
          </span>
        </button>

        {/* Right: Minimalist Actions (Today if not today + Expandable Menu Button) */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Offline indicator */}
          {isOffline && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg border-2 border-black bg-white text-black">
              <WifiOff className="w-3 h-3 text-black" />
              Offline
            </span>
          )}

          {/* Jump to Today (shown only when not currently on today) */}
          {!isTodayActive && (
            <Button
              size="sm"
              variant="flat"
              onPress={onGoToToday}
              data-tour="today-button"
              startContent={<Sparkles className="w-3.5 h-3.5 text-black" />}
              className="h-8 px-2.5 text-xs font-bold rounded-xl min-w-0 bg-white text-black border-2 border-black hover:bg-black hover:text-white transition-colors"
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
            className="w-8 h-8 rounded-xl text-black border-2 border-black bg-white hover:bg-zinc-100"
            title="Menu & Settings"
          >
            <SlidersHorizontal className="w-4 h-4 text-black" />
          </Button>
        </div>
      </div>
    </header>
  );
};
