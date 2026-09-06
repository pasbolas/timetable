import { NormalizedLesson } from "../types/timetable";

/**
 * Escapes characters according to RFC 5545 (Section 3.3.11) TEXT property rules:
 * - Backslash (\) -> \\
 * - Semicolon (;) -> \;
 * - Comma (,) -> \,
 * - Line breaks (\r\n, \r, \n) -> \n
 */
export function escapeIcsText(str: string | undefined | null): string {
  if (!str) return "";
  return String(str)
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/**
 * Format Moment date to iCalendar UTC format (e.g. 20260902T080000Z)
 */
function formatIcsDate(date: moment.Moment): string {
  return date.clone().utc().format("YYYYMMDDTHHmmss") + "Z";
}

/**
 * Generate VEVENT block for a single lesson
 */
export function generateLessonVEvent(lesson: NormalizedLesson): string {
  const dtStamp = formatIcsDate(lesson.StartDateTime);
  const dtStart = formatIcsDate(lesson.StartDateTime);
  const dtEnd = formatIcsDate(lesson.EndDateTime);
  const cleanId = (lesson.id || Math.random().toString(36).substring(2)).replace(/[^a-zA-Z0-9_-]/g, "_");
  const uid = `${cleanId}@mytimetable.app`;

  const descParts: string[] = [];
  descParts.push(`${escapeIcsText(lesson.EventType)} - ${escapeIcsText(lesson.Description)}`);
  descParts.push(`Module: ${escapeIcsText(lesson.Name)}`);
  if (lesson.staffName) {
    descParts.push(`Staff: ${escapeIcsText(lesson.staffName)}`);
  }
  if (lesson.collapsedLocations && lesson.Locations && lesson.Locations.length > 0) {
    descParts.push("");
    descParts.push("Groups & Rooms:");
    lesson.Locations.forEach((loc) => {
      descParts.push(
        `• ${escapeIcsText(loc.nameSpecification)}: ${escapeIcsText(loc.location)} (${escapeIcsText(loc.staffName || "Staff TBD")})`
      );
    });
  }
  const description = descParts.join("\\n");

  const summary = escapeIcsText(`${lesson.Description || "Class"} (${lesson.EventType || "Event"})`);
  const location = escapeIcsText(lesson.Location || "TBD");

  const eventLines = [
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${summary}`,
    `LOCATION:${location}`,
    `DESCRIPTION:${description}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
  ];

  return eventLines.join("\r\n");
}

/**
 * Generate .ics calendar content for multiple lessons
 */
export function generateLessonsIcs(lessons: NormalizedLesson[]): string {
  const vEvents = lessons.map((lesson) => generateLessonVEvent(lesson)).join("\r\n");

  const icsLines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MyTimetable//Timetable App//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    vEvents,
    "END:VCALENDAR",
  ];

  return icsLines.join("\r\n");
}

/**
 * Generate .ics file content for a single lesson
 */
export function generateLessonIcs(lesson: NormalizedLesson): string {
  return generateLessonsIcs([lesson]);
}

/**
 * Trigger download of an .ics file
 */
export function downloadIcsFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
