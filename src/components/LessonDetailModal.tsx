import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  CalendarPlus,
  MapPin,
  User,
  Clock,
  Copy,
  Check,
  Users,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { Button } from "@heroui/react";
import { NormalizedLesson } from "../types/timetable";
import { generateLessonIcs, downloadIcsFile } from "../services/icalExport";
import { getLessonColorTheme } from "../services/transformer";
import { triggerHapticFeedback } from "../services/haptics";

interface LessonDetailModalProps {
  lesson: NormalizedLesson | null;
  onClose: () => void;
  initialSnap?: SheetSnap;
}

type SheetSnap = "half" | "full";

export const LessonDetailModal: React.FC<LessonDetailModalProps> = ({
  lesson,
  onClose,
  initialSnap,
}) => {
  const [copied, setCopied] = useState(false);
  const [snapState, setSnapState] = useState<SheetSnap>(() => {
    if (initialSnap) return initialSnap;
    if (!lesson) return "half";
    const isDesktop =
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 768px)").matches;
    return isDesktop ? "full" : "half";
  });

  useEffect(() => {
    if (lesson) {
      if (initialSnap) {
        setSnapState(initialSnap);
      } else {
        const isDesktop =
          typeof window !== "undefined" &&
          window.matchMedia("(min-width: 768px)").matches;
        setSnapState(isDesktop ? "full" : "half");
      }
      triggerHapticFeedback();
    }
  }, [lesson, initialSnap]);

  const colorTheme = lesson ? getLessonColorTheme(lesson) : null;

  const handleExportIcs = () => {
    if (!lesson) return;
    const icsContent = generateLessonIcs(lesson);
    const filename = `${lesson.Description.replace(
      /[^a-z0-9]/gi,
      "_"
    )}_${lesson.StartDateTime.format("YYYYMMDD")}.ics`;
    downloadIcsFile(filename, icsContent);
  };

  const handleCopyInfo = () => {
    if (!lesson) return;
    let text = `${lesson.Description} (${lesson.EventType})\n`;
    text += `Time: ${lesson.StartDateTime.format(
      "dddd, D MMMM YYYY • HH:mm"
    )} - ${lesson.EndDateTime.format("HH:mm")}\n`;
    text += `Location: ${lesson.Location || "TBD"}\n`;
    if (lesson.staffName) {
      text += `Instructor: ${lesson.staffName}\n`;
    }
    navigator.clipboard.writeText(text);
    setCopied(true);
    triggerHapticFeedback();
    setTimeout(() => setCopied(false), 2000);
  };

  const sheetVariants = {
    hidden: {
      y: "100%",
      opacity: 0,
    },
    half: {
      y: 0,
      opacity: 1,
      height: "54dvh",
      transition: {
        type: "spring",
        damping: 28,
        stiffness: 340,
      },
    },
    full: {
      y: 0,
      opacity: 1,
      height: "88dvh",
      transition: {
        type: "spring",
        damping: 28,
        stiffness: 340,
      },
    },
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {lesson && colorTheme && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden pointer-events-auto select-none">
          {/* Backdrop with fade transition */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="fixed inset-0 bg-black/60 cursor-pointer"
            onClick={onClose}
          />

          {/* Magnetic 3-State Spring Sheet (Half Open, Fully Open, Fully Close) */}
          <motion.div
            variants={sheetVariants}
            initial="hidden"
            animate={snapState}
            exit="hidden"
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.18}
            onDragEnd={(_, info) => {
              const { offset, velocity } = info;

              if (snapState === "half") {
                // Drag UP -> Snap to FULL
                if (offset.y < -35 || velocity.y < -220) {
                  setSnapState("full");
                  triggerHapticFeedback();
                }
                // Drag DOWN -> Snap to CLOSE
                else if (offset.y > 60 || velocity.y > 220) {
                  triggerHapticFeedback();
                  onClose();
                }
                // Small drag -> Snap back to HALF (NEVER HANG IN MIDDLE)
                else {
                  setSnapState("half");
                  triggerHapticFeedback();
                }
              } else if (snapState === "full") {
                // Strong drag DOWN -> Snap to CLOSE
                if (offset.y > 200 || velocity.y > 600) {
                  triggerHapticFeedback();
                  onClose();
                }
                // Moderate drag DOWN -> Snap to HALF
                else if (offset.y > 45 || velocity.y > 200) {
                  setSnapState("half");
                  triggerHapticFeedback();
                }
                // Small drag -> Snap back to FULL (NEVER HANG IN MIDDLE)
                else {
                  setSnapState("full");
                  triggerHapticFeedback();
                }
              }
            }}
            className="relative z-10 w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl border-2 border-black overflow-hidden flex flex-col touch-pan-y"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Pull Handle: Tap toggles half/full, drag snaps magnetically */}
            <div
              onClick={() => {
                setSnapState((prev) => (prev === "half" ? "full" : "half"));
                triggerHapticFeedback();
              }}
              className="w-full pt-3 pb-1 cursor-pointer flex flex-col items-center justify-center group"
              title={snapState === "half" ? "Tap to expand fully" : "Tap to collapse to half"}
            >
              <div className="w-12 h-1.5 bg-black group-hover:bg-zinc-700 rounded-full transition-colors" />
            </div>

            {/* Modal Header */}
            <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b-2 border-black flex items-start justify-between gap-3 shrink-0">
              <div>
                <div
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider mb-1.5 text-white border border-black ${
                    lesson.EventType?.toLowerCase().includes("lecture") ||
                    lesson.EventType?.toLowerCase() === "lec"
                      ? "bg-[#228B22]"
                      : "bg-black"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-white" />
                  {lesson.EventType}
                </div>
                <h2 className="text-base sm:text-lg font-black text-black leading-snug">
                  {lesson.Description}
                </h2>
                <div className="text-[11px] text-black font-mono mt-0.5">
                  {lesson.Name}
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {/* Magnetic Snap Toggle Button */}
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  onPress={() => {
                    setSnapState((prev) => (prev === "half" ? "full" : "half"));
                    triggerHapticFeedback();
                  }}
                  className="w-8 h-8 rounded-xl text-black border border-black hover:bg-zinc-100"
                  title={snapState === "half" ? "Expand to full" : "Collapse to half"}
                >
                  {snapState === "half" ? (
                    <ChevronUp className="w-4 h-4 text-black" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-black" />
                  )}
                </Button>

                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  onPress={onClose}
                  className="w-8 h-8 rounded-xl text-black border border-black hover:bg-zinc-100"
                  title="Close panel"
                >
                  <X className="w-5 h-5 text-black" />
                </Button>
              </div>
            </div>

            {/* Modal Content - Expands cleanly in both half and full */}
            <div className="p-4 sm:p-5 space-y-3.5 flex-1 overflow-y-auto bg-white">
              {/* Time & Date */}
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white border-2 border-black">
                <Clock className="w-5 h-5 text-black shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-black uppercase tracking-wider">
                    Date & Time
                  </div>
                  <div className="text-sm font-bold text-black mt-0.5">
                    {lesson.StartDateTime.format("dddd, D MMMM YYYY")}
                  </div>
                  <div className="text-xs font-bold text-black mt-0.5">
                    {lesson.StartDateTime.format("HH:mm")} – {lesson.EndDateTime.format("HH:mm")} ({lesson.EndDateTime.diff(lesson.StartDateTime, "minutes")} mins)
                  </div>
                </div>
              </div>

              {/* Location (Only when NOT broken down into sub-groups) */}
              {!lesson.collapsedLocations && (
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white border-2 border-black">
                  <div className="w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-bold text-black uppercase tracking-wider">
                      Room / Venue
                    </div>
                    <div className="text-sm font-bold text-black mt-0.5">
                      {lesson.Location || "Location to be confirmed"}
                    </div>
                  </div>
                </div>
              )}

              {/* Lecturer / Staff (Only when NOT broken down into sub-groups) */}
              {!lesson.collapsedLocations && lesson.staffName && (
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white border-2 border-black">
                  <div className="w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-black uppercase tracking-wider">
                      Lecturer / Instructor
                    </div>
                    <div className="text-sm font-bold text-black mt-0.5">
                      {lesson.staffName.includes(",")
                        ? `${lesson.staffName.split(",")[1].trim()} ${lesson.staffName.split(",")[0].trim()}`
                        : lesson.staffName}
                    </div>
                  </div>
                </div>
              )}

              {/* Multi-group Breakdown if collapsed: Spaced, Clean & Visually Pleasing */}
              {lesson.collapsedLocations && lesson.Locations && lesson.Locations.length > 0 && (
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-black uppercase tracking-wider">
                      <Users className="w-4 h-4 text-black" />
                      <span>Sub-Groups & Rooms</span>
                    </div>
                    <span className="text-[11px] font-bold text-black bg-white px-2.5 py-0.5 rounded-full border border-black">
                      {lesson.Locations.length} Groups
                    </span>
                  </div>

                  <div className="space-y-3">
                    {lesson.Locations.map((loc, idx) => {
                      // Separate room code from venue description
                      const rawLoc = loc.location || "Room TBD";
                      const locMatch = rawLoc.match(/^([A-Za-z0-9]+-[A-Za-z0-9]+|[A-Za-z]+[0-9]+|[A-Za-z0-9]{2,6})\s+(.*)$/);
                      const roomCode = locMatch ? locMatch[1] : rawLoc;
                      const roomDesc = locMatch ? locMatch[2] : null;

                      // Format staff name e.g. "Lawless, Deirdre" -> "Deirdre Lawless"
                      const rawStaff = loc.staffName;
                      const staffFormatted = rawStaff && rawStaff.includes(",")
                        ? `${rawStaff.split(",")[1].trim()} ${rawStaff.split(",")[0].trim()}`
                        : rawStaff;

                      const groupLabel = loc.nameSpecification || `Group ${String.fromCharCode(65 + idx)}`;

                      return (
                        <div
                          key={idx}
                          className="p-3.5 sm:p-4 rounded-xl bg-white border-2 border-black shadow-xs space-y-2.5"
                        >
                          {/* Header: Group Badge + Room Tag */}
                          <div className="flex items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-black text-white font-bold text-xs tracking-tight border border-black">
                              <span className="w-1.5 h-1.5 rounded-full bg-white" />
                              {groupLabel}
                            </span>

                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white border border-black">
                              <MapPin className="w-3.5 h-3.5 text-black shrink-0" />
                              <span className="text-xs font-black text-black">
                                {roomCode}
                              </span>
                            </div>
                          </div>

                          {/* Room Specification (e.g. Specialist Computer Lab 5) */}
                          {roomDesc && (
                            <div className="text-xs font-bold text-black pl-1 leading-relaxed">
                              {roomDesc}
                            </div>
                          )}

                          {/* Instructor Line */}
                          {staffFormatted && (
                            <div className="flex items-center gap-2 pt-1 border-t border-black text-xs text-black pl-1">
                              <User className="w-3.5 h-3.5 text-black shrink-0" />
                              <span className="font-bold text-black">
                                {staffFormatted}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-4 sm:p-5 bg-white border-t-2 border-black flex gap-2.5">
              <Button
                variant="solid"
                onPress={handleExportIcs}
                startContent={<CalendarPlus className="w-4 h-4 text-white" />}
                className="flex-1 h-11 font-bold text-xs rounded-xl bg-black hover:bg-zinc-800 text-white border-2 border-black shadow-sm"
              >
                Add to Calendar
              </Button>

              <Button
                variant="flat"
                onPress={handleCopyInfo}
                startContent={copied ? <Check className="w-4 h-4 text-black" /> : <Copy className="w-4 h-4 text-black" />}
                className="h-11 px-4 font-bold text-xs rounded-xl bg-white text-black hover:bg-zinc-100 border-2 border-black shadow-sm"
              >
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
