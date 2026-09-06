import moment from "moment-timezone";
import { DayData, NormalizedLesson, ProgramSearchResult } from "../types/timetable";
import { parseProgramCodeAndTitle, getCanonicalEventType } from "./transformer";
import { TIMETABLE_CONFIG } from "../config/timetableConfig";

/**
 * Utility to draw rounded rectangles compatible with all canvas contexts
 */
function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number | number[]
) {
  const r = typeof radius === "number" ? [radius, radius, radius, radius] : radius;
  const [tl, tr, br, bl] = r;

  ctx.beginPath();
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + w - tr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + tr);
  ctx.lineTo(x + w, y + h - br);
  ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
  ctx.lineTo(x + bl, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - bl);
  ctx.lineTo(x, y + tl);
  ctx.quadraticCurveTo(x, y, x + tl, y);
  ctx.closePath();
}

/**
 * Event type color schemes for the generated image
 */
interface EventStyle {
  label: string;
  pillBg: string;
  pillText: string;
  accentBar: string;
  dotColor: string;
}

function getEventStyle(lesson: NormalizedLesson): EventStyle {
  const type = getCanonicalEventType({
    EventType: lesson.EventType,
    Name: lesson.Name,
    Description: lesson.Description,
    collapsedLocations: lesson.collapsedLocations,
    Locations: lesson.Locations,
  });

  if (type === "Laboratory") {
    return {
      label: "LABORATORY",
      pillBg: "#065f46",
      pillText: "#a7f3d0",
      accentBar: "#10b981",
      dotColor: "#34d399",
    };
  }
  if (type === "Tutorial") {
    return {
      label: "TUTORIAL",
      pillBg: "#78350f",
      pillText: "#fde68a",
      accentBar: "#f59e0b",
      dotColor: "#fbbf24",
    };
  }
  return {
    label: "LECTURE",
    pillBg: "#1e3a8a",
    pillText: "#bfdbfe",
    accentBar: "#3b82f6",
    dotColor: "#60a5fa",
  };
}

/**
 * Render a high-resolution, pixel-perfect PNG card of the day's timetable
 */
export async function renderDayTimetableCanvas(
  dayData: DayData,
  activeDate: moment.Moment,
  program?: ProgramSearchResult
): Promise<HTMLCanvasElement> {
  const width = 1080;
  const padding = 54;
  const contentWidth = width - padding * 2;

  // Header height
  const headerHeight = 240;
  // Footer height
  const footerHeight = 120;

  const lessons = dayData.lessons || [];

  // Calculate dynamic content height
  let itemsHeight = 0;
  if (lessons.length === 0) {
    itemsHeight = 280;
  } else {
    // Sort lessons chronologically
    const sortedLessons = [...lessons].sort(
      (a, b) => a.StartDateTime.valueOf() - b.StartDateTime.valueOf()
    );

    for (let i = 0; i < sortedLessons.length; i++) {
      itemsHeight += 180; // card height
      // Check for break after this lesson
      if (i < sortedLessons.length - 1) {
        const curr = sortedLessons[i];
        const next = sortedLessons[i + 1];
        const diff = next.StartDateTime.diff(curr.EndDateTime, "minutes");
        if (diff >= 15) {
          itemsHeight += 70; // break pill
        }
      }
    }
  }

  const calculatedHeight = headerHeight + itemsHeight + footerHeight + 80;
  const height = Math.max(920, calculatedHeight);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context is not available");

  // Background base
  ctx.fillStyle = "#0c0d10";
  ctx.fillRect(0, 0, width, height);

  // Subtle ambient radial glow in top right
  const topGlow = ctx.createRadialGradient(width - 100, 100, 20, width - 100, 100, 500);
  topGlow.addColorStop(0, "rgba(99, 102, 241, 0.22)");
  topGlow.addColorStop(0.6, "rgba(99, 102, 241, 0.05)");
  topGlow.addColorStop(1, "transparent");
  ctx.fillStyle = topGlow;
  ctx.fillRect(0, 0, width, height);

  // Subtle ambient radial glow in bottom left
  const btmGlow = ctx.createRadialGradient(100, height - 100, 20, 100, height - 100, 500);
  btmGlow.addColorStop(0, "rgba(236, 72, 153, 0.15)");
  btmGlow.addColorStop(0.6, "rgba(236, 72, 153, 0.03)");
  btmGlow.addColorStop(1, "transparent");
  ctx.fillStyle = btmGlow;
  ctx.fillRect(0, 0, width, height);

  // Subtle border around entire card
  ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
  ctx.lineWidth = 4;
  drawRoundRect(ctx, 4, 4, width - 8, height - 8, 24);
  ctx.stroke();

  // -------------------------------------------------------------
  // HEADER SECTION
  // -------------------------------------------------------------
  let y = padding;

  // University & App Badge Pill
  const uniName = TIMETABLE_CONFIG.shortName || "MyTimetable";
  const badgeText = `MYTIMETABLE • ${uniName.toUpperCase()}`;

  ctx.font = "bold 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  const badgeMetrics = ctx.measureText(badgeText);
  const badgeWidth = badgeMetrics.width + 36;
  const badgeHeight = 38;

  ctx.fillStyle = "#1c1d22";
  drawRoundRect(ctx, padding, y, badgeWidth, badgeHeight, 19);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
  ctx.lineWidth = 2;
  drawRoundRect(ctx, padding, y, badgeWidth, badgeHeight, 19);
  ctx.stroke();

  // Badge glow dot
  ctx.fillStyle = "#60a5fa";
  ctx.beginPath();
  ctx.arc(padding + 16, y + badgeHeight / 2, 5, 0, Math.PI * 2);
  ctx.fill();

  // Badge text
  ctx.fillStyle = "#e4e4e7";
  ctx.fillText(badgeText, padding + 28, y + 26);

  // Right-aligned class count pill
  const countText = lessons.length === 1 ? "1 Class" : `${lessons.length} Classes`;
  ctx.font = "bold 22px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  const countMetrics = ctx.measureText(countText);
  const countPillWidth = countMetrics.width + 32;

  ctx.fillStyle = lessons.length > 0 ? "#27272a" : "#18181b";
  drawRoundRect(ctx, width - padding - countPillWidth, y, countPillWidth, badgeHeight, 19);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
  ctx.lineWidth = 1.5;
  drawRoundRect(ctx, width - padding - countPillWidth, y, countPillWidth, badgeHeight, 19);
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.fillText(countText, width - padding - countPillWidth + 16, y + 27);

  y += badgeHeight + 24;

  // Date Heading (e.g. Tuesday, 29 September 2026)
  const dateFormatted = activeDate.format("dddd, D MMMM YYYY");
  ctx.font = "900 50px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(dateFormatted, padding, y + 42);
  y += 56;

  // Course / Degree Subtitle
  const progName = program?.Name || TIMETABLE_CONFIG.defaultProgram.Name;
  const progDesc = program?.Description || TIMETABLE_CONFIG.defaultProgram.Description;
  const { code: courseCode, title: courseTitle } = parseProgramCodeAndTitle(progName, progDesc);

  ctx.font = "bold 24px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#a1a1aa";
  const fullCourseText = `${courseCode} • ${courseTitle}`;
  const truncatedCourse = ctx.measureText(fullCourseText).width > contentWidth
    ? `${courseCode} • ${courseTitle.slice(0, 48)}...`
    : fullCourseText;
  ctx.fillText(truncatedCourse, padding, y + 24);
  y += 44;

  // Header Divider Line
  ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padding, y);
  ctx.lineTo(width - padding, y);
  ctx.stroke();
  y += 32;

  // -------------------------------------------------------------
  // SCHEDULE / LESSON CARDS SECTION
  // -------------------------------------------------------------
  if (lessons.length === 0) {
    // Empty state card
    const emptyBoxH = 200;
    ctx.fillStyle = "#14151a";
    drawRoundRect(ctx, padding, y, contentWidth, emptyBoxH, 20);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 2;
    drawRoundRect(ctx, padding, y, contentWidth, emptyBoxH, 20);
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.font = "bold 34px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.fillText("No classes scheduled today", width / 2, y + 90);

    ctx.font = "500 22px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillStyle = "#a1a1aa";
    ctx.fillText("Enjoy your free day or catch up on coursework!", width / 2, y + 135);
    ctx.textAlign = "left";

    y += emptyBoxH + 32;
  } else {
    const sortedLessons = [...lessons].sort(
      (a, b) => a.StartDateTime.valueOf() - b.StartDateTime.valueOf()
    );

    for (let i = 0; i < sortedLessons.length; i++) {
      const lesson = sortedLessons[i];
      const style = getEventStyle(lesson);
      const cardHeight = 160;

      // Card Container
      ctx.fillStyle = "#14151a";
      drawRoundRect(ctx, padding, y, contentWidth, cardHeight, 20);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
      ctx.lineWidth = 2;
      drawRoundRect(ctx, padding, y, contentWidth, cardHeight, 20);
      ctx.stroke();

      // Left Accent Color Strip
      ctx.fillStyle = style.accentBar;
      drawRoundRect(ctx, padding, y, 8, cardHeight, [20, 0, 0, 20]);
      ctx.fill();

      // Time Column on Left (e.g. 09:00 - 11:00)
      const startTime = lesson.StartDateTime.format("HH:mm");
      const endTime = lesson.EndDateTime.format("HH:mm");
      const durationMins = lesson.EndDateTime.diff(lesson.StartDateTime, "minutes");
      const durationHours = (durationMins / 60).toFixed(durationMins % 60 === 0 ? 0 : 1);

      const timeColX = padding + 28;
      ctx.font = "900 36px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(startTime, timeColX, y + 54);

      ctx.font = "bold 22px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillStyle = "#a1a1aa";
      ctx.fillText(`to ${endTime}`, timeColX, y + 88);

      ctx.font = "600 18px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillStyle = "#71717a";
      ctx.fillText(`${durationHours}h`, timeColX, y + 120);

      // Vertical separator between Time and Details
      const sepX = timeColX + 130;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(sepX, y + 18);
      ctx.lineTo(sepX, y + cardHeight - 18);
      ctx.stroke();

      // Main Details Area
      const detailsX = sepX + 24;
      const detailsMaxW = width - padding - detailsX - 20;

      // Event Type Pill (e.g. "LECTURE")
      ctx.font = "bold 16px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      const pillMetrics = ctx.measureText(style.label);
      const pillW = pillMetrics.width + 20;
      const pillH = 26;

      ctx.fillStyle = style.pillBg;
      drawRoundRect(ctx, detailsX, y + 20, pillW, pillH, 8);
      ctx.fill();

      ctx.fillStyle = style.pillText;
      ctx.fillText(style.label, detailsX + 10, y + 39);

      // Module code next to pill if available
      if (lesson.moduleCode) {
        ctx.font = "bold 16px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
        ctx.fillStyle = "#a1a1aa";
        ctx.fillText(lesson.moduleCode, detailsX + pillW + 12, y + 39);
      }

      // Module Title
      const rawTitle = lesson.moduleName || lesson.Description || lesson.Name;
      ctx.font = "bold 30px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillStyle = "#ffffff";

      // Truncate title if longer than width
      let displayTitle = rawTitle;
      while (ctx.measureText(displayTitle).width > detailsMaxW && displayTitle.length > 10) {
        displayTitle = displayTitle.slice(0, -4) + "...";
      }
      ctx.fillText(displayTitle, detailsX, y + 88);

      // Location & Meta Row (Room, Group, Staff)
      const location = lesson.Location || "Room TBD";
      const group = lesson.groupName ? ` • ${lesson.groupName}` : "";
      const staff = lesson.staffName ? ` • ${lesson.staffName}` : "";
      const metaString = `📍 ${location}${group}${staff}`;

      ctx.font = "500 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillStyle = "#cbd5e1";
      let displayMeta = metaString;
      while (ctx.measureText(displayMeta).width > detailsMaxW && displayMeta.length > 12) {
        displayMeta = displayMeta.slice(0, -4) + "...";
      }
      ctx.fillText(displayMeta, detailsX, y + 128);

      y += cardHeight;

      // Check for break before next class
      if (i < sortedLessons.length - 1) {
        const next = sortedLessons[i + 1];
        const gapMins = next.StartDateTime.diff(lesson.EndDateTime, "minutes");
        if (gapMins >= 15) {
          y += 12;
          const breakH = 46;
          const gapHours = (gapMins / 60).toFixed(gapMins % 60 === 0 ? 0 : 1);

          ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
          drawRoundRect(ctx, padding + 40, y, contentWidth - 80, breakH, 12);
          ctx.fill();
          ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
          ctx.lineWidth = 1;
          drawRoundRect(ctx, padding + 40, y, contentWidth - 80, breakH, 12);
          ctx.stroke();

          ctx.textAlign = "center";
          ctx.font = "bold 18px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
          ctx.fillStyle = "#a1a1aa";
          ctx.fillText(
            `☕ Free Gap • ${gapHours} hr (${gapMins} mins)`,
            width / 2,
            y + 29
          );
          ctx.textAlign = "left";

          y += breakH + 12;
        } else {
          y += 16;
        }
      } else {
        y += 24;
      }
    }
  }

  // -------------------------------------------------------------
  // FOOTER WATERMARK SECTION
  // -------------------------------------------------------------
  ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padding, height - footerHeight + 20);
  ctx.lineTo(width - padding, height - footerHeight + 20);
  ctx.stroke();

  const footerY = height - footerHeight + 64;

  ctx.font = "bold 22px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText("MyTimetable", padding, footerY);

  ctx.font = "500 18px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#71717a";
  ctx.fillText("• Student Companion App", padding + 150, footerY);

  // Right side watermark / timestamp
  const nowStr = moment().tz(TIMETABLE_CONFIG.timezone).format("D MMM YYYY, h:mm A");
  ctx.textAlign = "right";
  ctx.font = "500 18px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#71717a";
  ctx.fillText(`Shared • ${nowStr}`, width - padding, footerY);
  ctx.textAlign = "left";

  return canvas;
}

/**
 * Triggers native browser download for a Blob
 */
export function downloadImageBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/**
 * Share or download the day timetable image.
 * Uses Web Share API (native sheet on iOS & Android) when available with file support,
 * falling back cleanly to direct PNG file download on desktop.
 */
export async function shareDayTimetableImage(
  dayData: DayData,
  activeDate: moment.Moment,
  program?: ProgramSearchResult
): Promise<{ success: boolean; method: "shared" | "downloaded" | "cancelled"; error?: any }> {
  try {
    const canvas = await renderDayTimetableCanvas(dayData, activeDate, program);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/png");
    });

    if (!blob) {
      throw new Error("Failed to generate image blob from timetable canvas");
    }

    const dateSlug = activeDate.format("YYYY-MM-DD");
    const progCode = (program?.Name || "timetable")
      .split(" ")[0]
      .replace(/[^a-z0-9_-]/gi, "_")
      .toLowerCase();
    const filename = `timetable_${progCode}_${dateSlug}.png`;

    const file = new File([blob], filename, { type: "image/png" });
    const shareTitle = `Timetable • ${activeDate.format("dddd, D MMMM")}`;
    const shareText = `Here is the timetable schedule for ${activeDate.format("dddd, D MMMM")}!`;

    // 1. Try native Web Share API with file support
    if (
      navigator.canShare &&
      navigator.canShare({ files: [file] }) &&
      typeof navigator.share === "function"
    ) {
      try {
        await navigator.share({
          files: [file],
          title: shareTitle,
          text: shareText,
        });
        return { success: true, method: "shared" };
      } catch (err: any) {
        if (err?.name === "AbortError") {
          return { success: false, method: "cancelled" };
        }
        // If navigator.share fails for another reason, fallback to download below
        console.warn("navigator.share failed, falling back to download:", err);
      }
    }

    // 2. Desktop or unsupported environment: download the PNG directly
    downloadImageBlob(blob, filename);
    return { success: true, method: "downloaded" };
  } catch (error) {
    console.error("shareDayTimetableImage error:", error);
    return { success: false, method: "cancelled", error };
  }
}
