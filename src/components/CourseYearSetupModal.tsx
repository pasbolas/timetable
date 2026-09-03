import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  X,
  Loader2,
  GraduationCap,
  ArrowRight,
  Maximize2,
  RotateCcw,
  Sparkles
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
        className="w-full sm:max-w-2xl h-full sm:h-[640px] bg-white/95 dark:bg-[#12161e]/95 backdrop-blur-2xl sm:rounded-[32px] shadow-2xl flex flex-col overflow-hidden border border-slate-200/80 dark:border-white/10 relative transition-all"
        onClick={(e) => e.stopPropagation()}
        style={{
          minHeight: "100dvh sm:640px",
        }}
      >
        {/* Ambient Glowing Background Lights */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[450px] h-[360px] bg-gradient-to-b from-blue-500/25 via-indigo-500/15 to-transparent dark:from-blue-500/30 dark:via-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-gradient-to-tl from-purple-500/20 to-transparent dark:from-purple-500/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-gradient-to-tr from-sky-500/15 to-transparent dark:from-sky-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Top Minimal Bar */}
        <div
          className="px-6 pt-5 pb-2 flex items-center justify-between z-40 relative"
          style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 20px)" }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 dark:bg-blue-500/15 border border-blue-500/20 text-blue-600 dark:text-blue-400">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-[10px] font-extrabold uppercase tracking-widest">
              {phase === "input" ? "Step 1 • Enter Course ID" : "Step 2 • Select Course Year"}
            </span>
          </div>

          {!isMandatory && (
            <button
              onClick={onClose}
              className="p-2 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors"
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
            <div className="flex-1 flex flex-col justify-center max-w-lg mx-auto w-full py-2 animate-in fade-in zoom-in-95 duration-200 relative z-10">
              <div className="text-center mb-5">
                <div className="relative inline-flex items-center justify-center mb-3.5 group">
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-500 blur-xl opacity-50 group-hover:opacity-80 transition-opacity" />
                  <div className="relative w-16 h-16 rounded-3xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-500 text-white flex items-center justify-center shadow-xl shadow-blue-500/30 ring-4 ring-white/30 dark:ring-white/10 group-hover:scale-105 transition-transform">
                    <GraduationCap className="w-8 h-8" />
                  </div>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-snug">
                  Enter Your <span className="bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 dark:from-blue-400 dark:via-indigo-300 dark:to-purple-400 bg-clip-text text-transparent">Course ID</span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  Type your degree code (e.g. <span className="font-bold text-blue-600 dark:text-blue-400">TU856</span>) or keyword to find your timetable.
                </p>
              </div>

              {/* Main Course ID Input Bar with Glowing Animated Gradient Border */}
              <div className="relative group p-[1.5px] rounded-2xl bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 dark:from-slate-700/60 dark:via-slate-600/60 dark:to-slate-700/60 focus-within:from-blue-500 focus-within:via-indigo-500 focus-within:to-purple-500 transition-all duration-300 shadow-md shadow-black/5 dark:shadow-black/20 mb-3.5">
                <div className="relative flex items-center w-full rounded-[14.5px] bg-white dark:bg-slate-900/95 backdrop-blur-xl">
                  <Search className="w-5 h-5 ml-4 text-slate-400 group-focus-within:text-blue-500 dark:group-focus-within:text-blue-400 transition-colors shrink-0" />
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
                    className="w-full pl-3.5 pr-4 py-3.5 bg-transparent text-slate-900 dark:text-white placeholder-slate-400 font-bold text-base focus:outline-none"
                  />
                  {courseQuery ? (
                    <button
                      onClick={() => setCourseQuery("")}
                      className="mr-3 p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  ) : (
                    <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 mr-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200/70 dark:border-slate-700/60 select-none">
                      ↵ Enter
                    </span>
                  )}
                </div>
              </div>

              {/* Live Search Results or Suggestions */}
              {isSearching && (
                <div className="flex items-center justify-center py-5 text-slate-400 gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                  <span className="text-xs font-medium">Checking TU Dublin timetable records...</span>
                </div>
              )}

              {/* Matching Search Results Dropdown List */}
              {!isSearching && searchResults.length > 0 && (
                <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 mb-4 rounded-2xl bg-white/85 dark:bg-slate-900/85 p-2 border border-slate-200/80 dark:border-white/10 backdrop-blur-md shadow-xl">
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
                        className="w-full text-left p-3 rounded-xl hover:bg-blue-50 dark:hover:bg-slate-800 border border-transparent hover:border-blue-200 dark:hover:border-blue-900/50 flex items-center justify-between group transition-all"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center gap-2.5">
                            <span className="text-xs font-black px-2 py-1 rounded-lg bg-blue-600 text-white shrink-0 shadow-sm">
                              {baseCode}
                            </span>
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                              {progTitle}
                            </span>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Search Error Notice */}
              {!isSearching && searchError && (
                <div className="p-3 mb-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 text-center font-medium">
                  {searchError}
                </div>
              )}

              {/* Quick Pick Chips / Popular Courses as Interactive Grid Cards */}
              <div className="pt-2">
                <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2.5 px-1">
                  <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                  <span>Popular Course IDs</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {POPULAR_COURSES.map((c) => (
                    <button
                      key={c.code}
                      onClick={() => handleSelectCourse(c.code, c.name)}
                      className="group relative flex items-center justify-between p-2.5 sm:p-3 rounded-2xl bg-white/70 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-800/90 border border-slate-200/80 dark:border-white/10 hover:border-blue-500/40 dark:hover:border-blue-400/40 shadow-xs hover:shadow-md hover:shadow-blue-500/10 active:scale-98 transition-all text-left"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-1">
                        <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0 group-hover:bg-blue-600 group-hover:text-white dark:group-hover:bg-blue-500 dark:group-hover:text-white transition-all shadow-2xs">
                          {c.code}
                        </span>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {c.name.split(" (")[0]}
                          </div>
                          <div className="text-[10px] font-medium text-slate-400 dark:text-slate-500 truncate">
                            TU Dublin
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 dark:group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all shrink-0" />
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
                <div className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-sm transition-all">
                  <span className="text-xs font-black px-2.5 py-1 rounded-xl bg-blue-600 text-white shadow-sm">
                    {selectedCourseCode}
                  </span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 max-w-[170px] sm:max-w-xs truncate">
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

              {/* The Rotary Arc Wheel */}
              <div className="flex-1 relative w-full flex items-center">
                <CourseYearDial
                  years={availableYears}
                  selectedYear={selectedYearNumber}
                  onSelectYear={(yr) => setSelectedYearNumber(yr)}
                />
              </div>

              {/* Bottom Right Floating Action / Confirm Button */}
              <div className="absolute right-2 bottom-2 sm:right-4 sm:bottom-4 z-40">
                <button
                  type="button"
                  onClick={handleConfirmSelection}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-blue-500/25 active:scale-96 transition-all group cursor-pointer"
                >
                  <Maximize2 className="w-4 h-4 text-white group-hover:rotate-45 transition-transform duration-300" />
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
