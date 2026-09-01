import moment from "moment-timezone";
import { TIMETABLE_CONFIG } from "../config/timetableConfig";
import {
  RawTimetableEvent,
  RawTimetableProperty,
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
 * Extract clean group info (e.g. "Group A", "Group 01", "Grp 2")
 */
export function extractGroupInfo(
  name: string,
  description?: string,
  extraProps?: RawTimetableProperty[]
): string | null {
  // 1. Check ExtraProperties (Scientia Timetabler Publish often provides Student Set or Group)
  if (extraProps && extraProps.length > 0) {
    const groupProp = extraProps.find((p) =>
      /^(group|student\s*set|student\s*group|groups|set)$/i.test(p.Name.trim())
    );
    if (groupProp && groupProp.Value && groupProp.Value.trim()) {
      const val = groupProp.Value.trim();
      const slashParts = val.split("/");
      if (slashParts.length > 1) {
        const last = slashParts[slashParts.length - 1].trim();
        if (/^[a-d]$/i.test(last)) return `Group ${last.toUpperCase()}`;
        if (/^[0-9]+$/.test(last)) return `Group ${last}`;
        if (/^group\s*[a-z0-9]+/i.test(last) || /^grp\s*[a-z0-9]+/i.test(last)) return last;
      }
      return val;
    }
  }

  // 2. Check Description for (Group A) or (Grp 1) or [Group 1]
  if (description) {
    const descGroupMatch = description.match(/[\(\[]\s*(?:Group|Grp|Gr|Lab)\s*([A-Za-z0-9]+)\s*[\)\]]/i);
    if (descGroupMatch) {
      return `Group ${descGroupMatch[1].toUpperCase()}`;
    }
  }

  // 3. Check Name tokens
  if (name) {
    const parts = name.split("/").map((p) => p.trim());
    if (parts.length >= 2) {
      for (let i = parts.length - 1; i >= 1; i--) {
        const p = parts[i];
        if (/^group\s*[a-z0-9]+$/i.test(p) || /^grp\s*[a-z0-9]+$/i.test(p) || /^gr\s*[a-z0-9]+$/i.test(p)) {
          return p.replace(/^(grp|gr)\s*/i, "Group ");
        }
        if (/^[0-9]{1,3}$/.test(p)) {
          return `Group ${p}`;
        }
        if (/^[a-d]$/i.test(p) && parts.length >= 3) {
          return `Group ${p.toUpperCase()}`;
        }
        if (/^(lab|tut|sem)\s*([a-z0-9]+)$/i.test(p)) {
          return `Group ${p}`;
        }
      }
    }
  }

  return null;
}

/**
 * Format group - room information for widget cards
 */
export function getLessonGroupRoomStrings(lesson: NormalizedLesson): string[] {
  if (lesson.collapsedLocations && lesson.Locations && lesson.Locations.length > 0) {
    return lesson.Locations.map((loc) => {
      const g = loc.nameSpecification || "Group";
      const r = loc.location || "Room TBD";
      return `${g} - ${r}`;
    });
  }

  const group = lesson.groupName || extractGroupInfo(lesson.Name, lesson.Description);
  const room = lesson.Location || "Room TBD";

  if (group) {
    return [`${group} - ${room}`];
  }

  return [`${lesson.EventType || "All Groups"} - ${room}`];
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
        const groupSpec = extractGroupInfo(item.Name, item.Description) || `Group ${subLocations.length + 1}`;
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
    const group = extractGroupInfo(raw.Name, raw.Description, raw.ExtraProperties);

    return {
      id: raw.Identity || `${raw.Name}-${raw.StartDateTime}`,
      StartDateTime: start,
      EndDateTime: end,
      Location: raw.Location || "Room TBD",
      Description: shortTitle,
      Name: raw.Name,
      EventType: type,
      staffName: staff,
      groupName: group,
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

export interface ColorPalette {
  name: string;
  bg: string;
  accent: string;
  pill: string;
  icon: string;
  border: string;
  text: string;
}

export const COLOR_PALETTES: ColorPalette[] = [
  {
    name: "indigo",
    bg: "bg-indigo-50/90 hover:bg-indigo-50/100 dark:bg-indigo-950/40 dark:hover:bg-indigo-950/60 border-indigo-200/90 dark:border-indigo-800/60",
    accent: "bg-indigo-600 dark:bg-indigo-500",
    pill: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/80 dark:text-indigo-200",
    icon: "text-indigo-600 dark:text-indigo-400",
    border: "border-indigo-200 dark:border-indigo-800",
    text: "text-indigo-900 dark:text-indigo-100",
  },
  {
    name: "emerald",
    bg: "bg-emerald-50/90 hover:bg-emerald-50/100 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/60 border-emerald-200/90 dark:border-emerald-800/60",
    accent: "bg-emerald-600 dark:bg-emerald-500",
    pill: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/80 dark:text-emerald-200",
    icon: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-200 dark:border-emerald-800",
    text: "text-emerald-900 dark:text-emerald-100",
  },
  {
    name: "amber",
    bg: "bg-amber-50/90 hover:bg-amber-50/100 dark:bg-amber-950/40 dark:hover:bg-amber-950/60 border-amber-200/90 dark:border-amber-800/60",
    accent: "bg-amber-500 dark:bg-amber-400",
    pill: "bg-amber-100 text-amber-900 dark:bg-amber-900/80 dark:text-amber-200",
    icon: "text-amber-600 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-800",
    text: "text-amber-950 dark:text-amber-100",
  },
  {
    name: "purple",
    bg: "bg-purple-50/90 hover:bg-purple-50/100 dark:bg-purple-950/40 dark:hover:bg-purple-950/60 border-purple-200/90 dark:border-purple-800/60",
    accent: "bg-purple-600 dark:bg-purple-500",
    pill: "bg-purple-100 text-purple-800 dark:bg-purple-900/80 dark:text-purple-200",
    icon: "text-purple-600 dark:text-purple-400",
    border: "border-purple-200 dark:border-purple-800",
    text: "text-purple-900 dark:text-purple-100",
  },
  {
    name: "rose",
    bg: "bg-rose-50/90 hover:bg-rose-50/100 dark:bg-rose-950/40 dark:hover:bg-rose-950/60 border-rose-200/90 dark:border-rose-800/60",
    accent: "bg-rose-600 dark:bg-rose-500",
    pill: "bg-rose-100 text-rose-800 dark:bg-rose-900/80 dark:text-rose-200",
    icon: "text-rose-600 dark:text-rose-400",
    border: "border-rose-200 dark:border-rose-800",
    text: "text-rose-900 dark:text-rose-100",
  },
  {
    name: "cyan",
    bg: "bg-cyan-50/90 hover:bg-cyan-50/100 dark:bg-cyan-950/40 dark:hover:bg-cyan-950/60 border-cyan-200/90 dark:border-cyan-800/60",
    accent: "bg-cyan-600 dark:bg-cyan-500",
    pill: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/80 dark:text-cyan-200",
    icon: "text-cyan-600 dark:text-cyan-400",
    border: "border-cyan-200 dark:border-cyan-800",
    text: "text-cyan-900 dark:text-cyan-100",
  },
  {
    name: "orange",
    bg: "bg-orange-50/90 hover:bg-orange-50/100 dark:bg-orange-950/40 dark:hover:bg-orange-950/60 border-orange-200/90 dark:border-orange-800/60",
    accent: "bg-orange-500 dark:bg-orange-400",
    pill: "bg-orange-100 text-orange-900 dark:bg-orange-900/80 dark:text-orange-200",
    icon: "text-orange-600 dark:text-orange-400",
    border: "border-orange-200 dark:border-orange-800",
    text: "text-orange-950 dark:text-orange-100",
  },
  {
    name: "teal",
    bg: "bg-teal-50/90 hover:bg-teal-50/100 dark:bg-teal-950/40 dark:hover:bg-teal-950/60 border-teal-200/90 dark:border-teal-800/60",
    accent: "bg-teal-600 dark:bg-teal-500",
    pill: "bg-teal-100 text-teal-800 dark:bg-teal-900/80 dark:text-teal-200",
    icon: "text-teal-600 dark:text-teal-400",
    border: "border-teal-200 dark:border-teal-800",
    text: "text-teal-900 dark:text-teal-100",
  },
  {
    name: "fuchsia",
    bg: "bg-fuchsia-50/90 hover:bg-fuchsia-50/100 dark:bg-fuchsia-950/40 dark:hover:bg-fuchsia-950/60 border-fuchsia-200/90 dark:border-fuchsia-800/60",
    accent: "bg-fuchsia-600 dark:bg-fuchsia-500",
    pill: "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/80 dark:text-fuchsia-200",
    icon: "text-fuchsia-600 dark:text-fuchsia-400",
    border: "border-fuchsia-200 dark:border-fuchsia-800",
    text: "text-fuchsia-900 dark:text-fuchsia-100",
  },
  {
    name: "blue",
    bg: "bg-blue-50/90 hover:bg-blue-50/100 dark:bg-blue-950/40 dark:hover:bg-blue-950/60 border-blue-200/90 dark:border-blue-800/60",
    accent: "bg-blue-600 dark:bg-blue-500",
    pill: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
    icon: "text-blue-600 dark:text-blue-400",
    border: "border-blue-200 dark:border-blue-800",
    text: "text-blue-900 dark:text-blue-100",
  },
  {
    name: "violet",
    bg: "bg-violet-50/90 hover:bg-violet-50/100 dark:bg-violet-950/40 dark:hover:bg-violet-950/60 border-violet-200/90 dark:border-violet-800/60",
    accent: "bg-violet-600 dark:bg-violet-500",
    pill: "bg-violet-100 text-violet-800 dark:bg-violet-900/80 dark:text-violet-200",
    icon: "text-violet-600 dark:text-violet-400",
    border: "border-violet-200 dark:border-violet-800",
    text: "text-violet-900 dark:text-violet-100",
  },
  {
    name: "lime",
    bg: "bg-lime-50/90 hover:bg-lime-50/100 dark:bg-lime-950/40 dark:hover:bg-lime-950/60 border-lime-200/90 dark:border-lime-800/60",
    accent: "bg-lime-600 dark:bg-lime-500",
    pill: "bg-lime-100 text-lime-900 dark:bg-lime-900/80 dark:text-lime-200",
    icon: "text-lime-600 dark:text-lime-400",
    border: "border-lime-200 dark:border-lime-800",
    text: "text-lime-950 dark:text-lime-100",
  },
];

export function getLessonColorTheme(lesson: NormalizedLesson): ColorPalette {
  const key = (lesson.Description || lesson.Name || lesson.id).trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % COLOR_PALETTES.length;
  return COLOR_PALETTES[index];
}
