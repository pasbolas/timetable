import React, { useState, useEffect, useMemo } from "react";
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
  const moduleKey = lesson ? getLessonModuleKey(lesson) : "";
  const isLab = Boolean(
    lesson?.EventType?.toLowerCase().includes("lab") ||
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
    navigator.clipboard.writeText(text);
    setCopied(true);
    triggerHapticFeedback();
    trackEvent("Copy Lesson Info", {
      module: lesson.Description,
    });
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
            className="fixed inset-0 bg-black/80 backdrop-blur-sm cursor-pointer"
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
            className="relative z-10 w-full sm:max-w-md bg-black text-white rounded-t-3xl sm:rounded-2xl border-2 border-white overflow-hidden flex flex-col touch-pan-y"
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
              <div className="w-12 h-1.5 bg-white group-hover:bg-zinc-300 rounded-full transition-colors" />
            </div>

            {/* Modal Header */}
            <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b-2 border-white flex items-start justify-between gap-3 shrink-0 bg-black">
              <div>
                <div
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider mb-1.5 border ${
                    isLecture
                      ? "lecture-badge text-white border-transparent"
                      : isLab
                      ? "lab-badge text-white border-transparent"
                      : isTutorial
                      ? "tutorial-badge border-transparent"
                      : "bg-white text-black border-white"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isLecture || isLab
                        ? "bg-white"
                        : "bg-black"
                    }`}
                  />
                  {lesson.EventType}
                </div>
                <h2 className="text-base sm:text-lg font-black text-white leading-snug">
                  {lesson.Description}
                </h2>
                <div className="text-[11px] text-zinc-300 font-mono mt-0.5">
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
                  className="w-8 h-8 rounded-xl text-white border border-white hover:bg-zinc-800"
                  title={snapState === "half" ? "Expand to full" : "Collapse to half"}
                >
                  {snapState === "half" ? (
                    <ChevronUp className="w-4 h-4 text-white" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-white" />
                  )}
                </Button>

                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  onPress={onClose}
                  className="w-8 h-8 rounded-xl text-white border border-white hover:bg-zinc-800"
                  title="Close panel"
                >
                  <X className="w-5 h-5 text-white" />
                </Button>
              </div>
            </div>

            {/* Modal Content - Expands cleanly in both half and full */}
            <div className="p-4 sm:p-5 space-y-3.5 flex-1 overflow-y-auto bg-black text-white">
              {/* Time & Date */}
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-black border-2 border-white">
                <Clock className="w-5 h-5 text-white shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                    Date & Time
                  </div>
                  <div className="text-sm font-bold text-white mt-0.5">
                    {lesson.StartDateTime.format("dddd, D MMMM YYYY")}
                  </div>
                  <div className="text-xs font-bold text-white mt-0.5">
                    {lesson.StartDateTime.format("HH:mm")} – {lesson.EndDateTime.format("HH:mm")} ({lesson.EndDateTime.diff(lesson.StartDateTime, "minutes")} mins)
                  </div>
                </div>
              </div>

              {/* Location (Only when NOT broken down into sub-groups) */}
              {!lesson.collapsedLocations && (
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-black border-2 border-white">
                  <div className="w-8 h-8 rounded-xl bg-white text-black flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin className="w-4 h-4 text-black" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
                      Room / Venue
                    </div>
                    <div className="text-sm font-bold text-white mt-0.5">
                      {lesson.Location || "Location to be confirmed"}
                    </div>
                  </div>
                </div>
              )}

              {/* Lecturer / Staff (Only when NOT broken down into sub-groups) */}
              {!lesson.collapsedLocations && lesson.staffName && (
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-black border-2 border-white">
                  <div className="w-8 h-8 rounded-xl bg-white text-black flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4 h-4 text-black" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
                      Lecturer / Instructor
                    </div>
                    <div className="text-sm font-bold text-white mt-0.5">
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
                    <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
                      <Users className="w-4 h-4 text-white" />
                      <span>Sub-Groups & Rooms</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold text-zinc-400 hidden sm:inline">
                        Tap heart to favourite
                      </span>
                      <span className="text-[11px] font-bold text-white bg-black px-2.5 py-0.5 rounded-full border border-white">
                        {lesson.Locations.length} Groups
                      </span>
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
                        <div
                          key={`${loc.originalIdx}-${groupLabel}`}
                          className={`p-3.5 sm:p-4 rounded-xl bg-black border-2 border-white space-y-2.5 transition-all ${
                            isFav ? "ring-2 ring-white bg-zinc-900/90" : ""
                          }`}
                        >
                          {/* Header: Group Badge + Room Tag & Favourite Heart Button */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1.5 flex-1 min-w-0">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white text-black font-bold text-xs tracking-tight border border-white">
                                <span className="w-1.5 h-1.5 rounded-full bg-black" />
                                {groupLabel}
                              </span>

                              {/* Room Specification (e.g. Specialist Computer Lab 5) */}
                              {roomDesc && (
                                <div className="text-xs font-bold text-white pl-0.5 leading-relaxed">
                                  {roomDesc}
                                </div>
                              )}
                            </div>

                            {/* Right side: Room Tag with Heart Favourite Button under it */}
                            <div className="flex flex-col items-end gap-1.5 shrink-0">
                              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black border border-white">
                                <MapPin className="w-3.5 h-3.5 text-white shrink-0" />
                                <span className="text-xs font-black text-white">
                                  {roomCode}
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleToggleFavoriteGroup(groupLabel)}
                                className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer select-none active:scale-90 border ${
                                  isFav
                                    ? "bg-red-950/60 text-red-400 border-red-500 shadow-xs"
                                    : "bg-black text-zinc-400 hover:text-red-400 border-white/30 hover:border-white/60"
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
                            <div className="flex items-center gap-2 pt-1 border-t border-white/30 text-xs text-white pl-1">
                              <User className="w-3.5 h-3.5 text-white shrink-0" />
                              <span className="font-bold text-white">
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
            <div className="p-4 sm:p-5 bg-black border-t-2 border-white flex gap-2.5">
              <Button
                variant="solid"
                onPress={handleExportIcs}
                startContent={<CalendarPlus className="w-4 h-4 text-black" />}
                className="flex-1 h-11 font-bold text-xs rounded-xl bg-white hover:bg-zinc-200 text-black border-2 border-white shadow-sm"
              >
                Add to Calendar
              </Button>

              <Button
                variant="flat"
                onPress={handleCopyInfo}
                startContent={copied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4 text-white" />}
                className="h-11 px-4 font-bold text-xs rounded-xl bg-black text-white hover:bg-zinc-800 border-2 border-white shadow-sm"
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
