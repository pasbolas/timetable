import moment from "moment-timezone";
import { TIMETABLE_CONFIG } from "../config/timetableConfig";
import { StorageService } from "./storage";
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
 * Extract a stable module identifier (code or name) to associate module-level user preferences (e.g. lab group)
 */
export function getLessonModuleKey(lesson: {
  moduleCode?: string | null;
  Name?: string;
  Description?: string;
}): string {
  if (lesson.moduleCode && lesson.moduleCode.trim()) {
    return lesson.moduleCode.trim();
  }
  if (lesson.Name) {
    const split = lesson.Name.split("/")[0].trim();
    if (split) return split;
  }
  return lesson.Description?.trim() || "module";
}

/**
 * Format group - room information for widget cards
 */
export function getLessonGroupRoomStrings(lesson: NormalizedLesson): string[] {
  if (lesson.collapsedLocations && lesson.Locations && lesson.Locations.length > 0) {
    const modKey = getLessonModuleKey(lesson);
    const fav = StorageService.getFavoriteGroupForModule(modKey);
    let locs = lesson.Locations;
    if (fav) {
      const match = locs.find(
        (l) => (l.nameSpecification || "").toLowerCase() === fav.toLowerCase()
      );
      if (match) {
        locs = [match, ...locs.filter((l) => l !== match)];
      }
    }
    return locs.map((loc) => {
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
 * Helper to check if a token is metadata (event type, semester, group, etc.)
 */
function isMetaToken(token: string): boolean {
  if (!token) return true;
  const l = token.toLowerCase();
  if (/^sem(ester)?\s*[0-9]/i.test(l)) return true;
  if (/^term\s*[0-9]/i.test(l)) return true;
  if (/^stage\s*[0-9]/i.test(l)) return true;
  if (/^year\s*[0-9]/i.test(l)) return true;
  if (/^(group|grp)\s*[a-z0-9]+$/i.test(l)) return true;
  if (/^[a-f]$/i.test(l)) return true;
  if (/^[a-f]{2,4}$/i.test(l)) return true;
  if (/^[0-9]{1,3}$/.test(l)) return true;
  if (
    KNOWN_EVENT_TYPES.some(
      (k) =>
        l === k.toLowerCase() ||
        l === "lec" ||
        l === "tut" ||
        l === "sem" ||
        l === "lab" ||
        l === "lec&lab" ||
        l.startsWith(k.toLowerCase() + "&") ||
        l.endsWith("&" + k.toLowerCase())
    )
  ) {
    return true;
  }
  return false;
}

/**
 * Check if a string looks like a module code / ID (e.g. "CMPU 2007(22391C)", "CMPU2007", "AUTH H6666")
 */
function isModuleCodeLike(str: string): boolean {
  if (!str) return false;
  return /^[A-Za-z]{2,5}\s*(?:H)?[0-9]{3,5}(?:\([0-9A-Za-z]+\))?$/i.test(str.trim());
}

/**
 * Strips leading module code prefix (e.g. "CMPU 2007(22391C) Databases 1" -> "Databases 1")
 */
function cleanLeadingModuleCode(str: string): string {
  if (!str) return "";
  return str
    .replace(/^[A-Za-z]{2,5}\s*(?:H)?[0-9]{3,5}(?:\([0-9A-Za-z]+\))?\s*[-–:]?\s*/i, "")
    .trim();
}

/**
 * Extract clean module code/ID (e.g. "CMPU 2007", "CMPU 2007(22391C)")
 */
export function extractModuleCode(
  name: string,
  extraProps?: RawTimetableProperty[]
): string | null {
  if (extraProps && extraProps.length > 0) {
    const modProp = extraProps.find((p) => /^module$/i.test(p.Name.trim()));
    if (modProp && modProp.Value && modProp.Value.trim()) {
      return modProp.Value.split(",")[0].trim();
    }
  }

  if (name) {
    const firstPart = name.split("/")[0].trim();
    const codeMatch = firstPart.match(/^([A-Za-z]{2,5}\s*(?:H)?[0-9]{3,5}(?:\([0-9A-Za-z]+\))?)/i);
    if (codeMatch) {
      return codeMatch[1].trim();
    }
  }

  return null;
}

/**
 * Predict human-friendly actual module name (e.g. "Databases 1", "Object Oriented Programming")
 * instead of the raw module ID / code.
 */
export function predictLessonShortName(name: string, description?: string): string {
  if (description && description.trim().length > 0) {
    const desc = fixDescr(description);
    const cleanedDesc = cleanLeadingModuleCode(desc);
    if (cleanedDesc.length > 0) return cleanedDesc;
    return desc;
  }
  if (!name) return "Class";

  const parts = name.split("/").map((p) => p.trim());
  const nonMeta = parts.filter((p) => !isMetaToken(p));

  if (nonMeta.length >= 2) {
    // If first element is a module code/ID (e.g. "CMPU 2007(22391C)"), return the actual module name (second element)
    if (isModuleCodeLike(nonMeta[0])) {
      return fixDescr(nonMeta[1]);
    }

    const stripped0 = cleanLeadingModuleCode(nonMeta[0]);
    const stripped1 = cleanLeadingModuleCode(nonMeta[1]);
    if (stripped1.length > 0 && !isModuleCodeLike(stripped1)) {
      return fixDescr(stripped1);
    }
    if (stripped0.length > 0) {
      return fixDescr(stripped0);
    }
    return fixDescr(nonMeta[1]);
  } else if (nonMeta.length === 1) {
    const stripped = cleanLeadingModuleCode(nonMeta[0]);
    if (stripped.length > 0) return fixDescr(stripped);
    return fixDescr(nonMeta[0]);
  }

  const fallback = cleanLeadingModuleCode(name);
  return fixDescr(fallback || name);
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
        EventType: "Laboratory",
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
    const type = getCanonicalEventType({
      EventType: raw.EventType,
      Name: raw.Name,
      Description: raw.Description,
    });
    const shortTitle = predictLessonShortName(raw.Name, raw.Description);
    const group = extractGroupInfo(raw.Name, raw.Description, raw.ExtraProperties);
    const moduleCode = extractModuleCode(raw.Name, raw.ExtraProperties);

    return {
      id: raw.Identity || `${raw.Name}-${raw.StartDateTime}`,
      StartDateTime: start,
      EndDateTime: end,
      Location: raw.Location || "Room TBD",
      Description: shortTitle,
      Name: raw.Name,
      EventType: type,
      moduleCode: moduleCode,
      moduleName: shortTitle,
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

const MONO_PALETTE: ColorPalette = {
  name: "monochrome",
  bg: "bg-white hover:bg-zinc-50 border-black",
  accent: "bg-black",
  pill: "bg-black text-white border border-black",
  icon: "text-black",
  border: "border-black",
  text: "text-black",
};

export const COLOR_PALETTES: ColorPalette[] = [MONO_PALETTE];

export type CanonicalEventType = "Lecture" | "Laboratory" | "Tutorial";

export const EVENT_TYPE_PALETTES: Record<"laboratory" | "lecture" | "tutorial", ColorPalette> = {
  laboratory: {
    ...MONO_PALETTE,
    name: "laboratory",
  },
  lecture: {
    ...MONO_PALETTE,
    name: "lecture",
    pill: "bg-[#228B22] text-white border border-black",
  },
  tutorial: {
    ...MONO_PALETTE,
    name: "tutorial",
  },
};

/**
 * Classify any lesson into one of the three canonical event types:
 * - Laboratory (Hands-on labs, practicals, studios, multi-group sessions)
 * - Tutorial (Tutorials, problem-solving classes, seminars, workshops)
 * - Lecture (Standard degree lectures and classroom theory sessions)
 */
export function getCanonicalEventType(lesson: {
  EventType?: string;
  Name?: string;
  Description?: string;
  collapsedLocations?: boolean;
  Locations?: any[];
}): CanonicalEventType {
  const typeStr = (lesson.EventType || "").trim();
  const nameStr = (lesson.Name || "").trim();
  const descStr = (lesson.Description || "").trim();

  // 1. Direct check on API EventType if provided
  if (typeStr) {
    if (/\b(lab|laboratory|pract|practical|studio|kitchen|clinic)\b/i.test(typeStr)) {
      return "Laboratory";
    }
    if (/\b(tut|tutorial|tutorials)\b/i.test(typeStr)) {
      return "Tutorial";
    }
    if (/\b(lec|lecture|lectures)\b/i.test(typeStr)) {
      return "Lecture";
    }
    if (/\b(seminar|workshop)\b/i.test(typeStr)) {
      return "Tutorial";
    }
  }

  // 2. Multi-group collapsed locations are always Laboratories
  if (Boolean(lesson.collapsedLocations) || (lesson.Locations && lesson.Locations.length > 1)) {
    return "Laboratory";
  }

  // 3. Inspect slash/dash separated segments from Name (e.g. "CMPU2016/Lecture/01", "CMPU2016/LEC/01")
  const nameTokens = nameStr.split(/[\/\-_,\s]+/).map((t) => t.trim().toLowerCase());

  // Priority check on Name tokens:
  // If Name has "lec" or "lecture", it's definitively a Lecture
  if (nameTokens.some((t) => t === "lec" || t === "lecture" || t === "lectures")) {
    return "Lecture";
  }

  // If Name has "lab", "laboratory", or "pract", it's definitively a Laboratory
  if (nameTokens.some((t) => t === "lab" || t === "laboratory" || t === "pract" || t === "practical")) {
    return "Laboratory";
  }

  // If Name has "tut" or "tutorial", it's definitively a Tutorial
  if (nameTokens.some((t) => t === "tut" || t === "tutorial" || t === "tutorials")) {
    return "Tutorial";
  }

  // 4. Inspect Description with strict word boundaries
  // Note: NEVER use loose substring "sem" or "work" as they clash with "Semester" and "Networks"!
  if (/\b(lab|laboratory|practical)\b/i.test(descStr)) {
    return "Laboratory";
  }
  if (/\b(tutorial|tutorials)\b/i.test(descStr)) {
    return "Tutorial";
  }
  if (/\b(lecture|lectures)\b/i.test(descStr)) {
    return "Lecture";
  }
  if (/\b(seminar|workshop)\b/i.test(descStr)) {
    return "Tutorial";
  }

  // 5. Default fallback to Lecture (the primary university session type)
  return "Lecture";
}

/**
 * Strict 3-color theme provider:
 * - All Laboratories = Emerald Green
 * - All Lectures = Royal Blue
 * - All Tutorials = Warm Amber
 */
export function getLessonColorTheme(lesson: NormalizedLesson): ColorPalette {
  const canonicalType = getCanonicalEventType(lesson);
  if (canonicalType === "Laboratory") return EVENT_TYPE_PALETTES.laboratory;
  if (canonicalType === "Tutorial") return EVENT_TYPE_PALETTES.tutorial;
  return EVENT_TYPE_PALETTES.lecture;
}
