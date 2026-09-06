import { ProgramSearchResult, RawTimetableEvent } from "../types/timetable";
import { TIMETABLE_CONFIG, UniversityId, UNIVERSITIES } from "../config/timetableConfig";

const KEYS = {
  UNIVERSITY: "mytimetable_university",
  SELECTED_PROGRAM: "mytimetable_selected_program",
  RECENT_PROGRAMS: "mytimetable_recent_programs",
  TIMETABLE_CACHE_PREFIX: "mytimetable_cache_",
  THEME: "mytimetable_theme",
  SAVED_GROUPS: "mytimetable_saved_groups", // e.g. custom preferred lab groups
  TOUR_COMPLETED: "mytimetable_tour_completed",
  COURSE_ONBOARDED: "mytimetable_course_onboarded",
  ANALYTICS_ENABLED: "mytimetable_analytics_enabled",
};

export type ThemeMode = "dark" | "light" | "zara";

export class StorageService {
  static getActiveUniversityId(): UniversityId {
    try {
      const stored = localStorage.getItem(KEYS.UNIVERSITY);
      if (stored === "dcu" || stored === "tudublin") {
        return stored;
      }
    } catch (e) {
      console.warn("Error reading university from localStorage:", e);
    }
    return "tudublin";
  }

  static setActiveUniversityId(id: UniversityId): void {
    try {
      const current = this.getActiveUniversityId();
      if (current !== id) {
        localStorage.setItem(KEYS.UNIVERSITY, id);
        // Clear cached events when switching universities so schedules don't collide
        this.clearAllCaches();
        // Set selected program to the new university's default program
        const targetUni = UNIVERSITIES[id];
        if (targetUni) {
          this.setSelectedProgram(targetUni.defaultProgram);
          localStorage.setItem(KEYS.RECENT_PROGRAMS, JSON.stringify([targetUni.defaultProgram]));
        }
      }
    } catch (e) {
      console.warn("Error setting university in localStorage:", e);
    }
  }
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

  /**
   * Automatically evicts older cached weeks to prevent localStorage quota exhaustion (5MB limit)
   */
  static pruneOldCaches(maxKeep: number = 4): void {
    try {
      const cacheKeys: { key: string; timestamp: number }[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(KEYS.TIMETABLE_CACHE_PREFIX)) {
          try {
            const item = JSON.parse(localStorage.getItem(k) || "{}");
            cacheKeys.push({ key: k, timestamp: item.timestamp || 0 });
          } catch {
            // Corrupted JSON entry; clean up immediately
            localStorage.removeItem(k);
          }
        }
      }
      if (cacheKeys.length > maxKeep) {
        // Sort ascending by timestamp (oldest first)
        cacheKeys.sort((a, b) => a.timestamp - b.timestamp);
        const toRemove = cacheKeys.slice(0, cacheKeys.length - maxKeep);
        toRemove.forEach((item) => localStorage.removeItem(item.key));
      }
    } catch (e) {
      console.warn("Error pruning localStorage cache:", e);
    }
  }

  /**
   * Purges all cached timetable weeks
   */
  static clearAllCaches(): void {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(KEYS.TIMETABLE_CACHE_PREFIX)) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch (e) {
      console.warn("Error clearing timetable caches:", e);
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
        } else {
          // Expired cache entry; clean up immediately
          localStorage.removeItem(key);
        }
      }
    } catch (e) {
      console.warn("Error reading timetable cache:", e);
    }
    return null;
  }

  static setCachedEvents(programId: string, weekKey: string, events: RawTimetableEvent[]): void {
    try {
      // Proactively evict oldest caches to maintain max 4 cached weeks
      this.pruneOldCaches(4);

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
      // If QuotaExceededError still occurs, aggressively prune down to 1
      try {
        this.pruneOldCaches(1);
      } catch {}
    }
  }

  static getTheme(): ThemeMode {
    try {
      // The onboarding process strictly uses the Zara theme until all steps are completed
      if (!this.hasCompletedCourseOnboarding() || !this.hasCompletedTour()) {
        return "zara";
      }
      const val = localStorage.getItem(KEYS.THEME) as string | null;
      if (val === "light" || val === "dark" || val === "zara") {
        return val;
      }
    } catch (e) {
      console.warn("Error reading theme from storage:", e);
    }
    return "zara";
  }

  static setTheme(theme: ThemeMode): void {
    try {
      localStorage.setItem(KEYS.THEME, theme);
    } catch (e) {
      console.warn("Error saving theme to storage:", e);
    }
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

  static hasCompletedCourseOnboarding(): boolean {
    try {
      return localStorage.getItem(KEYS.COURSE_ONBOARDED) === "true";
    } catch {
      return false;
    }
  }

  static setCompletedCourseOnboarding(completed: boolean = true): void {
    try {
      if (completed) {
        localStorage.setItem(KEYS.COURSE_ONBOARDED, "true");
      } else {
        localStorage.removeItem(KEYS.COURSE_ONBOARDED);
      }
    } catch (e) {
      console.warn("Error saving course onboarding state:", e);
    }
  }

  static isOnboardingCompleted(): boolean {
    return this.hasCompletedTour() && this.hasCompletedCourseOnboarding();
  }

  static getFavoriteGroups(): Record<string, string> {
    try {
      const stored = localStorage.getItem(KEYS.SAVED_GROUPS);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn("Error reading favorite groups:", e);
    }
    return {};
  }

  static getFavoriteGroupForModule(moduleKey: string): string | null {
    if (!moduleKey) return null;
    const all = this.getFavoriteGroups();
    return all[moduleKey.trim()] || null;
  }

  static setFavoriteGroupForModule(moduleKey: string, groupLabel: string | null): void {
    try {
      if (!moduleKey) return;
      const all = this.getFavoriteGroups();
      const key = moduleKey.trim();
      if (groupLabel) {
        all[key] = groupLabel.trim();
      } else {
        delete all[key];
      }
      localStorage.setItem(KEYS.SAVED_GROUPS, JSON.stringify(all));
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("timetabler_favorite_groups_changed", {
            detail: { moduleKey: key, groupLabel: groupLabel ? groupLabel.trim() : null },
          })
        );
      }
    } catch (e) {
      console.warn("Error saving favorite group:", e);
    }
  }
}
