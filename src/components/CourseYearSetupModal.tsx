import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  X,
  Loader2,
  GraduationCap,
  ArrowRight,
  Pencil
} from "lucide-react";
import { ProgramSearchResult } from "../types/timetable";
import { TimetableAPI } from "../services/apiClient";
import { parseProgramCodeAndTitle } from "../services/transformer";
import { CourseYearDial, YearOption } from "./CourseYearDial";
import { StorageService } from "../services/storage";

interface CourseYearSetupModalProps {
  isOpen: boolean;
  isMandatory?: boolean;
  onClose: () => void;
  onSelectProgram: (program: ProgramSearchResult) => void;
  currentProgramId?: string;
}

const POPULAR_COURSES_BY_UNI: Record<string, { code: string; name: string }[]> = {
  tudublin: [
    { code: "TU856", name: "Computer Science (Full-Time)" },
    { code: "TU857", name: "Computer Science (Infrastructure)" },
    { code: "TU858", name: "Computer Science (International)" },
    { code: "TU756", name: "Computing (General)" },
    { code: "TU854", name: "Data Science & AI" },
  ],
  dcu: [
    { code: "COMSCI", name: "Computer Science" },
    { code: "CASE", name: "Computing for Business" },
    { code: "BSI", name: "Business Studies International" },
    { code: "MSD", name: "Marketing, Innovation & Tech" },
    { code: "DS", name: "Data Science" },
  ],
};

const slideVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? "100%" : "-100%",
  }),
  center: {
    x: "0%",
  },
  exit: (dir: number) => ({
    x: dir > 0 ? "-100%" : "100%",
  }),
};

const slideTransition = {
  duration: 0.38,
  ease: [0.32, 0.72, 0, 1] as const,
};

export const CourseYearSetupModal: React.FC<CourseYearSetupModalProps> = ({
  isOpen,
  isMandatory = false,
  onClose,
  onSelectProgram,
  currentProgramId: _currentProgramId,
}) => {
  const activeUniId = StorageService.getActiveUniversityId();
  const popularCourses = POPULAR_COURSES_BY_UNI[activeUniId] || POPULAR_COURSES_BY_UNI.tudublin;

  // Phase state: "input" (course ID entry) -> "year" (course minimized to left, dial visible)
  const [phase, setPhase] = useState<"input" | "year">("input");
  const [direction, setDirection] = useState<number>(1);
  const [courseQuery, setCourseQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<ProgramSearchResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Selected course and available years
  const [selectedCourseCode, setSelectedCourseCode] = useState<string>("");
  const [selectedCourseTitle, setSelectedCourseTitle] = useState<string>("");
  const [availableYears, setAvailableYears] = useState<YearOption[]>([]);
  const [selectedYearNumber, setSelectedYearNumber] = useState<number>(1);

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setDirection(1);
      setPhase("input");
      setCourseQuery("");
      setSearchResults([]);
      setSearchError(null);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 120);
    }
  }, [isOpen]);

  // Debounced search when user types
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    const trimmed = courseQuery.trim();
    if (!trimmed) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    debounceTimerRef.current = setTimeout(async () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const results = await TimetableAPI.searchPrograms(trimmed, controller.signal);
        setSearchResults(results);
        if (results.length === 0) {
          setSearchError("No courses found matching this ID or name.");
        }
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          setSearchError("Unable to load courses. Please try again.");
        }
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [courseQuery]);

  // Extract year number from program name, e.g. "TU856/3" -> 3, "COMSCI2" -> 2, or "- 2" -> 2
  const extractYearFromProgram = (program: ProgramSearchResult): number => {
    const match = program.Name.match(/\/([0-9]+)/);
    if (match) {
      return parseInt(match[1], 10);
    }
    const stageMatch = program.Name.match(/stage\s*([0-9]+)|year\s*([0-9]+)/i);
    if (stageMatch) {
      return parseInt(stageMatch[1] || stageMatch[2], 10);
    }
    const hyphenMatch = program.Name.match(/[-–]\s*([1-6])\b/);
    if (hyphenMatch) {
      return parseInt(hyphenMatch[1], 10);
    }
    const codeEndDigit = program.Name.match(/^([A-Za-z]+)([1-6])\b/);
    if (codeEndDigit) {
      return parseInt(codeEndDigit[2], 10);
    }
    return 1;
  };

  // When a user selects or confirms a course ID
  const handleSelectCourse = async (courseCode: string, courseTitle?: string, preloadedResults?: ProgramSearchResult[]) => {
    setIsSearching(true);
    setSearchError(null);

    try {
      let programs = preloadedResults;
      if (!programs || programs.length === 0) {
        programs = await TimetableAPI.searchPrograms(courseCode);
      }

      // Filter programs that belong to this course code
      const matchingPrograms = (programs || []).filter((p) => {
        const parsed = parseProgramCodeAndTitle(p.Name, p.Description);
        return (
          parsed.code.toLowerCase().startsWith(courseCode.toLowerCase()) ||
          p.Name.toLowerCase().includes(courseCode.toLowerCase())
        );
      });

      const effectivePrograms = matchingPrograms.length > 0 ? matchingPrograms : programs || [];

      // Group into year options
      const yearMap = new Map<number, YearOption>();

      effectivePrograms.forEach((prog) => {
        const yr = extractYearFromProgram(prog);
        const { title } = parseProgramCodeAndTitle(prog.Name, prog.Description);
        const yrPadded = String(yr).padStart(2, "0");

        if (!yearMap.has(yr)) {
          yearMap.set(yr, {
            yearNumber: yr,
            yearCode: yrPadded,
            title: `Year ${yr}`,
            subtitle: title || prog.Description || "Undergraduate Degree",
            programIdentity: prog.Identity,
            rawData: prog,
          });
        }
      });

      // If no discrete years found, generate default 1-4
      let sortedYears: YearOption[] = Array.from(yearMap.values()).sort(
        (a, b) => a.yearNumber - b.yearNumber
      );

      if (sortedYears.length === 0) {
        sortedYears = [1, 2, 3, 4].map((yr) => ({
          yearNumber: yr,
          yearCode: String(yr).padStart(2, "0"),
          title: `Year ${yr}`,
          subtitle: courseTitle || "Bachelor of Science (Honours)",
          programIdentity: undefined,
          rawData: null,
        }));
      }

      const finalTitle = courseTitle || (effectivePrograms[0] ? parseProgramCodeAndTitle(effectivePrograms[0].Name).title : "Degree Program");
      setSelectedCourseCode(courseCode.toUpperCase());
      setSelectedCourseTitle(finalTitle);
      setAvailableYears(sortedYears);

      // Default to Year 1 or Year 3 if available
      const defaultYear = sortedYears.find((y) => y.yearNumber === 3) || sortedYears[0];
      setSelectedYearNumber(defaultYear.yearNumber);

      // Slide forward to year selection page
      setDirection(1);
      setPhase("year");
    } catch (e) {
      setSearchError("Failed to fetch course years. Please try another course ID.");
    } finally {
      setIsSearching(false);
    }
  };

  // Confirm selected year and launch timetable
  const handleConfirmSelection = () => {
    const activeYearOption = availableYears.find((y) => y.yearNumber === selectedYearNumber) || availableYears[0];
    if (!activeYearOption) return;

    if (activeYearOption.rawData) {
      onSelectProgram(activeYearOption.rawData);
    } else {
      // Synthetic fallback program if API had no exact item
      const fallbackProgram: ProgramSearchResult = {
        Identity: activeYearOption.programIdentity || `custom-${selectedCourseCode}-${selectedYearNumber}`,
        CategoryTypeIdentity: "241e4d36-93f2-4938-9e15-d4536fe3b2eb",
        Name: `${selectedCourseCode}/${selectedYearNumber} ${selectedCourseTitle}`,
        Description: selectedCourseTitle,
      };
      onSelectProgram(fallbackProgram);
    }
    StorageService.setCompletedCourseOnboarding(true);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="course-year-setup-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-0 bg-black/80 backdrop-blur-sm overflow-hidden"
          onClick={isMandatory ? undefined : onClose}
        >
          <motion.div
            key="course-year-setup-page"
            initial={{ y: "100%", opacity: 0.95 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0.95 }}
            transition={{
              type: "spring",
              damping: 30,
              stiffness: 280,
              mass: 0.9,
            }}
            className="w-full h-full bg-black text-white flex flex-col overflow-hidden relative transition-colors shadow-2xl course-setup-modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100vw",
              height: "100dvh",
              maxHeight: "100dvh",
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          >
        {/* Top Minimal Bar */}
        <div
          className="px-6 pt-5 pb-3 flex items-center justify-between z-40 relative border-b border-white/15 bg-black course-setup-header"
          style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 20px)" }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-100 course-step-badge">
            <span className="w-2 h-2 rounded-full bg-zinc-300 course-step-dot" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-100 course-step-text">
              {phase === "input" ? "Step 1 • Enter Course ID" : "Step 2 • Select Course Year"}
            </span>
          </div>

          {!isMandatory && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-white border border-white/20 hover:bg-zinc-800 transition-colors course-close-btn"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          )}
        </div>

        {/* Dynamic Body Content */}
        <div className="flex-1 relative overflow-hidden bg-black text-white w-full">
          <AnimatePresence initial={false} custom={direction}>
            {/* ========================================================= */}
            {/* PHASE 1: ENTER COURSE ID                                  */}
            {/* ========================================================= */}
            {phase === "input" && (
              <motion.div
                key="input-phase"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={slideTransition}
                className="absolute inset-0 w-full h-full flex flex-col justify-center max-w-lg mx-auto px-4 sm:px-8 py-2 z-10"
              >
                <div className="text-center mb-5">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-zinc-800 text-white border border-zinc-700 mb-3">
                    <GraduationCap className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    Enter Your Course ID
                  </h2>
                  <p className="text-xs sm:text-sm text-zinc-300 mt-1 max-w-sm mx-auto font-medium">
                    Type your degree code (e.g. <span className="font-bold text-white">{activeUniId === "dcu" ? "COMSCI" : "TU856"}</span>) or keyword to find your timetable.
                  </p>
                </div>

                {/* Main Course ID Input Bar - Plain 2D */}
                <div className="relative flex items-center w-full rounded-xl bg-zinc-950 mb-3.5 transition-colors" style={{ border: "1.5px solid #56352D" }}>
                  <Search className="w-5 h-5 ml-3.5 text-white shrink-0" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={courseQuery}
                    onChange={(e) => setCourseQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && courseQuery.trim()) {
                        handleSelectCourse(courseQuery.trim());
                      }
                    }}
                    placeholder={activeUniId === "dcu" ? "e.g. COMSCI, CASE, BSI..." : "e.g. TU856, TU857, TU756..."}
                    className="w-full pl-3 pr-3 py-3 bg-transparent text-white placeholder-zinc-500 font-bold text-base focus:outline-none"
                  />
                  {courseQuery ? (
                    <button
                      onClick={() => setCourseQuery("")}
                      className="mr-3 p-1 rounded text-white hover:bg-zinc-800 transition-colors"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  ) : (
                    <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 mr-3 rounded bg-zinc-900 text-white border border-white/50 select-none">
                      ↵ Enter
                    </span>
                  )}
                </div>

                {/* Live Search Results or Suggestions */}
                {isSearching && (
                  <div className="flex items-center justify-center py-4 text-white gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span className="text-xs font-bold">Checking {activeUniId === "dcu" ? "DCU" : "TU Dublin"} timetable records...</span>
                  </div>
                )}

                {/* Matching Search Results Dropdown List */}
                {!isSearching && searchResults.length > 0 && (
                  <div className="max-h-56 overflow-y-auto space-y-1 pr-1 mb-4 rounded-xl bg-zinc-950 p-2 border border-white/20">
                    {searchResults.slice(0, 5).map((prog) => {
                      const { code: shortCode, title: progTitle } = parseProgramCodeAndTitle(
                        prog.Name,
                        prog.Description
                      );
                      const baseCode = shortCode.split("/")[0];
                      return (
                        <button
                          key={prog.Identity}
                          onClick={() => handleSelectCourse(baseCode, progTitle, searchResults)}
                          className="w-full text-left p-2.5 rounded-lg hover:bg-zinc-900 border border-white/20 flex items-center justify-between transition-colors"
                        >
                          <div className="min-w-0 pr-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold px-2 py-0.5 rounded shrink-0 border border-zinc-700" style={{ background: '#DE838D', color: '#fff' }}>
                                {baseCode}
                              </span>
                              <span className="text-xs font-bold text-white truncate">
                                {progTitle}
                              </span>
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-white shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Search Error Notice */}
                {!isSearching && searchError && (
                  <div className="p-2.5 mb-3 rounded-xl bg-zinc-950 border border-white/20 text-xs text-white text-center font-bold">
                    {searchError}
                  </div>
                )}

                {/* Quick Pick Chips / Popular Courses as Plain 2D Cards */}
                <div className="pt-2">
                  <div className="text-[11px] font-black uppercase tracking-wider text-white mb-2 px-1">
                    Popular Course IDs
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {popularCourses.map((c) => (
                      <button
                        key={c.code}
                        onClick={() => handleSelectCourse(c.code, c.name)}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-900 border border-white/20 transition-colors text-left"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-1">
                          <span className="px-2 py-0.5 rounded-lg text-xs font-bold shrink-0 border border-zinc-700" style={{ background: '#DE838D', color: '#fff' }}>
                            {c.code}
                          </span>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white truncate">
                              {c.name.split(" (")[0]}
                            </div>
                            <div className="text-[10px] text-zinc-400 font-medium truncate">
                              {activeUniId === "dcu" ? "DCU" : "TU Dublin"}
                            </div>
                          </div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-white shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ========================================================= */}
            {/* PHASE 2: COURSE MINIMISED TO LEFT + ROTARY YEAR DIAL       */}
            {/* ========================================================= */}
            {phase === "year" && (
              <motion.div
                key="year-phase"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={slideTransition}
                className="absolute inset-0 w-full h-full flex flex-col bg-black text-white"
              >
                {/* Selected Course Badge / Card Aligned to the Right */}
                <div className="flex items-center justify-end pt-3 sm:pt-4 pb-2 z-40 px-4 sm:px-8">
                  <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-zinc-950 border border-white/25 transition-colors">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-100 border border-zinc-700 shrink-0">
                      {selectedCourseCode}
                    </span>
                    <span className="text-xs font-bold text-white max-w-[170px] sm:max-w-xs truncate">
                      {selectedCourseTitle}
                    </span>
                    <button
                      onClick={() => {
                        setDirection(-1);
                        setPhase("input");
                      }}
                      className="inline-flex items-center justify-center w-6 h-6 rounded-lg text-white hover:bg-zinc-800 border border-white/20 transition-colors ml-2 shrink-0 cursor-pointer"
                      title="Change course ID"
                    >
                      <Pencil className="w-3.5 h-3.5 text-current" />
                    </button>
                  </div>
                </div>

                {/* The Rotary Arc Wheel */}
                <div className="flex-1 relative w-full flex items-center bg-black">
                  <CourseYearDial
                    years={availableYears}
                    selectedYear={selectedYearNumber}
                    onSelectYear={(yr) => setSelectedYearNumber(yr)}
                  />
                </div>

                {/* Bottom Right Confirm Button - Plain 2D */}
                <div className="absolute right-4 bottom-4 sm:right-6 sm:bottom-6 z-40">
                  <button
                    type="button"
                    onClick={handleConfirmSelection}
                    style={{
                      backgroundColor: "#16a34a",
                      borderColor: "#15803d",
                      color: "#ffffff",
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm border shadow-md transition-all active:scale-95 cursor-pointer course-confirm-btn"
                  >
                    <span className="font-extrabold text-white">Confirm & Continue</span>
                    <ArrowRight className="w-4 h-4 text-white shrink-0" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
