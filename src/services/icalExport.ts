import { NormalizedLesson } from "../types/timetable";

/**
 * Format Moment date to iCalendar UTC format (e.g. 20260902T080000Z)
 */
function formatIcsDate(date: moment.Moment): string {
  return date.clone().utc().format("YYYYMMDDTHHmmss") + "Z";
}

/**
 * Generate .ics file content for a single lesson
 */
export function generateLessonIcs(lesson: NormalizedLesson): string {
  const dtStamp = formatIcsDate(lesson.StartDateTime);
  const dtStart = formatIcsDate(lesson.StartDateTime);
  const dtEnd = formatIcsDate(lesson.EndDateTime);
  const uid = `${lesson.id || Math.random().toString(36)}@mytimetable.app`;

  let description = `${lesson.EventType} - ${lesson.Description}\\nModule: ${lesson.Name}`;
  if (lesson.staffName) {
    description += `\\nStaff: ${lesson.staffName}`;
  }
  if (lesson.collapsedLocations && lesson.Locations) {
    description += "\\n\\nGroups & Rooms:";
    lesson.Locations.forEach((loc) => {
      description += `\\n• ${loc.nameSpecification}: ${loc.location} (${loc.staffName || "Staff TBD"})`;
    });
  }

  const icsLines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MyTimetable//Timetable App//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${lesson.Description} (${lesson.EventType})`,
    `LOCATION:${lesson.Location || "TBD"}`,
    `DESCRIPTION:${description}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return icsLines.join("\r\n");
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
