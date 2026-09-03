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
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/60"
      onClick={isMandatory ? undefined : onClose}
    >
      <div
        className="w-full sm:max-w-2xl h-full sm:h-[620px] bg-[#f4f1e0] dark:bg-[#1e1e1e] sm:rounded-2xl border-2 border-stone-300 dark:border-neutral-700 flex flex-col overflow-hidden relative transition-colors"
        onClick={(e) => e.stopPropagation()}
        style={{
          minHeight: "100dvh sm:620px",
        }}
      >
        {/* Top Minimal Bar */}
        <div
          className="px-6 pt-5 pb-3 flex items-center justify-between z-40 relative border-b border-stone-300 dark:border-neutral-800"
          style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 20px)" }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-neutral-800 border border-blue-300 dark:border-neutral-700 text-blue-700 dark:text-blue-400">
            <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400" />
            <span className="text-[10px] font-bold uppercase tracking-widest">
              {phase === "input" ? "Step 1 • Enter Course ID" : "Step 2 • Select Course Year"}
            </span>
          </div>

          {!isMandatory && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-stone-200 dark:hover:bg-neutral-800 transition-colors"
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
            <div className="flex-1 flex flex-col justify-center max-w-lg mx-auto w-full py-2 relative z-10">
              <div className="text-center mb-5">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 text-white mb-3">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  Enter Your Course ID
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-neutral-400 mt-1 max-w-sm mx-auto">
                  Type your degree code (e.g. <span className="font-bold text-blue-600 dark:text-blue-400">TU856</span>) or keyword to find your timetable.
                </p>
              </div>

              {/* Main Course ID Input Bar - Plain 2D */}
              <div className="relative flex items-center w-full rounded-xl bg-white dark:bg-neutral-900 border-2 border-stone-300 dark:border-neutral-700 focus-within:border-blue-600 dark:focus-within:border-blue-500 mb-3.5 transition-colors">
                <Search className="w-5 h-5 ml-3.5 text-slate-400 shrink-0" />
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
                  className="w-full pl-3 pr-3 py-3 bg-transparent text-slate-900 dark:text-white placeholder-slate-400 font-bold text-base focus:outline-none"
                />
                {courseQuery ? (
                  <button
                    onClick={() => setCourseQuery("")}
                    className="mr-3 p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-stone-100 dark:hover:bg-neutral-800 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                ) : (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 mr-3 rounded bg-stone-100 dark:bg-neutral-800 text-slate-500 dark:text-neutral-400 border border-stone-200 dark:border-neutral-700 select-none">
                    ↵ Enter
                  </span>
                )}
              </div>

              {/* Live Search Results or Suggestions */}
              {isSearching && (
                <div className="flex items-center justify-center py-4 text-slate-500 dark:text-neutral-400 gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span className="text-xs font-semibold">Checking TU Dublin timetable records...</span>
                </div>
              )}

              {/* Matching Search Results Dropdown List */}
              {!isSearching && searchResults.length > 0 && (
                <div className="max-h-56 overflow-y-auto space-y-1 pr-1 mb-4 rounded-xl bg-white dark:bg-neutral-900 p-2 border-2 border-stone-300 dark:border-neutral-700">
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
                        className="w-full text-left p-2.5 rounded-lg hover:bg-stone-100 dark:hover:bg-neutral-800 border border-transparent hover:border-stone-300 dark:hover:border-neutral-600 flex items-center justify-between transition-colors"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-600 text-white shrink-0">
                              {baseCode}
                            </span>
                            <span className="text-xs font-semibold text-slate-800 dark:text-neutral-200 truncate">
                              {progTitle}
                            </span>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Search Error Notice */}
              {!isSearching && searchError && (
                <div className="p-2.5 mb-3 rounded-xl bg-amber-100 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-400 text-center font-semibold">
                  {searchError}
                </div>
              )}

              {/* Quick Pick Chips / Popular Courses as Plain 2D Cards */}
              <div className="pt-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400 mb-2 px-1">
                  Popular Course IDs
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {POPULAR_COURSES.map((c) => (
                    <button
                      key={c.code}
                      onClick={() => handleSelectCourse(c.code, c.name)}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-neutral-800 hover:bg-stone-100 dark:hover:bg-neutral-700 border-2 border-stone-200 dark:border-neutral-700 hover:border-blue-600 dark:hover:border-blue-500 transition-colors text-left"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-1">
                        <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-blue-100 text-blue-800 dark:bg-neutral-700 dark:text-blue-400 shrink-0">
                          {c.code}
                        </span>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-800 dark:text-neutral-200 truncate">
                            {c.name.split(" (")[0]}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-neutral-400 truncate">
                            TU Dublin
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
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
            <div className="flex-1 flex flex-col relative w-full h-full">
              {/* Minimized Course Badge / Card on the Left */}
              <div className="flex items-center justify-between pb-2 z-40">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-800 border border-stone-300 dark:border-neutral-700 transition-colors">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-blue-600 text-white">
                    {selectedCourseCode}
                  </span>
                  <span className="text-xs font-semibold text-slate-800 dark:text-neutral-200 max-w-[170px] sm:max-w-xs truncate">
                    {selectedCourseTitle}
                  </span>
                  <button
                    onClick={() => setPhase("input")}
                    className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-stone-100 dark:hover:bg-neutral-700 rounded transition-colors ml-1"
                    title="Change course ID"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* The Rotary Arc Wheel */}
              <div className="flex-1 relative w-full flex items-center">
                <CourseYearDial
                  years={availableYears}
                  selectedYear={selectedYearNumber}
                  onSelectYear={(yr) => setSelectedYearNumber(yr)}
                />
              </div>

              {/* Bottom Right Confirm Button - Plain 2D */}
              <div className="absolute right-2 bottom-2 sm:right-4 sm:bottom-4 z-40">
                <button
                  type="button"
                  onClick={handleConfirmSelection}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-colors cursor-pointer"
                >
                  <Maximize2 className="w-4 h-4 text-white" />
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
