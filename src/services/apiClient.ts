import { TIMETABLE_CONFIG } from "../config/timetableConfig";
import { ProgramSearchResult, RawTimetableEvent } from "../types/timetable";

export class TimetableAPI {
  /**
   * Search for courses, degrees, or groups by keyword
   */
  static async searchPrograms(query: string, signal?: AbortSignal): Promise<ProgramSearchResult[]> {
    const cleanQuery = query.replaceAll("&", "").trim();
    if (!cleanQuery) return [];

    const url = `${TIMETABLE_CONFIG.baseUrl}/CategoryTypes/${TIMETABLE_CONFIG.categoryTypeIdentity}/Categories/FilterWithCache/${TIMETABLE_CONFIG.institutionId}?pageNumber=1&query=${encodeURIComponent(cleanQuery)}`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
        signal,
      });

      if (!response.ok) {
        throw new Error(`Search failed: HTTP ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return (data.Results as ProgramSearchResult[]) || [];
    } catch (error: unknown) {
      if ((error as { name?: string })?.name === "AbortError") {
        throw error;
      }
      console.error("TimetableAPI.searchPrograms error:", error);
      throw error;
    }
  }

  /**
   * Fetch scheduled events for a program between two ISO dates
   */
  static async fetchEvents(
    program: ProgramSearchResult,
    startIso: string,
    endIso: string,
    signal?: AbortSignal
  ): Promise<RawTimetableEvent[]> {
    const url = `${TIMETABLE_CONFIG.baseUrl}/CategoryTypes/Categories/Events/Filter/${TIMETABLE_CONFIG.institutionId}?startRange=${encodeURIComponent(startIso)}&endRange=${encodeURIComponent(endIso)}`;

    const body = {
      ViewOptions: {
        Days: [
          { DayOfWeek: 1 },
          { DayOfWeek: 2 },
          { DayOfWeek: 3 },
          { DayOfWeek: 4 },
          { DayOfWeek: 5 },
          { DayOfWeek: 6 },
        ],
      },
      CategoryTypesWithIdentities: [
        {
          CategoryTypeIdentity: program.CategoryTypeIdentity || TIMETABLE_CONFIG.categoryTypeIdentity,
          CategoryIdentities: [program.Identity],
        },
      ],
      FetchBookings: false,
      FetchPersonalEvents: false,
      PersonalIdentities: [],
    };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal,
      });

      if (!response.ok) {
        throw new Error(`Events fetch failed: HTTP ${response.status} ${response.statusText}`);
      }

      const json = await response.json();
      if (json.CategoryEvents && json.CategoryEvents.length > 0) {
        return (json.CategoryEvents[0].Results as RawTimetableEvent[]) || [];
      }
      return [];
    } catch (error: unknown) {
      if ((error as { name?: string })?.name === "AbortError") {
        throw error;
      }
      console.error("TimetableAPI.fetchEvents error:", error);
      throw error;
    }
  }
}
