import moment from "moment-timezone";
import { TIMETABLE_CONFIG } from "../config/timetableConfig";
import {
  RawTimetableEvent,
  NormalizedLesson,
  DayData,
  DayBreak,
  StaffLocation,
  EventCategoryType
} from "../types/timetable";

const KNOWN_EVENT_TYPES = [
  "Lecture",
  "Tutorial",
  "Laboratory",
  "Lab",
  "Studio",
  "Kitchen",
  "Music",
  "Off-site",
  "Clinical",
  "Seminar",
  "Workshop"
];

const TYPO_FIXES: Record<string, string> = {
  "Systesm": "Systems",
  "Devleopment": "Development",
  "Progamming": "Programming",
  "Algorithims": "Algorithms",
  "Comptuer": "Computer",
  "Architecure": "Architecture",
};

/**
 * Clean known typos in module descriptions
 */
export function fixDescr(text: string): string {
  if (!text) return "";
  let fixed = text;
  for (const [typo, replacement] of Object.entries(TYPO_FIXES)) {
    fixed = fixed.replaceAll(typo, replacement);
  }
  return fixed.trim();
}

/**
 * Predict event type from code name (e.g. CMPU2016/Lecture/01 -> Lecture)
 */
export function predictEventType(lessonName: string): string {
  if (!lessonName) return "Lecture";
  const parts = lessonName.split("/").map(p => p.trim());
  
  for (const part of parts) {
    for (const known of KNOWN_EVENT_TYPES) {
      if (part.toLowerCase().includes(known.toLowerCase())) {
        if (known.toLowerCase() === "lab") return "Laboratory";
        return known;
      }
    }
  }
  return "Lecture";
}

/**
 * Extract clean group specification (e.g. "Group A", "01", "Lab 2")
 */
export function extractGroupSpec(lessonName: string): string | null {
  if (!lessonName) return null;
  const parts = lessonName.split("/").map(p => p.trim());
  if (parts.length > 2) {
    const lastPart = parts[parts.length - 1];
    if (/group\s*[a-z0-9]+/i.test(lastPart) || /^[0-9]+$/.test(lastPart) || /grp\s*[a-z0-9]+/i.test(lastPart)) {
      return lastPart;
    }
  }
  return null;
}

/**
 * Predict human-friendly short title from code and description
 */
export function predictLessonShortName(name: string, description?: string): string {
  if (description && description.trim().length > 0) {
    return fixDescr(description);
  }
  if (!name) return "Class";

  const parts = name.split("/").map(p => p.trim());
  // Filter out event types, sem tags, and group numbers
  const cleanedParts = parts.filter(p => {
    const lower = p.toLowerCase();
    if (/^sem(ester)?\s*[0-9]/i.test(lower)) return false;
    if (/^(group|grp)\s*[a-z0-9]+$/i.test(lower)) return false;
    if (/^[0-9]{1,3}$/.test(lower)) return false;
    if (KNOWN_EVENT_TYPES.some(t => lower === t.toLowerCase())) return false;
    return true;
  });

  if (cleanedParts.length > 0) {
    return fixDescr(cleanedParts[0]);
  }

  return fixDescr(name);
}

/**
 * Collapse concurrent lab/tutorial groups into a single parent card with sub-locations
 */
export function collapseLabGroups(lessons: NormalizedLesson[]): NormalizedLesson[] {
  if (lessons.length <= 1) return lessons;

  const collapsed: NormalizedLesson[] = [];
  const processed = new Set<string>();

  for (let i = 0; i < lessons.length; i++) {
    const current = lessons[i];
    if (processed.has(current.id)) continue;

    // Find all lessons with identical start/end and matching subject/event type
    const matchingIndices: number[] = [i];
    for (let j = i + 1; j < lessons.length; j++) {
      const candidate = lessons[j];
      if (processed.has(candidate.id)) continue;

      const sameTime =
        current.StartDateTime.isSame(candidate.StartDateTime) &&
        current.EndDateTime.isSame(candidate.EndDateTime);
      const sameType = current.EventType.toLowerCase() === candidate.EventType.toLowerCase();
      const sameDesc = current.Description.toLowerCase() === candidate.Description.toLowerCase() ||
        current.Name.split("/")[0] === candidate.Name.split("/")[0];

      if (sameTime && sameType && sameDesc) {
        matchingIndices.push(j);
      }
    }

    if (matchingIndices.length > 1) {
      const subLocations: StaffLocation[] = [];
      matchingIndices.forEach((idx) => {
        const item = lessons[idx];
        processed.add(item.id);
        const groupSpec = extractGroupSpec(item.Name) || `Group ${subLocations.length + 1}`;
        subLocations.push({
          nameSpecification: groupSpec,
          location: item.Location,
          staffName: item.staffName,
        });
      });

      collapsed.push({
        ...current,
        collapsedLocations: true,
        Locations: subLocations,
      });
    } else {
      processed.add(current.id);
      collapsed.push(current);
    }
  }

  return collapsed;
}

/**
 * Detect gaps between consecutive lessons (> 6 mins)
 */
export function detectBreaks(lessons: NormalizedLesson[]): DayBreak[] {
  const breaks: DayBreak[] = [];
  if (lessons.length <= 1) return breaks;

  // Sort chronologically
  const sorted = [...lessons].sort(
    (a, b) => a.StartDateTime.valueOf() - b.StartDateTime.valueOf()
  );

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];

    const diffMinutes = curr.StartDateTime.diff(prev.EndDateTime, "minutes");
    if (diffMinutes >= 10) {
      breaks.push({
        id: `break-${prev.id}-${curr.id}`,
        start: prev.EndDateTime.clone(),
        end: curr.StartDateTime.clone(),
        durationMinutes: diffMinutes,
      });
    }
  }

  return breaks;
}

/**
 * Map event type string to semantic category
 */
export function getEventCategory(eventType: string): EventCategoryType {
  const lower = (eventType || "").toLowerCase();
  if (lower.includes("lecture")) return "lecture";
  if (lower.includes("lab")) return "laboratory";
  if (lower.includes("tutorial")) return "tutorial";
  if (lower.includes("studio")) return "studio";
  if (lower.includes("kitchen")) return "kitchen";
  if (lower.includes("music")) return "music";
  if (lower.includes("off-site")) return "off-site";
  if (lower.includes("clinical")) return "clinical";
  return "other";
}

/**
 * Transform raw API events into normalized schedule grouped by days for the week
 */
export function processWeekSchedule(
  rawEvents: RawTimetableEvent[],
  weekStart: moment.Moment
): DayData[] {
  const tz = TIMETABLE_CONFIG.timezone;
  const startOfIsoWeek = weekStart.clone().tz(tz).startOf("isoWeek");

  // Normalize raw events
  const normalizedLessons: NormalizedLesson[] = rawEvents.map((raw) => {
    const start = moment.tz(raw.StartDateTime, tz);
    const end = moment.tz(raw.EndDateTime, tz);
    const staff = raw.ExtraProperties?.find((p) => p.Name === "Staff")?.Value || null;
    const type = raw.EventType || predictEventType(raw.Name);
    const shortTitle = predictLessonShortName(raw.Name, raw.Description);

    return {
      id: raw.Identity || `${raw.Name}-${raw.StartDateTime}`,
      StartDateTime: start,
      EndDateTime: end,
      Location: raw.Location || "Room TBD",
      Description: shortTitle,
      Name: raw.Name,
      EventType: type,
      staffName: staff,
    };
  });

  // Group into 7 days (Monday through Sunday)
  const days: DayData[] = [];
  for (let i = 0; i < 7; i++) {
    const currentDay = startOfIsoWeek.clone().add(i, "days");
    const dateKey = currentDay.format("YYYY-MM-DD");

    const dayLessons = normalizedLessons
      .filter((lesson) => lesson.StartDateTime.format("YYYY-MM-DD") === dateKey)
      .sort((a, b) => a.StartDateTime.valueOf() - b.StartDateTime.valueOf());

    const collapsedLessons = collapseLabGroups(dayLessons);
    const breaks = detectBreaks(collapsedLessons);

    days.push({
      day: currentDay,
      dateKey,
      lessons: collapsedLessons,
      breaks,
    });
  }

  return days;
}

/**
 * Extract concise course code/year (e.g. "TU856/3") and human title from program name
 */
export function parseProgramCodeAndTitle(
  name: string,
  description?: string
): { code: string; title: string } {
  if (!name) {
    return { code: "Timetable", title: description || "Timetable" };
  }

  const trimmed = name.trim();

  // Pattern 1: Starts with CODE/YEAR or CODE/YEAR/STREAM (e.g. "TU856/3 Computer Science" or "TU856/2 - Computer Science")
  const codeSlashYearMatch = trimmed.match(/^([A-Za-z0-9]+(?:\/[0-9A-Za-z]+)+)\s*(?:[-–:]\s*|\s+)?(.*)$/);
  if (codeSlashYearMatch) {
    const code = codeSlashYearMatch[1].trim();
    let restTitle = codeSlashYearMatch[2]?.trim() || "";
    restTitle = restTitle.replace(/^[-–:]\s*/, "").trim();
    const title = restTitle || description || trimmed;
    return { code, title };
  }

  // Pattern 2: Starts with CODE - TITLE (e.g. "TU856 - Computer Science")
  const hyphenMatch = trimmed.match(/^([A-Za-z0-9_-]+)\s*[-–:]\s*(.*)$/);
  if (hyphenMatch) {
    const code = hyphenMatch[1].trim();
    const title = hyphenMatch[2].trim() || description || trimmed;
    return { code, title };
  }

  // Pattern 3: Starts with CODE YEAR (e.g. "TU856 3 Computer Science")
  const spaceYearMatch = trimmed.match(/^([A-Za-z0-9]{3,8})\s+([0-9])\s*(?:[-–:]\s*|\s+)?(.*)$/);
  if (spaceYearMatch) {
    const code = `${spaceYearMatch[1]}/${spaceYearMatch[2]}`;
    let restTitle = spaceYearMatch[3]?.trim() || "";
    restTitle = restTitle.replace(/^[-–:]\s*/, "").trim();
    const title = restTitle || description || trimmed;
    return { code, title };
  }

  // Pattern 4: First token is code-like (e.g. "TU856 Computer Science")
  const words = trimmed.split(/\s+/);
  if (words.length > 1 && /^[A-Za-z0-9/-]{3,10}$/.test(words[0])) {
    const code = words[0];
    const restTitle = words.slice(1).join(" ").replace(/^[-–:]\s*/, "").trim();
    return { code, title: restTitle || description || trimmed };
  }

  return { code: trimmed, title: description || trimmed };
}
