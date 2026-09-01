# New Project Starter Guide

This guide provides a blueprint and standalone code modules for building a new application (web, mobile, or backend proxy) using the Scientia Timetable Search and Display API.

---

## 1. Quick Config Constants

Create a configuration file in your new project (e.g. `config.ts` or `constants.js`):

```typescript
export const TIMETABLE_CONFIG = {
  databaseName: "scientia-eu-v4-api-d4-01",
  institutionId: "50a55ae1-1c87-4dea-bb73-c9e67941e1fd",
  categoryTypeIdentity: "241e4d36-93f2-4938-9e15-d4536fe3b2eb",
  timezone: "Europe/Dublin",
  baseUrl: "https://scientia-eu-v4-api-d4-01.azurewebsites.net/api/Public",
};
```

---

## 2. Standalone TypeScript API Client (`apiClient.ts`)

```typescript
import { TIMETABLE_CONFIG } from "./config";

export interface ProgramSearchResult {
  Identity: string;
  CategoryTypeIdentity: string;
  Name: string;
  Description?: string;
}

export interface RawTimetableEvent {
  Identity: string;
  StartDateTime: string;
  EndDateTime: string;
  Name: string;
  Description?: string;
  EventType?: string;
  Location?: string;
  ExtraProperties?: Array<{ Name: string; Value: string }>;
}

export class TimetableAPI {
  /**
   * Search for courses, degrees, or groups by keyword
   */
  static async searchPrograms(query: string, signal?: AbortSignal): Promise<ProgramSearchResult[]> {
    const cleanQuery = query.replaceAll("&", "");
    const url = `${TIMETABLE_CONFIG.baseUrl}/CategoryTypes/${TIMETABLE_CONFIG.categoryTypeIdentity}/Categories/FilterWithCache/${TIMETABLE_CONFIG.institutionId}?pageNumber=1&query=${encodeURIComponent(cleanQuery)}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      signal,
    });

    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.Results || [];
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
          CategoryTypeIdentity: program.CategoryTypeIdentity,
          CategoryIdentities: [program.Identity],
        },
      ],
      FetchBookings: false,
      FetchPersonalEvents: false,
      PersonalIdentities: [],
    };

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
      throw new Error(`Events fetch failed: ${response.statusText}`);
    }

    const json = await response.json();
    if (json.CategoryEvents && json.CategoryEvents.length > 0) {
      return json.CategoryEvents[0].Results || [];
    }
    return [];
  }
}
```

---

## 3. Normalizer & Heuristics Module (`transformer.ts`)

```typescript
import moment from "moment-timezone";
import { TIMETABLE_CONFIG } from "./config";
import { RawTimetableEvent } from "./apiClient";

export interface NormalizedLesson {
  id: string;
  start: moment.Moment;
  end: moment.Moment;
  title: string;
  fullCode: string;
  type: string;
  location: string;
  staff: string | null;
  locations?: Array<{
    nameSpecification: string | null;
    location: string;
    staffName: string | null;
  }>;
}

const EVENT_TYPES = ["Lecture", "Tutorial", "Laboratory", "Studio", "Kitchen", "Music", "Off-site", "Clinical"];

export function predictEventType(name: string): string {
  const parts = name.split("/");
  if (parts.length >= 2) {
    const candidate = parts[parts.length - 2].toLowerCase();
    const match = EVENT_TYPES.find((t) => candidate.includes(t.toLowerCase()));
    if (match) return match;
  }
  return "Lecture";
}

export function predictShortTitle(name: string, description?: string): string {
  if (description && description.trim().length > 0) {
    return description.trim();
  }
  const parts = name.split("/");
  if (parts.length > 0) {
    return parts[parts.length - 1].replace(/sem\d+/i, "").trim() || name;
  }
  return name;
}

export function transformAndOrganize(rawEvents: RawTimetableEvent[]): NormalizedLesson[] {
  return rawEvents.map((event) => {
    const start = moment.tz(event.StartDateTime, TIMETABLE_CONFIG.timezone);
    const end = moment.tz(event.EndDateTime, TIMETABLE_CONFIG.timezone);
    const staff = event.ExtraProperties?.find((p) => p.Name === "Staff")?.Value || null;
    const type = event.EventType || predictEventType(event.Name);
    const title = predictShortTitle(event.Name, event.Description);

    return {
      id: event.Identity,
      start,
      end,
      title,
      fullCode: event.Name,
      type,
      location: event.Location || "TBD",
      staff,
    };
  }).sort((a, b) => a.start.valueOf() - b.start.valueOf());
}
```

---

## 4. Building a Minimal React/Next.js View

```tsx
import React, { useState, useEffect } from "react";
import moment from "moment-timezone";
import { TimetableAPI, ProgramSearchResult } from "./apiClient";
import { transformAndOrganize, NormalizedLesson } from "./transformer";
import { TIMETABLE_CONFIG } from "./config";

export function SimpleTimetable() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProgramSearchResult[]>([]);
  const [selected, setSelected] = useState<ProgramSearchResult | null>(null);
  const [lessons, setLessons] = useState<NormalizedLesson[]>([]);
  const [loading, setLoading] = useState(false);

  // Search autocomplete
  useEffect(() => {
    if (!query.trim()) return;
    const controller = new AbortController();
    TimetableAPI.searchPrograms(query, controller.signal)
      .then(setResults)
      .catch((err) => { if (err.name !== "AbortError") console.error(err); });
    return () => controller.abort();
  }, [query]);

  // Fetch timetable when program is picked
  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    const startIso = moment.tz(TIMETABLE_CONFIG.timezone).startOf("isoWeek").toISOString();
    const endIso = moment.tz(TIMETABLE_CONFIG.timezone).endOf("isoWeek").toISOString();

    TimetableAPI.fetchEvents(selected, startIso, endIso)
      .then((raw) => setLessons(transformAndOrganize(raw)))
      .finally(() => setLoading(false));
  }, [selected]);

  return (
    <div style={{ padding: "1.5rem", fontFamily: "sans-serif" }}>
      <h1>Timetable Search</h1>
      <input
        type="text"
        placeholder="Search program (e.g. TU856)..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ padding: "0.5rem", width: "300px" }}
      />
      {results.length > 0 && !selected && (
        <ul style={{ border: "1px solid #ccc", maxWidth: "400px", listStyle: "none", padding: "0.5rem" }}>
          {results.map((prog) => (
            <li
              key={prog.Identity}
              onClick={() => { setSelected(prog); setResults([]); }}
              style={{ padding: "0.5rem", cursor: "pointer", borderBottom: "1px solid #eee" }}
            >
              <strong>{prog.Name}</strong>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <div style={{ marginTop: "1rem" }}>
          <h2>Schedule for: {selected.Name}</h2>
          <button onClick={() => setSelected(null)}>Change Program</button>
          {loading ? (
            <p>Loading schedule...</p>
          ) : (
            <div style={{ display: "grid", gap: "1rem", marginTop: "1rem" }}>
              {lessons.map((lesson) => (
                <div key={lesson.id} style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "1rem" }}>
                  <span style={{ fontSize: "0.85rem", color: "#666" }}>
                    {lesson.start.format("ddd, h:mm A")} - {lesson.end.format("h:mm A")}
                  </span>
                  <h3>{lesson.title}</h3>
                  <p>{lesson.type} • {lesson.location}</p>
                  {lesson.staff && <p>Lecturer: {lesson.staff}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```
