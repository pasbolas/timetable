import { useState, useEffect } from "react";
import moment from "moment-timezone";
import { useSelectedProgram } from "./hooks/useSelectedProgram";
import { useGetLessons } from "./hooks/useGetLessons";
import { useLiveTime } from "./hooks/useLiveTime";
import { TopBar } from "./components/TopBar";
import { WeekDateStrip } from "./components/WeekDateStrip";
import { DayTimeline } from "./components/DayTimeline";
import { MenuDrawer } from "./components/MenuDrawer";
import { SearchModal } from "./components/SearchModal";
import { CourseYearSetupModal } from "./components/CourseYearSetupModal";
import { PWAInstallPrompt } from "./components/PWAInstallPrompt";
import { InteractiveTour } from "./components/InteractiveTour";
import { AmbientBackground } from "./components/AmbientBackground";
import { TIMETABLE_CONFIG } from "./config/timetableConfig";
import { StorageService } from "./services/storage";
import { ProgramSearchResult } from "./types/timetable";
import { Analytics } from "@vercel/analytics/react";

export function App() {
  const { selectedProgram, selectProgram, recents } = useSelectedProgram();
  const { currentTime, isToday, isLessonActive, isLessonPast } = useLiveTime();

  // Active selected day (default: today in Europe/Dublin)
  const [activeDate, setActiveDate] = useState<moment.Moment>(() =>
    moment().tz(TIMETABLE_CONFIG.timezone)
  );

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCourseSetupOpen, setIsCourseSetupOpen] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [isMandatoryCourseSelectOpen, setIsMandatoryCourseSelectOpen] = useState(false);

  // First-time onboarding sequence: Tour -> Mandatory Unskippable Course Selection
  useEffect(() => {
    if (!StorageService.hasCompletedTour()) {
      const timer = setTimeout(() => {
        setIsTourOpen(true);
      }, 700);
      return () => clearTimeout(timer);
    } else if (!StorageService.hasCompletedCourseOnboarding()) {
      setIsMandatoryCourseSelectOpen(true);
    }
  }, []);

  const handleTourClose = () => {
    setIsTourOpen(false);
    // Mandatory unskippable task immediately after the intro tour
    if (!StorageService.hasCompletedCourseOnboarding()) {
      setTimeout(() => {
        setIsMandatoryCourseSelectOpen(true);
      }, 250);
    }
  };

  const handleSelectProgram = (program: ProgramSearchResult) => {
    selectProgram(program);
    StorageService.setCompletedCourseOnboarding(true);
    setIsSearchOpen(false);
    setIsCourseSetupOpen(false);
    setIsMandatoryCourseSelectOpen(false);
  };

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

  const isNoClassesDay =
    !isLoading &&
    !error &&
    activeDayData !== undefined &&
    activeDayData.lessons.length === 0;

  // Prevent page scrolling on days without classes or weekend breaks
  useEffect(() => {
    if (isNoClassesDay) {
      window.scrollTo(0, 0);
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
      document.body.style.overscrollBehavior = "none";
    } else {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
      document.body.style.overscrollBehavior = "";
    }
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
      document.body.style.overscrollBehavior = "";
    };
  }, [isNoClassesDay]);

  const handleGoToToday = () => {
    setActiveDate(moment().tz(TIMETABLE_CONFIG.timezone));
  };

  const isTodayActive = isToday(activeDate);

  return (
    <div
      className={`w-full bg-transparent text-black flex flex-col selection:bg-black selection:text-white relative ${
        isNoClassesDay
          ? "h-screen h-[100dvh] max-h-[100dvh] overflow-hidden overscroll-none"
          : "min-h-screen"
      }`}
      style={{
        minHeight: isNoClassesDay ? undefined : "calc(100dvh + env(safe-area-inset-bottom, 0px))",
        height: isNoClassesDay ? "100dvh" : undefined,
      }}
    >
      {/* Ambient background with dot grid and floating pink and blue balls */}
      <AmbientBackground />

      {/* Pinned Minimal Top Header */}
      <TopBar
        selectedProgram={selectedProgram}
        onOpenMenu={() => setIsMenuOpen(true)}
        onGoToToday={handleGoToToday}
        isTodayActive={isTodayActive}
        isOffline={isOfflineData}
        isLoading={isLoading}
      />

      {/* Main Timeline Stream */}
      <main className="flex-1 flex flex-col relative z-10">
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
        onOpenSearch={() => setIsCourseSetupOpen(true)}
        recentPrograms={recents}
        onSelectProgram={selectProgram}
        onGoToToday={handleGoToToday}
        onRefresh={reload}
        isLoading={isLoading}
        isOffline={isOfflineData}
        weekSchedule={schedule}
        onStartTour={() => setIsTourOpen(true)}
      />

      {/* Starting Phase & Rotary Year Selector Modal */}
      <CourseYearSetupModal
        isOpen={isMandatoryCourseSelectOpen || isCourseSetupOpen}
        isMandatory={isMandatoryCourseSelectOpen}
        onClose={() => {
          setIsCourseSetupOpen(false);
          if (!isMandatoryCourseSelectOpen) {
            setIsMandatoryCourseSelectOpen(false);
          }
        }}
        onSelectProgram={handleSelectProgram}
        currentProgramId={selectedProgram.Identity}
      />

      {/* Quick Program Search Modal */}
      <SearchModal
        isOpen={isSearchOpen}
        isMandatory={false}
        onClose={() => setIsSearchOpen(false)}
        onSelectProgram={handleSelectProgram}
        recentPrograms={recents}
        currentProgramId={selectedProgram.Identity}
      />

      {/* Interactive Feature Tour */}
      <InteractiveTour
        isOpen={isTourOpen}
        onClose={handleTourClose}
      />

      {/* PWA Install Banner */}
      <PWAInstallPrompt />

      {/* Vercel Web Analytics */}
      <Analytics />
    </div>
  );
}

export default App;
