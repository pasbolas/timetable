import React, { useState, useEffect } from "react";
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
}

type SheetSnap = "half" | "full";

export const LessonDetailModal: React.FC<LessonDetailModalProps> = ({
  lesson,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [snapState, setSnapState] = useState<SheetSnap>("half");

  useEffect(() => {
    if (lesson) {
      setSnapState("half");
      triggerHapticFeedback();
    }
  }, [lesson]);

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

  return (
    <AnimatePresence>
      {lesson && colorTheme && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden pointer-events-auto select-none">
          {/* Backdrop with fade transition */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="fixed inset-0 bg-slate-950/65 dark:bg-slate-950/80 backdrop-blur-sm cursor-pointer"
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
            className="relative z-10 w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-[28px] sm:rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col touch-pan-y"
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
              <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 group-hover:bg-slate-400 dark:group-hover:bg-slate-500 rounded-full transition-colors" />
            </div>

            {/* Modal Header */}
            <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3 shrink-0">
              <div>
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider mb-1.5 ${colorTheme.pill}`}>
                  <span className={`w-2 h-2 rounded-full ${colorTheme.accent}`} />
                  {lesson.EventType}
                </div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
                  {lesson.Description}
                </h2>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
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
                  className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  title={snapState === "half" ? "Expand to full" : "Collapse to half"}
                >
                  {snapState === "half" ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>

                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  onPress={onClose}
                  className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  title="Close panel"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Modal Content - Expands cleanly in both half and full */}
            <div className="p-4 sm:p-5 space-y-3.5 flex-1 overflow-y-auto">
              {/* Time & Date */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Date & Time
                  </div>
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                    {lesson.StartDateTime.format("dddd, D MMMM YYYY")}
                  </div>
                  <div className="text-xs font-medium text-blue-600 dark:text-blue-400 mt-0.5">
                    {lesson.StartDateTime.format("HH:mm")} – {lesson.EndDateTime.format("HH:mm")} ({lesson.EndDateTime.diff(lesson.StartDateTime, "minutes")} mins)
                  </div>
                </div>
              </div>

              {/* Location (Only when NOT broken down into sub-groups) */}
              {!lesson.collapsedLocations && (
                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800/80">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Room / Venue
                    </div>
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                      {lesson.Location || "Location to be confirmed"}
                    </div>
                  </div>
                </div>
              )}

              {/* Lecturer / Staff (Only when NOT broken down into sub-groups) */}
              {!lesson.collapsedLocations && lesson.staffName && (
                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800/80">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Lecturer / Instructor
                    </div>
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5">
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
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      <Users className="w-4 h-4 text-blue-500" />
                      <span>Sub-Groups & Rooms</span>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-0.5 rounded-full border border-slate-200/60 dark:border-slate-700/60">
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
                          className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/70 hover:bg-slate-50 dark:bg-[#424242]/70 dark:hover:bg-[#424242] border border-slate-200/80 dark:border-neutral-600/70 shadow-xs transition-all space-y-2.5 group"
                        >
                          {/* Header: Group Badge + Room Tag */}
                          <div className="flex items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-50 dark:bg-[#834655]/40 text-blue-700 dark:text-[#F6CAC9] font-bold text-xs tracking-tight border border-blue-200/60 dark:border-[#9F5069]/40 shadow-2xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-[#C8B273]" />
                              {groupLabel}
                            </span>

                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white dark:bg-[#303030] border border-slate-200/80 dark:border-neutral-600/70 shadow-2xs">
                              <MapPin className="w-3.5 h-3.5 text-emerald-500 dark:text-[#C8B273] shrink-0" />
                              <span className="text-xs font-extrabold text-slate-800 dark:text-[#F6CAC9]">
                                {roomCode}
                              </span>
                            </div>
                          </div>

                          {/* Room Specification (e.g. Specialist Computer Lab 5) */}
                          {roomDesc && (
                            <div className="text-xs font-medium text-slate-600 dark:text-[#F6CAC9]/80 pl-1 leading-relaxed">
                              {roomDesc}
                            </div>
                          )}

                          {/* Instructor Line */}
                          {staffFormatted && (
                            <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60 dark:border-neutral-600/50 text-xs text-slate-500 dark:text-[#F6CAC9]/70 pl-1">
                              <User className="w-3.5 h-3.5 text-slate-400 dark:text-[#C8B273] shrink-0" />
                              <span className="font-medium text-slate-700 dark:text-[#fbf7ed]">
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
            <div className="p-4 sm:p-5 bg-slate-50 dark:bg-[#363636] border-t border-slate-200 dark:border-neutral-600/60 flex gap-2.5">
              <Button
                variant="solid"
                onPress={handleExportIcs}
                startContent={<CalendarPlus className="w-4 h-4" />}
                className="flex-1 h-11 font-semibold text-xs rounded-xl shadow-md bg-blue-600 text-white dark:bg-[#C8B273] dark:text-[#424242] dark:hover:bg-[#C8B273]/90 shadow-blue-600/20 dark:shadow-[#C8B273]/30"
              >
                Add to Calendar
              </Button>

              <Button
                variant="flat"
                onPress={handleCopyInfo}
                startContent={copied ? <Check className="w-4 h-4 text-emerald-500 dark:text-[#C8B273]" /> : <Copy className="w-4 h-4 text-slate-500 dark:text-[#F6CAC9]" />}
                className="h-11 px-4 font-semibold text-xs rounded-xl bg-slate-200 dark:bg-[#834655]/40 text-slate-800 dark:text-[#F6CAC9] dark:hover:bg-[#834655]/60"
              >
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
