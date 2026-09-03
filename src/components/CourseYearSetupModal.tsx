import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  X,
  Loader2,
  GraduationCap,
  ArrowRight,
  Maximize2,
  RotateCcw
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

const POPULAR_COURSES = [
  { code: "TU856", name: "Computer Science (Full-Time)" },
  { code: "TU857", name: "Computer Science (Infrastructure)" },
  { code: "TU858", name: "Computer Science (International)" },
  { code: "TU756", name: "Computing (General)" },
  { code: "TU854", name: "Data Science & AI" },
];

export const CourseYearSetupModal: React.FC<CourseYearSetupModalProps> = ({
  isOpen,
  isMandatory = false,
  onClose,
  onSelectProgram,
  currentProgramId: _currentProgramId,
}) => {
  // Phase state: "input" (course ID entry) -> "year" (course minimized to left, dial visible)
  const [phase, setPhase] = useState<"input" | "year">("input");
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

  // Reset or initialize on open
  useEffect(() => {
    if (isOpen) {
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

  if (!isOpen) return null;

  // Extract year number from program name, e.g. "TU856/3" -> 3, or "/ 2" -> 2
  const extractYearFromProgram = (program: ProgramSearchResult): number => {
    const match = program.Name.match(/\/([0-9]+)/);
    if (match) {
      return parseInt(match[1], 10);
    }
    const stageMatch = program.Name.match(/stage\s*([0-9]+)|year\s*([0-9]+)/i);
    if (stageMatch) {
      return parseInt(stageMatch[1] || stageMatch[2], 10);
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

      // Transition smoothly: course card minimizes to the left!
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300"
      onClick={isMandatory ? undefined : onClose}
    >
      <div
        className="w-full sm:max-w-2xl h-full sm:h-[620px] bg-[#f7f7f8] dark:bg-[#0c1017] sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200/80 dark:border-slate-800 relative transition-all"
        onClick={(e) => e.stopPropagation()}
        style={{
          minHeight: "100dvh sm:620px",
        }}
      >
        {/* Top Minimal Bar */}
        <div
          className="px-6 pt-5 pb-3 flex items-center justify-between z-40"
          style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 20px)" }}
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              {phase === "input" ? "Step 1 • Enter Course ID" : "Step 2 • Select Course Year"}
            </span>
          </div>

          {!isMandatory && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Dynamic Body Content */}
        <div className="flex-1 flex flex-col relative overflow-hidden px-4 sm:px-8 pb-6">
          {/* ========================================================= */}
          {/* PHASE 1: ENTER COURSE ID                                  */}
          {/* ========================================================= */}
          {phase === "input" && (
            <div className="flex-1 flex flex-col justify-center max-w-lg mx-auto w-full py-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 mb-3 shadow-sm">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  Enter Your Course ID
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Type your degree code (e.g. <span className="font-bold text-blue-600 dark:text-blue-400">TU856</span>) or course keyword to begin.
                </p>
              </div>

              {/* Main Course ID Input Bar */}
              <div className="relative mb-4">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
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
                  placeholder="e.g. TU856, TU857, TU756..."
                  className="w-full pl-12 pr-12 py-3.5 rounded-2xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 font-semibold text-base shadow-sm border border-slate-200/80 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                {courseQuery && (
                  <button
                    onClick={() => setCourseQuery("")}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Live Search Results or Suggestions */}
              {isSearching && (
                <div className="flex items-center justify-center py-6 text-slate-400 gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                  <span className="text-xs font-medium">Checking TU Dublin timetable records...</span>
                </div>
              )}

              {/* Matching Search Results Dropdown List */}
              {!isSearching && searchResults.length > 0 && (
                <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 mb-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 p-2 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-sm shadow-sm">
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
                        className="w-full text-left p-2.5 rounded-xl hover:bg-blue-50 dark:hover:bg-slate-800 border border-transparent hover:border-blue-200 dark:hover:border-blue-900/50 flex items-center justify-between group transition-all"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-blue-600 text-white shrink-0">
                              {baseCode}
                            </span>
                            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                              {progTitle}
                            </span>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Search Error Notice */}
              {!isSearching && searchError && (
                <div className="p-3 mb-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 text-center">
                  {searchError}
                </div>
              )}

              {/* Quick Pick Chips */}
              <div className="pt-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
                  Popular Course IDs
                </div>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_COURSES.map((c) => (
                    <button
                      key={c.code}
                      onClick={() => handleSelectCourse(c.code, c.name)}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 shadow-2xs transition-all flex items-center gap-1.5"
                    >
                      <span className="font-bold text-blue-600 dark:text-blue-400">{c.code}</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline">
                        {c.name.split(" ")[0]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* PHASE 2: COURSE MINIMISED TO LEFT + ROTARY YEAR DIAL       */}
          {/* ========================================================= */}
          {phase === "year" && (
            <div className="flex-1 flex flex-col relative w-full h-full animate-in fade-in duration-300">
              {/* Minimized Course Badge / Card on the Left */}
              <div className="flex items-center justify-between pb-2 z-40">
                <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm transition-all">
                  <span className="text-xs font-extrabold px-2 py-0.5 rounded-lg bg-blue-600 text-white">
                    {selectedCourseCode}
                  </span>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 max-w-[170px] sm:max-w-xs truncate">
                    {selectedCourseTitle}
                  </span>
                  <button
                    onClick={() => setPhase("input")}
                    className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors ml-1"
                    title="Change course ID"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* The Rotary Arc Wheel ("This Thing") */}
              <div className="flex-1 relative w-full flex items-center">
                <CourseYearDial
                  years={availableYears}
                  selectedYear={selectedYearNumber}
                  onSelectYear={(yr) => setSelectedYearNumber(yr)}
                />
              </div>

              {/* Bottom Right Floating Action / Confirm Button */}
              {/* Mirrors the rounded action button in the reference screenshot */}
              <div className="absolute right-2 bottom-2 sm:right-4 sm:bottom-4 z-40">
                <button
                  type="button"
                  onClick={handleConfirmSelection}
                  className="flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-white border border-slate-200/80 dark:border-slate-800 shadow-lg hover:shadow-xl active:scale-96 transition-all group font-bold text-sm cursor-pointer"
                >
                  <Maximize2 className="w-4 h-4 text-slate-600 dark:text-slate-300 group-hover:rotate-45 transition-transform duration-300" />
                  <span>Confirm & Continue</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
