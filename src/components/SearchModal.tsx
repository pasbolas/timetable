import React, { useState, useEffect, useRef } from "react";
import { Search, X, Loader2, BookOpen, Clock, ArrowRight, History, GraduationCap } from "lucide-react";
import { ProgramSearchResult } from "../types/timetable";
import { TimetableAPI } from "../services/apiClient";
import { parseProgramCodeAndTitle } from "../services/transformer";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProgram: (program: ProgramSearchResult) => void;
  recentPrograms: ProgramSearchResult[];
  currentProgramId: string;
  isMandatory?: boolean;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onSelectProgram,
  recentPrograms,
  currentProgramId,
  isMandatory = false,
}) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProgramSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setResults([]);
      setSearchError(null);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isMandatory) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, isMandatory]);

  // Debounced search
  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    if (!query.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    debounceTimeoutRef.current = setTimeout(async () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const data = await TimetableAPI.searchPrograms(query, controller.signal);
        setResults(data);
        if (data.length === 0) {
          setSearchError("No programs found matching your search.");
        }
      } catch (err: unknown) {
        if ((err as { name?: string })?.name !== "AbortError") {
          setSearchError("Failed to search programs. Please try again.");
        }
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    };
  }, [query]);

  if (!isOpen) return null;

  const handleSelect = (program: ProgramSearchResult) => {
    onSelectProgram(program);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-0 sm:p-4 bg-black/60 animate-in fade-in duration-200"
      onClick={isMandatory ? undefined : onClose}
    >
      <div
        className="w-full sm:max-w-lg h-full sm:h-auto sm:max-h-[85vh] bg-white dark:bg-neutral-900 sm:rounded-2xl border-2 border-stone-300 dark:border-neutral-700 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mandatory First-Launch Header Banner */}
        {isMandatory && (
          <div
            className="px-5 pt-5 pb-3.5 bg-stone-100 dark:bg-neutral-800 border-b border-stone-200 dark:border-neutral-700"
            style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 20px)" }}
          >
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-600 text-white mb-2">
              <GraduationCap className="w-3.5 h-3.5" />
              Required Setup • Select Course
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white leading-tight">
              What course are you studying?
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
              To build your personal timetable, type your degree program code (e.g. <span className="font-bold text-blue-600 dark:text-blue-400">TU856</span>) or course name below.
            </p>
          </div>
        )}

        {/* Modal Header & Search Bar */}
        <div
          className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3"
          style={{
            paddingTop: isMandatory ? "16px" : "max(env(safe-area-inset-top, 0px), 16px)",
          }}
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                isMandatory
                  ? "Type your course code or title (e.g. TU856, Computer Science)..."
                  : "Search course code or title (e.g. TU856, Computer Science)..."
              }
              className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {!isMandatory && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Close search"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isSearching && (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Loader2 className="w-7 h-7 animate-spin text-blue-500 mb-2" />
              <span className="text-xs font-medium">Searching programs...</span>
            </div>
          )}

          {/* Search Results */}
          {!isSearching && results.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">
                Search Results ({results.length})
              </div>
              <div className="space-y-1.5">
                {results.map((prog) => {
                  const isCurrent = prog.Identity === currentProgramId;
                  const { code: shortCode, title: programTitle } = parseProgramCodeAndTitle(
                    prog.Name,
                    prog.Description
                  );
                  return (
                    <button
                      key={prog.Identity}
                      onClick={() => handleSelect(prog)}
                      className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between group ${
                        isCurrent
                          ? "bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:border-blue-900/60"
                          : "bg-slate-50 hover:bg-slate-100 border-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 dark:border-slate-800"
                      }`}
                    >
                      <div className="flex-1 min-w-0 pr-3">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-blue-600 text-white shrink-0">
                            {shortCode}
                          </span>
                          {isCurrent && (
                            <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                          {programTitle}
                        </div>
                        {prog.Description && prog.Description !== programTitle && (
                          <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {prog.Description}
                          </div>
                        )}
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty / Error message */}
          {!isSearching && searchError && (
            <div className="py-8 text-center text-slate-500 text-xs">
              <BookOpen className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              {searchError}
            </div>
          )}

          {/* Recent Programs / Quick Suggestions */}
          {!query && recentPrograms.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5 px-1">
                <History className="w-3.5 h-3.5" />
                Recent & Saved Programs
              </div>
              <div className="space-y-1.5">
                {recentPrograms.map((prog) => {
                  const isCurrent = prog.Identity === currentProgramId;
                  const { code: shortCode, title: programTitle } = parseProgramCodeAndTitle(
                    prog.Name,
                    prog.Description
                  );
                  return (
                    <button
                      key={prog.Identity}
                      onClick={() => handleSelect(prog)}
                      className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between group ${
                        isCurrent
                          ? "bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:border-blue-900/60"
                          : "bg-slate-50 hover:bg-slate-100 border-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 dark:border-slate-800"
                      }`}
                    >
                      <div className="flex-1 min-w-0 pr-3">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-slate-700 dark:bg-slate-700 text-white shrink-0">
                            {shortCode}
                          </span>
                          {isCurrent && (
                            <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                              Selected
                            </span>
                          )}
                        </div>
                        <div className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                          {programTitle}
                        </div>
                      </div>
                      <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
          Scientia EU Timetabler • TU Dublin
        </div>
      </div>
    </div>
  );
};
