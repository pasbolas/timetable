import { ProgramSearchResult, RawTimetableEvent } from "../types/timetable";
import { TIMETABLE_CONFIG } from "../config/timetableConfig";

const KEYS = {
  SELECTED_PROGRAM: "mytimetable_selected_program",
  RECENT_PROGRAMS: "mytimetable_recent_programs",
  TIMETABLE_CACHE_PREFIX: "mytimetable_cache_",
  THEME: "mytimetable_theme",
  SAVED_GROUPS: "mytimetable_saved_groups", // e.g. custom preferred lab groups
  TOUR_COMPLETED: "mytimetable_tour_completed",
};

export class StorageService {
  static getSelectedProgram(): ProgramSearchResult {
    try {
      const stored = localStorage.getItem(KEYS.SELECTED_PROGRAM);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn("Error reading selected program from localStorage:", e);
    }
    return TIMETABLE_CONFIG.defaultProgram;
  }

  static setSelectedProgram(program: ProgramSearchResult): void {
    try {
      localStorage.setItem(KEYS.SELECTED_PROGRAM, JSON.stringify(program));
      this.addRecentProgram(program);
    } catch (e) {
      console.warn("Error saving selected program to localStorage:", e);
    }
  }

  static getRecentPrograms(): ProgramSearchResult[] {
    try {
      const stored = localStorage.getItem(KEYS.RECENT_PROGRAMS);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn("Error reading recent programs:", e);
    }
    return [TIMETABLE_CONFIG.defaultProgram];
  }

  static addRecentProgram(program: ProgramSearchResult): void {
    try {
      let recents = this.getRecentPrograms().filter(p => p.Identity !== program.Identity);
      recents.unshift(program);
      if (recents.length > 8) {
        recents = recents.slice(0, 8);
      }
      localStorage.setItem(KEYS.RECENT_PROGRAMS, JSON.stringify(recents));
    } catch (e) {
      console.warn("Error saving recent programs:", e);
    }
  }

  static getCachedEvents(programId: string, weekKey: string): RawTimetableEvent[] | null {
    try {
      const key = `${KEYS.TIMETABLE_CACHE_PREFIX}${programId}_${weekKey}`;
      const item = localStorage.getItem(key);
      if (item) {
        const parsed = JSON.parse(item);
        // Valid for up to 7 days
        if (Date.now() - parsed.timestamp < 7 * 24 * 60 * 60 * 1000) {
          return parsed.events;
        }
      }
    } catch (e) {
      console.warn("Error reading timetable cache:", e);
    }
    return null;
  }

  static setCachedEvents(programId: string, weekKey: string, events: RawTimetableEvent[]): void {
    try {
      const key = `${KEYS.TIMETABLE_CACHE_PREFIX}${programId}_${weekKey}`;
      localStorage.setItem(
        key,
        JSON.stringify({
          timestamp: Date.now(),
          events,
        })
      );
    } catch (e) {
      console.warn("Error caching timetable events:", e);
    }
  }

  static getTheme(): "light" | "dark" | "auto" {
    return (localStorage.getItem(KEYS.THEME) as "light" | "dark" | "auto") || "auto";
  }

  static setTheme(theme: "light" | "dark" | "auto"): void {
    localStorage.setItem(KEYS.THEME, theme);
  }

  static hasCompletedTour(): boolean {
    try {
      return localStorage.getItem(KEYS.TOUR_COMPLETED) === "true";
    } catch {
      return false;
    }
  }

  static setCompletedTour(completed: boolean = true): void {
    try {
      if (completed) {
        localStorage.setItem(KEYS.TOUR_COMPLETED, "true");
      } else {
        localStorage.removeItem(KEYS.TOUR_COMPLETED);
      }
    } catch (e) {
      console.warn("Error saving tour completion state:", e);
    }
  }

  static resetTour(): void {
    try {
      localStorage.removeItem(KEYS.TOUR_COMPLETED);
    } catch (e) {
      console.warn("Error resetting tour state:", e);
    }
  }
}
