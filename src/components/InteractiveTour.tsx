import React, { useState, useEffect } from "react";
import {
  Sparkles,
  GraduationCap,
  Calendar,
  Layers,
  CalendarPlus,
  SlidersHorizontal,
  ChevronRight,
  ChevronLeft,
  X,
  CheckCircle2,
  HelpCircle,
} from "lucide-react";
import { StorageService } from "../services/storage";

export interface TourStep {
  id: string;
  targetSelector?: string;
  title: string;
  badge: string;
  icon: React.ReactNode;
  description: string;
  tip?: string;
  highlights?: string[];
  actionLabel?: string;
}

interface InteractiveTourProps {
  isOpen: boolean;
  onClose: () => void;
}

// Generate an SVG path with an evenodd hole cutout for the targeted element
function getCutoutPath(
  rect: DOMRect | null,
  w: number,
  h: number,
  r = 16,
  pad = 6
): string {
  if (!rect) {
    return `M 0,0 L ${w},0 L ${w},${h} L 0,${h} Z`;
  }

  const x = Math.max(0, rect.left - pad);
  const y = Math.max(0, rect.top - pad);
  const rw = rect.width + pad * 2;
  const rh = rect.height + pad * 2;
  const rad = Math.min(r, rw / 2, rh / 2);

  // Outer full-screen rectangle (clockwise) + Inner rounded rectangle (counter-clockwise)
  return `M 0,0 L ${w},0 L ${w},${h} L 0,${h} Z M ${x + rad},${y} L ${x + rw - rad},${y} A ${rad},${rad} 0 0,1 ${x + rw},${y + rad} L ${x + rw},${y + rh - rad} A ${rad},${rad} 0 0,1 ${x + rw - rad},${y + rh} L ${x + rad},${y + rh} A ${rad},${rad} 0 0,1 ${x},${y + rh - rad} L ${x},${y + rad} A ${rad},${rad} 0 0,1 ${x + rad},${y} Z`;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to MyTimetable! 👋",
    badge: "Quick Overview",
    icon: <Sparkles className="w-5 h-5 text-black" />,
    description:
      "Your fast, modern student timetable designed for university life. Packed with live schedule updates, offline support, smart break detection, and calendar sync.",
    highlights: [
      "Instant course search across all degree programs",
      "5-week swipeable calendar with class indicators",
      "Smart lab group grouping & automatic break calculation",
      "Works offline and installs on your phone as a PWA",
    ],
    actionLabel: "Start Quick Tour",
  },
  {
    id: "course-chip",
    targetSelector: '[data-tour="course-chip"]',
    title: "Course Selector & Search 🔍",
    badge: "Step 1 of 5 • Courses",
    icon: <GraduationCap className="w-5 h-5 text-black" />,
    description:
      "Tap your course name or code anytime to search degrees, switch between recent programs, or explore modules with instant autocomplete.",
    tip: "You can search by course code (e.g. TU856) or title (e.g. Computer Science).",
  },
  {
    id: "date-strip",
    targetSelector: '[data-tour="date-strip"]',
    title: "5-Week Calendar Strip 📅",
    badge: "Step 2 of 5 • Date Strip",
    icon: <Calendar className="w-5 h-5 text-black" />,
    description:
      "Easily swipe or scroll through 35 continuous days. Days with scheduled lectures or labs feature a clean indicator dot.",
    tip: "Use the ‹ and › buttons or tap any date to navigate smoothly.",
  },
  {
    id: "timeline",
    targetSelector: '[data-tour="timeline-stream"], main',
    title: "Smart Timeline & Breaks ☕",
    badge: "Step 3 of 5 • Timeline",
    icon: <Layers className="w-5 h-5 text-black" />,
    description:
      "Classes display clear badges for category (Lectures, Labs, Tutorials, Studios). Free gaps (>6 mins) between classes are automatically calculated and displayed as break cards.",
    tip: "Your ongoing class is highlighted with a live 'NOW' badge.",
  },
  {
    id: "lesson-card",
    targetSelector: '[data-tour="lesson-card"], [data-tour="timeline-stream"], main',
    title: "Class Details & Calendar Export 📥",
    badge: "Step 4 of 5 • Lesson Details",
    icon: <CalendarPlus className="w-5 h-5 text-black" />,
    description:
      "Tap on any lecture or lab card to open rich details: room numbers, assigned lecturers, group breakdowns, and one-tap export to Apple Calendar, Google Calendar, or Outlook.",
    tip: "You can also export an entire week's schedule into your calendar from the menu!",
  },
  {
    id: "menu-button",
    targetSelector: '[data-tour="menu-button"]',
    title: "Course Switcher & Offline ⚙️",
    badge: "Step 5 of 5 • Menu & Settings",
    icon: <SlidersHorizontal className="w-5 h-5 text-black" />,
    description:
      "Open the menu to switch degree courses, jump straight back to Today, reload live timetable data, or re-run this interactive tour whenever you like.",
    tip: "Cached schedules allow the app to work seamlessly without an internet connection.",
  },
];

export const InteractiveTour: React.FC<InteractiveTourProps> = ({
  isOpen,
  onClose,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 1200,
    height: typeof window !== "undefined" ? window.innerHeight : 800,
  });

  const currentStep = TOUR_STEPS[currentStepIndex] || TOUR_STEPS[0];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === TOUR_STEPS.length - 1;
  const targetSelector = currentStep.targetSelector;

  // Reset to first step whenever the tour is newly opened
  useEffect(() => {
    if (isOpen) {
      setCurrentStepIndex(0);
    }
  }, [isOpen]);

  // Measure target element rect safely without infinite state update loops
  useEffect(() => {
    if (!isOpen) return;

    if (!targetSelector) {
      setTargetRect(null);
      return;
    }

    const measureRect = () => {
      const element = document.querySelector(targetSelector);
      if (element) {
        const r = element.getBoundingClientRect();
        setTargetRect((prev) => {
          if (
            prev &&
            Math.round(prev.top) === Math.round(r.top) &&
            Math.round(prev.left) === Math.round(r.left) &&
            Math.round(prev.width) === Math.round(r.width) &&
            Math.round(prev.height) === Math.round(r.height)
          ) {
            return prev;
          }
          return r;
        });
      } else {
        setTargetRect(null);
      }
    };

    const element = document.querySelector(targetSelector);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
      measureRect();
      const timer1 = setTimeout(measureRect, 100);
      const timer2 = setTimeout(measureRect, 300);
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    } else {
      setTargetRect(null);
    }
  }, [isOpen, currentStepIndex, targetSelector]);

  // Window resize & scroll listeners only active while tour is open
  useEffect(() => {
    if (!isOpen) return;

    const handleScrollOrResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });

      if (!targetSelector) return;
      const element = document.querySelector(targetSelector);
      if (element) {
        const r = element.getBoundingClientRect();
        setTargetRect((prev) => {
          if (
            prev &&
            Math.round(prev.top) === Math.round(r.top) &&
            Math.round(prev.left) === Math.round(r.left) &&
            Math.round(prev.width) === Math.round(r.width) &&
            Math.round(prev.height) === Math.round(r.height)
          ) {
            return prev;
          }
          return r;
        });
      }
    };

    window.addEventListener("resize", handleScrollOrResize, { passive: true });
    window.addEventListener("scroll", handleScrollOrResize, { passive: true });

    return () => {
      window.removeEventListener("resize", handleScrollOrResize);
      window.removeEventListener("scroll", handleScrollOrResize);
    };
  }, [isOpen, targetSelector]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleCompleteTour();
      } else if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "ArrowLeft") {
        handleBack();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentStepIndex]);

  const handleNext = () => {
    if (isLastStep) {
      handleCompleteTour();
    } else {
      setCurrentStepIndex((prev) => Math.min(prev + 1, TOUR_STEPS.length - 1));
    }
  };

  const handleBack = () => {
    setCurrentStepIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleCompleteTour = () => {
    StorageService.setCompletedTour(true);
    onClose();
  };

  if (!isOpen) return null;

  // Determine if card should be placed at the top (e.g. when target element is near bottom)
  const isTargetNearBottom = Boolean(
    targetRect && targetRect.top > windowSize.height * 0.52
  );

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none animate-in fade-in duration-200">
      {/* Full screen backdrop for modal steps without a specific target (e.g. welcome) */}
      {!targetRect && (
        <div
          className="fixed inset-0 z-40 bg-black/60 pointer-events-auto cursor-pointer"
          onClick={handleCompleteTour}
        />
      )}

      {/* SVG EvenOdd Path Overlay: Dims everything outside the target while leaving the cutout completely transparent & crystal clear */}
      {targetRect && (
        <svg
          className="fixed inset-0 w-full h-full z-40 pointer-events-none"
          width={windowSize.width}
          height={windowSize.height}
          viewBox={`0 0 ${windowSize.width} ${windowSize.height}`}
        >
          <path
            d={getCutoutPath(targetRect, windowSize.width, windowSize.height)}
            fill="rgba(2, 6, 23, 0.78)"
            fillRule="evenodd"
            className="transition-all duration-200 pointer-events-auto cursor-pointer"
            onClick={handleCompleteTour}
          />
        </svg>
      )}

      {/* Spotlight Plain 2D Border around target */}
      {targetRect && (
        <div
          style={{
            top: `${targetRect.top - 6}px`,
            left: `${targetRect.left - 6}px`,
            width: `${targetRect.width + 12}px`,
            height: `${targetRect.height + 12}px`,
          }}
          className="fixed z-40 pointer-events-none rounded-xl border-2 border-black transition-all duration-200 ease-out"
        >
          {/* Solid 2D indicator dot */}
          <span className="absolute -top-1.5 -right-1.5 flex h-3 w-3 rounded-full bg-black border border-white" />
        </div>
      )}

      {/* Tour Step Card */}
      <div
        className={`absolute inset-0 pointer-events-none flex flex-col items-center p-3 sm:p-6 z-50 transition-all duration-300 ${
          isTargetNearBottom
            ? "justify-start pt-14 sm:pt-16"
            : !targetRect
            ? "justify-center"
            : "justify-end pb-8 sm:pb-12"
        }`}
      >
        <div
          className="pointer-events-auto w-full max-w-md bg-white rounded-2xl border-2 border-black overflow-hidden transform transition-all duration-300 animate-in slide-in-from-bottom-6 sm:zoom-in-95 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Bar */}
          <div className="p-4 sm:p-5 pb-3 border-b-2 border-black flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white border border-black text-black flex items-center justify-center shrink-0">
                {currentStep.icon}
              </div>
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-black block leading-none">
                  {currentStep.badge}
                </span>
                <h3 className="text-sm sm:text-base font-black text-black mt-0.5">
                  {currentStep.title}
                </h3>
              </div>
            </div>

            <button
              onClick={handleCompleteTour}
              className="p-1.5 rounded-xl text-black hover:bg-zinc-100 transition-colors"
              title="Skip Tour"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-4 sm:p-5 space-y-3 text-xs sm:text-sm">
            <p className="text-black font-medium leading-relaxed">
              {currentStep.description}
            </p>

            {/* Feature Highlights on Welcome step */}
            {currentStep.highlights && (
              <div className="space-y-1.5 py-1">
                {currentStep.highlights.map((highlight, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-black font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-black shrink-0" />
                    <span>{highlight}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Helpful Tip box */}
            {currentStep.tip && (
              <div className="p-3 rounded-xl bg-white border-2 border-black flex items-start gap-2.5 text-xs text-black">
                <HelpCircle className="w-4 h-4 text-black shrink-0 mt-0.5" />
                <span className="leading-snug font-medium">{currentStep.tip}</span>
              </div>
            )}
          </div>

          {/* Footer Controls & Progress */}
          <div className="p-4 sm:p-5 pt-3 bg-white border-t-2 border-black flex items-center justify-between gap-3">
            {/* Step Dots indicator */}
            <div className="flex items-center gap-1.5">
              {TOUR_STEPS.map((step, idx) => (
                <button
                  key={step.id}
                  onClick={() => setCurrentStepIndex(idx)}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === currentStepIndex
                      ? "w-5 bg-black"
                      : "w-1.5 bg-zinc-300 hover:bg-zinc-500"
                  }`}
                  title={`Go to ${step.title}`}
                />
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {!isFirstStep && (
                <button
                  onClick={handleBack}
                  className="px-3 py-2 rounded-xl bg-white hover:bg-zinc-100 text-black text-xs font-bold border-2 border-black flex items-center gap-1 active:scale-95 transition-all shadow-sm"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Back
                </button>
              )}

              {isFirstStep ? (
                <button
                  onClick={handleNext}
                  className="px-4 py-2 rounded-xl bg-black hover:bg-zinc-800 text-white text-xs font-bold border-2 border-black flex items-center gap-1.5 active:scale-95 transition-all"
                >
                  <span>{currentStep.actionLabel || "Start Tour"}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              ) : isLastStep ? (
                <button
                  onClick={handleCompleteTour}
                  className="px-4 py-2 rounded-xl bg-black hover:bg-zinc-800 text-white text-xs font-bold border-2 border-black flex items-center gap-1.5 active:scale-95 transition-all"
                >
                  <span>Select My Course</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="px-4 py-2 rounded-xl bg-black hover:bg-zinc-800 text-white text-xs font-bold border-2 border-black flex items-center gap-1 active:scale-95 transition-all"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};