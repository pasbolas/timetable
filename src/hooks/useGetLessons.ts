import { useState, useEffect, useRef, useCallback } from "react";
import moment from "moment-timezone";
import { ProgramSearchResult, DayData } from "../types/timetable";
import { TimetableAPI } from "../services/apiClient";
import { processWeekSchedule } from "../services/transformer";
import { StorageService } from "../services/storage";
import { TIMETABLE_CONFIG } from "../config/timetableConfig";

export function useGetLessons(
  selectedProgram: ProgramSearchResult,
  activeDate: moment.Moment
) {
  const [schedule, setSchedule] = useState<DayData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isOfflineData, setIsOfflineData] = useState<boolean>(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Compute start and end ISO for the week of activeDate
  const startOfIsoWeek = activeDate.clone().tz(TIMETABLE_CONFIG.timezone).startOf("isoWeek");
  const endOfIsoWeek = activeDate.clone().tz(TIMETABLE_CONFIG.timezone).endOf("isoWeek");
  const weekKey = startOfIsoWeek.format("YYYY-MM-DD");

  const fetchSchedule = useCallback(async () => {
    if (!selectedProgram?.Identity) return;

    // Abort any prior in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setError(null);

    // Check offline cache first for instant render
    const cachedEvents = StorageService.getCachedEvents(selectedProgram.Identity, weekKey);
    if (cachedEvents && cachedEvents.length > 0) {
      setSchedule(processWeekSchedule(cachedEvents, startOfIsoWeek));
      setIsOfflineData(true);
    }

    const startIso = startOfIsoWeek.toISOString();
    const endIso = endOfIsoWeek.toISOString();

    try {
      const rawEvents = await TimetableAPI.fetchEvents(
        selectedProgram,
        startIso,
        endIso,
        controller.signal
      );

      // Cache successful response
      StorageService.setCachedEvents(selectedProgram.Identity, weekKey, rawEvents);

      const processed = processWeekSchedule(rawEvents, startOfIsoWeek);
      setSchedule(processed);
      setIsOfflineData(false);
      setError(null);
    } catch (err: unknown) {
      if ((err as { name?: string })?.name === "AbortError") {
        return; // Request was replaced, do nothing
      }

      console.warn("Network fetch failed, falling back to cache if available:", err);

      // If we don't have cached data already loaded
      if (!cachedEvents) {
        setError(
          (err as Error)?.message ||
            "Unable to load timetable schedule. Please check your internet connection."
        );
      } else {
        setIsOfflineData(true);
      }
    } finally {
      setIsLoading(false);
    }
  }, [selectedProgram?.Identity, weekKey]);

  useEffect(() => {
    fetchSchedule();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchSchedule]);

  return {
    schedule,
    isLoading,
    error,
    isOfflineData,
    reload: fetchSchedule,
  };
}
