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
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={isMandatory ? undefined : onClose}
    >
      <div
        className="w-full sm:max-w-lg h-full sm:h-auto sm:max-h-[85vh] bg-black text-white sm:rounded-2xl border border-white/20 flex flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mandatory First-Launch Header Banner */}
        {isMandatory && (
          <div
            className="px-5 pt-5 pb-3.5 bg-black border-b border-white/15"
            style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 20px)" }}
          >
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-zinc-800 text-zinc-100 border border-zinc-700 mb-2">
              <GraduationCap className="w-3.5 h-3.5 text-zinc-300" />
              Required Setup • Select Course
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white leading-tight">
              What course are you studying?
            </h2>
            <p className="text-xs text-white/90 mt-1 leading-relaxed">
              To build your personal timetable, type your degree program code (e.g. <span className="font-bold text-white">TU856</span>) or course name below.
            </p>
          </div>
        )}

        {/* Modal Header & Search Bar */}
        <div
          className="p-4 border-b border-white/15 flex items-center gap-3 bg-black"
          style={{
            paddingTop: isMandatory ? "16px" : "max(env(safe-area-inset-top, 0px), 16px)",
          }}
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white" />
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
              className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-zinc-950 text-white border border-white/20 placeholder-zinc-400 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-500 transition-all"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-white hover:bg-zinc-800 rounded"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            )}
          </div>
          {!isMandatory && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-white border border-white/20 hover:bg-zinc-800 transition-colors"
              title="Close search"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black">
          {isSearching && (
            <div className="flex flex-col items-center justify-center py-12 text-white">
              <Loader2 className="w-7 h-7 animate-spin text-white mb-2" />
              <span className="text-xs font-bold">Searching programs...</span>
            </div>
          )}

          {/* Search Results */}
          {!isSearching && results.length > 0 && (
            <div>
              <div className="text-xs font-black text-white uppercase tracking-wider mb-2 px-1">
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
                          ? "bg-zinc-800 border-white/40 text-white"
                          : "bg-zinc-950 hover:bg-zinc-900 border-white/20 text-white"
                      }`}
                    >
                      <div className="flex-1 min-w-0 pr-3">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-100 shrink-0 border border-zinc-700">
                            {shortCode}
                          </span>
                          {isCurrent && (
                            <span className="text-[10px] font-black text-white uppercase tracking-wider">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="text-sm font-bold text-white truncate">
                          {programTitle}
                        </div>
                        {prog.Description && prog.Description !== programTitle && (
                          <div className="text-xs font-medium text-zinc-300 truncate mt-0.5">
                            {prog.Description}
                          </div>
                        )}
                      </div>
                      <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-0.5 transition-all shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty / Error message */}
          {!isSearching && searchError && (
            <div className="py-8 text-center text-white text-xs font-bold">
              <BookOpen className="w-8 h-8 text-white mx-auto mb-2" />
              {searchError}
            </div>
          )}

          {/* Recent Programs / Quick Suggestions */}
          {!query && recentPrograms.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-black text-white uppercase tracking-wider mb-2.5 px-1">
                <History className="w-3.5 h-3.5 text-white" />
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
                          ? "bg-zinc-800 border-white/40 text-white"
                          : "bg-zinc-950 hover:bg-zinc-900 border-white/20 text-white"
                      }`}
                    >
                      <div className="flex-1 min-w-0 pr-3">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-100 shrink-0 border border-zinc-700">
                            {shortCode}
                          </span>
                          {isCurrent && (
                            <span className="text-[10px] font-black text-white uppercase tracking-wider">
                              Selected
                            </span>
                          )}
                        </div>
                        <div className="text-sm font-bold text-white truncate">
                          {programTitle}
                        </div>
                      </div>
                      <Clock className="w-4 h-4 text-white shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-black border-t border-white/15 text-center text-xs font-bold text-zinc-400">
          Scientia EU Timetabler • TU Dublin
        </div>
      </div>
    </div>
  );
};
