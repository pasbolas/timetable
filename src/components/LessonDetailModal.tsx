import React, { useState, useEffect, useMemo, useRef } from "react";
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
  Heart,
} from "lucide-react";
import { Button } from "@heroui/react";
import { NormalizedLesson } from "../types/timetable";
import { generateLessonIcs, downloadIcsFile } from "../services/icalExport";
import { getLessonColorTheme, getLessonModuleKey } from "../services/transformer";
import { StorageService } from "../services/storage";
import { triggerHapticFeedback } from "../services/haptics";
import { trackEvent } from "../services/analytics";
import { RoomBadge } from "./RoomBadge";

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
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(min-width: 768px)");
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  const [snapState, setSnapState] = useState<SheetSnap>(() => {
    if (initialSnap) return initialSnap;
    return typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches
      ? "full"
      : "half";
  });

  const prevLessonIdRef = useRef<string | null>(null);
  if (lesson && lesson.id !== prevLessonIdRef.current) {
    prevLessonIdRef.current = lesson.id;
    const targetSnap = initialSnap || (isDesktop ? "full" : "half");
    if (snapState !== targetSnap) {
      setSnapState(targetSnap);
    }
  } else if (!lesson && prevLessonIdRef.current !== null) {
    prevLessonIdRef.current = null;
  }

  useEffect(() => {
    if (lesson) {
      triggerHapticFeedback();
    }
  }, [lesson]);

  const colorTheme = lesson ? getLessonColorTheme(lesson) : null;
  const moduleKey = lesson ? getLessonModuleKey(lesson) : "";
  const isLab = Boolean(
    lesson?.EventType?.toLowerCase().includes("lab") ||
    lesson?.EventType?.toLowerCase().includes("pract") ||
    lesson?.collapsedLocations
  );
  const isLecture = Boolean(
    lesson?.EventType?.toLowerCase().includes("lecture") ||
    lesson?.EventType?.toLowerCase() === "lec"
  );
  const isTutorial = Boolean(
    (lesson?.EventType && /\b(tut|tutorial|tutorials)\b/i.test(lesson.EventType)) ||
    (lesson?.Description && /\b(tutorial|tutorials)\b/i.test(lesson.Description))
  );
  const [favGroup, setFavGroup] = useState<string | null>(() =>
    moduleKey ? StorageService.getFavoriteGroupForModule(moduleKey) : null
  );

  useEffect(() => {
    if (lesson) {
      const key = getLessonModuleKey(lesson);
      setFavGroup(StorageService.getFavoriteGroupForModule(key));
    }
  }, [lesson]);

  useEffect(() => {
    const handleSync = (e: any) => {
      if (!moduleKey) return;
      if (!e.detail || e.detail.moduleKey === moduleKey) {
        setFavGroup(StorageService.getFavoriteGroupForModule(moduleKey));
      }
    };
    window.addEventListener("timetabler_favorite_groups_changed", handleSync);
    return () => window.removeEventListener("timetabler_favorite_groups_changed", handleSync);
  }, [moduleKey]);

  const handleToggleFavoriteGroup = (groupLabel: string) => {
    if (!moduleKey) return;
    const isAlreadyFav = Boolean(
      favGroup && favGroup.trim().toLowerCase() === groupLabel.trim().toLowerCase()
    );
    const nextVal = isAlreadyFav ? null : groupLabel;
    StorageService.setFavoriteGroupForModule(moduleKey, nextVal);
    setFavGroup(nextVal);
    triggerHapticFeedback();
    trackEvent("Toggle Favorite Group", {
      module: moduleKey,
      group: groupLabel,
      action: isAlreadyFav ? "unfavorite" : "favorite",
    });
  };

  const sortedLocations = useMemo(() => {
    if (!lesson?.Locations) return [];
    const list = lesson.Locations.map((loc, idx) => ({
      ...loc,
      calculatedLabel: loc.nameSpecification || `Group ${String.fromCharCode(65 + idx)}`,
      originalIdx: idx,
    }));

    if (!favGroup) return list;

    return [...list].sort((a, b) => {
      const aMatch = a.calculatedLabel.trim().toLowerCase() === favGroup.trim().toLowerCase();
      const bMatch = b.calculatedLabel.trim().toLowerCase() === favGroup.trim().toLowerCase();
      if (aMatch && !bMatch) return -1;
      if (!aMatch && bMatch) return 1;
      return a.originalIdx - b.originalIdx;
    });
  }, [lesson?.Locations, favGroup]);

  const handleExportIcs = () => {
    if (!lesson) return;
    const icsContent = generateLessonIcs(lesson);
    const filename = `${lesson.Description.replace(
      /[^a-z0-9]/gi,
      "_"
    )}_${lesson.StartDateTime.format("YYYYMMDD")}.ics`;
    downloadIcsFile(filename, icsContent);
    trackEvent("Export Calendar Event", {
      module: lesson.Description,
      eventType: lesson.EventType,
    });
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

    const copyToClipboard = async (content: string): Promise<boolean> => {
      if (navigator?.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(content);
          return true;
        } catch {
          // Fall through to textarea execCommand fallback
        }
      }
      try {
        const textarea = document.createElement("textarea");
        textarea.value = content;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        const successful = document.execCommand("copy");
        document.body.removeChild(textarea);
        return successful;
      } catch (err) {
        console.warn("Clipboard copy fallback failed:", err);
        return false;
      }
    };

    copyToClipboard(text).then((success) => {
      if (success) {
        setCopied(true);
        triggerHapticFeedback();
        trackEvent("Copy Lesson Info", {
          module: lesson.Description,
        });
        setTimeout(() => setCopied(false), 2000);
      }
    });
  };

  const sheetVariants = {
    hidden: isDesktop
      ? {
          opacity: 0,
          scale: 0.95,
          y: 0,
          transition: {
            duration: 0.18,
            ease: "easeOut",
          },
        }
      : {
          opacity: 0,
          y: "100%",
          scale: 1,
          transition: {
            duration: 0.22,
            ease: [0.32, 0.72, 0, 1],
          },
        },
    half: {
      y: 0,
      opacity: 1,
      scale: 1,
      height: "54dvh",
      transition: {
        type: "tween",
        duration: 0.24,
        ease: [0.16, 1, 0.3, 1],
      },
    },
    full: {
      y: 0,
      opacity: 1,
      scale: 1,
      height: isDesktop ? "85dvh" : "88dvh",
      transition: {
        type: "tween",
        duration: 0.24,
        ease: [0.16, 1, 0.3, 1],
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
            className="fixed inset-0 bg-black/80 backdrop-blur-sm cursor-pointer"
            onClick={onClose}
          />

          {/* Smooth Expand Sheet (Half Open, Fully Open, Fully Close) */}
          <motion.div
            variants={sheetVariants}
            initial="hidden"
            animate={snapState}
            exit="hidden"
            drag={isDesktop ? false : "y"}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.18}
            onDragEnd={(_, info) => {
              if (isDesktop) return;
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
            className="relative z-10 w-full sm:max-w-md bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 rounded-t-3xl sm:rounded-2xl border border-zinc-200 dark:border-zinc-700/80 overflow-hidden flex flex-col touch-pan-y shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Top Header Area: Styled in matching event widget colour */}
            <div
              className={`relative border-b border-zinc-200 dark:border-zinc-800 shrink-0 overflow-hidden modal-event-header timetable-widget ${
                isLecture
                  ? "lecture-widget"
                  : isLab
                  ? "lab-widget"
                  : isTutorial
                  ? "tutorial-widget"
                  : "bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
              }`}
            >
              {/* Sleek vertical accent bar on left matching timetable widget */}
              <div
                className={`absolute left-0 top-0 bottom-0 w-1.5 sm:w-2 z-10 ${
                  isLecture
                    ? "lecture-accent-bar"
                    : isLab
                    ? "lab-accent-bar"
                    : isTutorial
                    ? "tutorial-accent-bar"
                    : "bg-zinc-400"
                }`}
              />

              {/* Modal Pull Handle: Tap toggles half/full, drag snaps magnetically */}
              <div
                onClick={() => {
                  setSnapState((prev) => (prev === "half" ? "full" : "half"));
                  triggerHapticFeedback();
                }}
                className="w-full pt-3 pb-1 cursor-pointer flex flex-col items-center justify-center group"
                title={snapState === "half" ? "Tap to expand fully" : "Tap to collapse to half"}
              >
                <div className="w-12 h-1.5 rounded-full bg-black/20 dark:bg-white/25 group-hover:bg-black/35 dark:group-hover:bg-white/40 transition-colors" />
              </div>

              {/* Modal Header */}
              <div className="px-4 py-3 sm:px-5 sm:py-3.5 pl-5 sm:pl-6 flex items-start justify-between gap-3">
                <div>
                  <div
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider mb-1.5 border ${
                      isLecture
                        ? "lecture-badge text-white border-transparent"
                        : isLab
                        ? "lab-badge text-white border-transparent"
                        : isTutorial
                        ? "tutorial-badge border-transparent"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-current opacity-80" />
                    {lesson.EventType}
                  </div>
                  <h2 className="text-base sm:text-lg font-black text-zinc-900 dark:text-white leading-snug">
                    {lesson.Description}
                  </h2>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-300 font-mono mt-0.5">
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
                    className="w-8 h-8 rounded-xl border border-zinc-300/80 dark:border-white/15 bg-black/5 hover:bg-black/10 dark:bg-black/30 dark:hover:bg-black/50 text-zinc-700 dark:text-zinc-200 transition-colors"
                    title={snapState === "half" ? "Expand to full" : "Collapse to half"}
                  >
                    {snapState === "half" ? (
                      <ChevronUp className="w-4 h-4 text-current" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-current" />
                    )}
                  </Button>

                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    onPress={onClose}
                    className="w-8 h-8 rounded-xl border border-zinc-300/80 dark:border-white/15 bg-black/5 hover:bg-black/10 dark:bg-black/30 dark:hover:bg-black/50 text-zinc-700 dark:text-zinc-200 transition-colors"
                    title="Close panel"
                  >
                    <X className="w-5 h-5 text-current" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Modal Content - Expands cleanly in both half and full */}
            <div className="p-4 sm:p-5 space-y-3 flex-1 overflow-y-auto bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
              {/* Time & Date */}
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800">
                <Clock className="w-5 h-5 text-zinc-500 dark:text-zinc-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Date & Time
                  </div>
                  <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
                    {lesson.StartDateTime.format("dddd, D MMMM YYYY")}
                  </div>
                  <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mt-0.5">
                    {lesson.StartDateTime.format("HH:mm")} – {lesson.EndDateTime.format("HH:mm")} ({lesson.EndDateTime.diff(lesson.StartDateTime, "minutes")} mins)
                  </div>
                </div>
              </div>

              {/* Location (Only when NOT broken down into sub-groups) */}
              {!lesson.collapsedLocations && (
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800">
                  <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin className="w-4 h-4 text-current" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                      Room / Venue
                    </div>
                    <div>
                      <RoomBadge location={lesson.Location || "Location to be confirmed"} size="md" />
                    </div>
                  </div>
                </div>
              )}

              {/* Lecturer / Staff (Only when NOT broken down into sub-groups) */}
              {!lesson.collapsedLocations && lesson.staffName && (
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800">
                  <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4 h-4 text-current" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      Lecturer / Instructor
                    </div>
                    <div className="text-sm font-bold text-black dark:text-white mt-0.5">
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
                  <div className="flex items-center justify-center px-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider">
                      <Users className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                      <span>Sub-Groups & Rooms</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {sortedLocations.map((loc) => {
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

                      const groupLabel = loc.calculatedLabel;
                      const isFav = Boolean(
                        favGroup && favGroup.trim().toLowerCase() === groupLabel.trim().toLowerCase()
                      );

                      return (
                        <motion.div
                          layout
                          key={`${loc.originalIdx}-${groupLabel}`}
                          transition={{
                            layout: {
                              type: "spring",
                              stiffness: 350,
                              damping: 28,
                              mass: 0.8,
                            },
                          }}
                          className={`p-3.5 sm:p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 space-y-2.5 transition-colors duration-200 ${
                            isFav
                              ? "ring-1.5 ring-zinc-400 dark:ring-zinc-500 bg-zinc-100 dark:bg-zinc-900/90 relative z-10 shadow-sm"
                              : "relative z-0"
                          }`}
                        >
                          {/* Header: Group Badge + Room Tag & Favourite Heart Button */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1.5 flex-1 min-w-0">
                              <span
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl font-bold text-xs tracking-tight shadow-xs border"
                                style={{
                                  backgroundColor: "#DE838D",
                                  borderColor: "#c96e78",
                                  color: "#ffffff",
                                }}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-white/90" />
                                {groupLabel}
                              </span>

                              {/* Room Specification (e.g. Specialist Computer Lab 5) */}
                              {roomDesc && (
                                <div className="text-xs font-medium text-zinc-700 dark:text-zinc-300 pl-0.5 leading-relaxed">
                                  {roomDesc}
                                </div>
                              )}
                            </div>

                            {/* Right side: Room Tag with Heart Favourite Button under it */}
                            <div className="flex flex-col items-end gap-1.5 shrink-0">
                              <div
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl shadow-xs border text-slate-800 dark:text-sky-100"
                                style={{
                                  backgroundColor: "rgba(155, 183, 212, 0.22)",
                                  borderColor: "rgba(155, 183, 212, 0.5)",
                                }}
                              >
                                <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-600 dark:text-sky-300" />
                                <span className="text-xs font-bold">
                                  {roomCode}
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleToggleFavoriteGroup(groupLabel)}
                                className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer select-none active:scale-90 border ${
                                  isFav
                                    ? "bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border-red-300 dark:border-red-500/50 shadow-xs"
                                    : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-red-500 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                                }`}
                                title={
                                  isFav
                                    ? `Remove ${groupLabel} from favourites`
                                    : `Favourite ${groupLabel}`
                                }
                              >
                                <Heart
                                  className={`w-3.5 h-3.5 transition-transform ${
                                    isFav
                                      ? "fill-red-500 text-red-500 scale-110"
                                      : "text-zinc-400 hover:text-red-500"
                                  }`}
                                />
                                <span className="text-[10px] font-bold">
                                  {isFav ? "Favourited" : "Favourite"}
                                </span>
                              </button>
                            </div>
                          </div>

                          {/* Instructor Line */}
                          {staffFormatted && (
                            <div className="flex items-center gap-2 pt-1 border-t border-zinc-200 dark:border-zinc-800/80 text-xs pl-1">
                              <User className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300 shrink-0" />
                              <span className="font-bold text-black dark:text-white">
                                {staffFormatted}
                              </span>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-4 sm:p-5 bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 flex gap-2.5">
              <Button
                variant="flat"
                onPress={handleExportIcs}
                startContent={<CalendarPlus className="w-4 h-4 text-white dark:text-zinc-200" />}
                className="flex-1 h-11 font-bold text-xs rounded-xl bg-zinc-900 dark:bg-zinc-800 hover:bg-zinc-800 dark:hover:bg-zinc-700 text-white dark:text-zinc-100 border border-zinc-900 dark:border-zinc-700 transition-colors shadow-sm"
              >
                Add to Calendar
              </Button>

              <Button
                variant="flat"
                onPress={handleCopyInfo}
                startContent={copied ? <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />}
                className="h-11 px-4 font-bold text-xs rounded-xl bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-zinc-800 transition-colors shadow-sm"
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
