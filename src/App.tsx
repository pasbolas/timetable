import { useState, useEffect } from "react";
import moment from "moment-timezone";
import { useSelectedProgram } from "./hooks/useSelectedProgram";
import { useGetLessons } from "./hooks/useGetLessons";
import { useTheme } from "./hooks/useTheme";
import { useLiveTime } from "./hooks/useLiveTime";
import { TopBar } from "./components/TopBar";
import { WeekDateStrip } from "./components/WeekDateStrip";
import { DayTimeline } from "./components/DayTimeline";
import { MenuDrawer } from "./components/MenuDrawer";
import { SearchModal } from "./components/SearchModal";
import { PWAInstallPrompt } from "./components/PWAInstallPrompt";
import { InteractiveTour } from "./components/InteractiveTour";
import { TIMETABLE_CONFIG } from "./config/timetableConfig";
import { StorageService } from "./services/storage";

export function App() {
  const { selectedProgram, selectProgram, recents } = useSelectedProgram();
  const { theme, setTheme } = useTheme();
  const { currentTime, isToday, isLessonActive, isLessonPast } = useLiveTime();

  // Active selected day (default: today in Europe/Dublin)
  const [activeDate, setActiveDate] = useState<moment.Moment>(() =>
    moment().tz(TIMETABLE_CONFIG.timezone)
  );

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);

  // Automatically trigger tour for first-time visitors once page is mounted
  useEffect(() => {
    if (!StorageService.hasCompletedTour()) {
      const timer = setTimeout(() => {
        setIsTourOpen(true);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, []);

  // Fetch schedule for selected program and active date's week
  const {
    schedule,
    isLoading,
    error,
    isOfflineData,
    reload,
  } = useGetLessons(selectedProgram, activeDate);

  // Find day data for currently active day
  const activeDateKey = activeDate.format("YYYY-MM-DD");
  const activeDayData = schedule.find((d) => d.dateKey === activeDateKey);

  const handleGoToToday = () => {
    setActiveDate(moment().tz(TIMETABLE_CONFIG.timezone));
  };

  const isTodayActive = isToday(activeDate);

  return (
    <div className="h-full h-[100dvh] w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col overflow-hidden selection:bg-blue-500 selection:text-white">
      {/* Pinned Minimal Top Header */}
      <TopBar
        selectedProgram={selectedProgram}
        onOpenMenu={() => setIsMenuOpen(true)}
        onGoToToday={handleGoToToday}
        isTodayActive={isTodayActive}
        isOffline={isOfflineData}
        isLoading={isLoading}
      />

      {/* Main Scrollable Timeline Stream */}
      <main className="flex-1 overflow-y-auto overscroll-y-contain relative pb-28">
        <DayTimeline
          activeDate={activeDate}
          dayData={activeDayData}
          isLoading={isLoading}
          error={error}
          onRetry={reload}
          currentLiveTime={currentTime}
          isToday={isTodayActive}
          isLessonActive={isLessonActive}
          isLessonPast={isLessonPast}
        />
      </main>

      {/* Footer Date Selector Dock Fixed to the Very Bottom */}
      <WeekDateStrip
        activeDate={activeDate}
        onSelectDate={setActiveDate}
        weekSchedule={schedule}
        currentLiveTime={currentTime}
      />

      {/* Expandable Menu & Settings Drawer */}
      <MenuDrawer
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        selectedProgram={selectedProgram}
        onOpenSearch={() => setIsSearchOpen(true)}
        recentPrograms={recents}
        onSelectProgram={selectProgram}
        onGoToToday={handleGoToToday}
        theme={theme}
        onSetTheme={setTheme}
        onRefresh={reload}
        isLoading={isLoading}
        isOffline={isOfflineData}
        weekSchedule={schedule}
        onStartTour={() => setIsTourOpen(true)}
      />

      {/* Search Modal */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectProgram={selectProgram}
        recentPrograms={recents}
        currentProgramId={selectedProgram.Identity}
      />

      {/* Interactive Feature Tour */}
      <InteractiveTour
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
      />

      {/* PWA Install Banner */}
      <PWAInstallPrompt />
    </div>
  );
}

export default App;
