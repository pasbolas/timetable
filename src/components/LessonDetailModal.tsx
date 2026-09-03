import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CalendarPlus, MapPin, User, Clock, Copy, Check, Users } from "lucide-react";
import { Button } from "@heroui/react";
import { NormalizedLesson } from "../types/timetable";
import { generateLessonIcs, downloadIcsFile } from "../services/icalExport";
import { getLessonColorTheme } from "../services/transformer";
import { triggerHapticFeedback } from "../services/haptics";

interface LessonDetailModalProps {
  lesson: NormalizedLesson | null;
  onClose: () => void;
}

export const LessonDetailModal: React.FC<LessonDetailModalProps> = ({
  lesson,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (lesson) {
      triggerHapticFeedback();
    }
  }, [lesson]);

  const colorTheme = lesson ? getLessonColorTheme(lesson) : null;

  const handleExportIcs = () => {
    if (!lesson) return;
    const icsContent = generateLessonIcs(lesson);
    const filename = `${lesson.Description.replace(/[^a-z0-9]/gi, "_")}_${lesson.StartDateTime.format("YYYYMMDD")}.ics`;
    downloadIcsFile(filename, icsContent);
  };

  const handleCopyInfo = () => {
    if (!lesson) return;
    let text = `${lesson.Description} (${lesson.EventType})\n`;
    text += `Time: ${lesson.StartDateTime.format("dddd, D MMMM YYYY • HH:mm")} - ${lesson.EndDateTime.format("HH:mm")}\n`;
    text += `Location: ${lesson.Location || "TBD"}\n`;
    if (lesson.staffName) text += `Staff: ${lesson.staffName}\n`;
    text += `Code: ${lesson.Name}\n`;

    if (lesson.collapsedLocations && lesson.Locations) {
      text += "\nGroups:\n";
      lesson.Locations.forEach((l) => {
        text += `• ${l.nameSpecification}: ${l.location} (${l.staffName || "TBD"})\n`;
      });
    }

    navigator.clipboard.writeText(text);
    setCopied(true);
    triggerHapticFeedback();
    setTimeout(() => setCopied(false), 2000);
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

          {/* Clean Springy Sheet / Modal */}
          <motion.div
            initial={{ y: "100%", opacity: 0.8, scale: 0.94 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: "100%", opacity: 0, scale: 0.94 }}
            transition={{
              type: "spring",
              damping: 25,
              stiffness: 300,
              mass: 0.8,
            }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.25}
            onDragEnd={(_, info) => {
              if (info.offset.y > 80 || info.velocity.y > 400) {
                onClose();
              }
            }}
            className="relative z-10 w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-[28px] sm:rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 touch-pan-y"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Pull Handle for mobile drag */}
            <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mt-3 mb-1 sm:hidden cursor-grab active:cursor-grabbing" />

            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3">
              <div>
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider mb-2 ${colorTheme.pill}`}>
                  <span className={`w-2 h-2 rounded-full ${colorTheme.accent}`} />
                  {lesson.EventType}
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                  {lesson.Description}
                </h2>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-1">
                  {lesson.Name}
                </div>
              </div>
              <Button
                isIconOnly
                size="sm"
                variant="light"
                onPress={onClose}
                className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-5 space-y-4 max-h-[60vh] overflow-y-auto">
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

              {/* Location */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <MapPin className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Room / Venue
                  </div>
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                    {lesson.Location || "Location to be confirmed"}
                  </div>
                </div>
              </div>

              {/* Lecturer / Staff */}
              {lesson.staffName && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <User className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Lecturer / Instructor
                    </div>
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                      {lesson.staffName}
                    </div>
                  </div>
                </div>
              )}

              {/* Multi-group Breakdown if collapsed */}
              {lesson.collapsedLocations && lesson.Locations && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <Users className="w-4 h-4" />
                    Sub-groups & Rooms
                  </div>
                  <div className="space-y-1.5">
                    {lesson.Locations.map((loc, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-purple-900 dark:text-purple-200 block">
                            {loc.nameSpecification || `Group ${idx + 1}`}
                          </span>
                          <span className="text-slate-500 dark:text-slate-400">
                            {loc.staffName || "Staff assigned"}
                          </span>
                        </div>
                        <span className="font-bold px-2 py-1 rounded bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-slate-700">
                          {loc.location || "TBD"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 flex gap-2.5">
              <Button
                color="primary"
                variant="solid"
                onPress={handleExportIcs}
                startContent={<CalendarPlus className="w-4 h-4" />}
                className="flex-1 h-11 font-semibold text-xs rounded-xl shadow-md shadow-blue-600/20"
              >
                Add to Calendar
              </Button>

              <Button
                variant="flat"
                onPress={handleCopyInfo}
                startContent={copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                className="h-11 px-4 font-semibold text-xs rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
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
