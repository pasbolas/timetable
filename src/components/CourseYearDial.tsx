import React, { useState, useRef, useEffect, useCallback } from "react";
import { triggerHapticFeedback } from "../services/haptics";

export interface YearOption {
  yearNumber: number; // e.g. 1, 2, 3, 4, 5
  yearCode: string;   // e.g. "01", "02", "03", "04", "05"
  title: string;      // e.g. "Year 3", "3rd Year", "Final Year"
  subtitle?: string;   // e.g. "Full-Time Grangegorman • 4 modules"
  programIdentity?: string;
  rawData?: any;
}

interface CourseYearDialProps {
  years: YearOption[];
  selectedYear: number;
  onSelectYear: (yearNumber: number) => void;
  className?: string;
}

export const CourseYearDial: React.FC<CourseYearDialProps> = ({
  years,
  selectedYear,
  onSelectYear,
  className = "",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 380, height: 480 });

  const selectedIndex = Math.max(
    0,
    years.findIndex((y) => y.yearNumber === selectedYear)
  );

  const [visualIndex, setVisualIndex] = useState(selectedIndex >= 0 ? selectedIndex : 0);
  const isDraggingRef = useRef(false);
  const dragStartYRef = useRef(0);
  const dragStartIndexRef = useRef(visualIndex);
  const lastHapticIndexRef = useRef(selectedIndex);
  const animationFrameRef = useRef<number | null>(null);

  // Sync visual index when selectedYear prop changes from outside
  useEffect(() => {
    const idx = years.findIndex((y) => y.yearNumber === selectedYear);
    if (idx >= 0 && !isDraggingRef.current) {
      setVisualIndex(idx);
      lastHapticIndexRef.current = idx;
    }
  }, [selectedYear, years]);

  // Update container dimensions on mount and resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: rect.width || 380,
          height: rect.height || 480,
        });
      }
    };
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // Geometry parameters
  // Apex of the circle curve is placed on the left side
  const apexX = Math.min(130, Math.max(90, dimensions.width * 0.28));
  const radius = Math.max(260, Math.min(360, dimensions.height * 0.68));
  const centerX = apexX - radius;
  const centerY = dimensions.height / 2;

  // Angular spacing between items (in radians)
  const angleStep = 0.26; // ~15 degrees per item

  // Convert an index to angle relative to center (0 rad = apex at centerY)
  const getAngleForIndex = useCallback(
    (index: number, currentVisual: number) => {
      return (index - currentVisual) * angleStep;
    },
    [angleStep]
  );

  // Convert angle to (x, y) coordinates along the arc
  const getArcCoords = useCallback(
    (angle: number) => {
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      return { x, y };
    },
    [centerX, centerY, radius]
  );

  // Generate SVG arc path that gracefully covers the height
  const maxArcAngle = 0.95; // ~54 degrees up and down
  const pTop = getArcCoords(-maxArcAngle);
  const pBottom = getArcCoords(maxArcAngle);

  // SVG Arc: A rx ry x-axis-rotation large-arc-flag sweep-flag x y
  const arcPathData = `M ${pTop.x.toFixed(1)},${pTop.y.toFixed(1)} A ${radius} ${radius} 0 0,1 ${pBottom.x.toFixed(1)},${pBottom.y.toFixed(1)}`;

  // Snap to nearest integer index with smooth physics
  const snapTo = useCallback(
    (targetIndex: number) => {
      const clamped = Math.max(0, Math.min(years.length - 1, Math.round(targetIndex)));
      const start = visualIndex;
      const startTime = performance.now();
      const duration = 240; // ms

      const animate = (time: number) => {
        const elapsed = time - startTime;
        const progress = Math.min(1, elapsed / duration);
        // easeOutCubic
        const ease = 1 - Math.pow(1 - progress, 3);
        const current = start + (clamped - start) * ease;
        setVisualIndex(current);

        const currentNearest = Math.round(current);
        if (currentNearest !== lastHapticIndexRef.current && currentNearest >= 0 && currentNearest < years.length) {
          lastHapticIndexRef.current = currentNearest;
          triggerHapticFeedback();
        }

        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          setVisualIndex(clamped);
          onSelectYear(years[clamped].yearNumber);
        }
      };

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      animationFrameRef.current = requestAnimationFrame(animate);
    },
    [visualIndex, years, onSelectYear]
  );

  // Pointer drag handling
  const handlePointerDown = (e: React.PointerEvent) => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    isDraggingRef.current = true;
    dragStartYRef.current = e.clientY;
    dragStartIndexRef.current = visualIndex;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const deltaY = e.clientY - dragStartYRef.current;
    const indexDelta = -deltaY / 65;
    const newVisual = dragStartIndexRef.current + indexDelta;
    const min = -0.4;
    const max = years.length - 0.6;
    const clamped = Math.max(min, Math.min(max, newVisual));
    setVisualIndex(clamped);

    const nearest = Math.round(clamped);
    if (nearest !== lastHapticIndexRef.current && nearest >= 0 && nearest < years.length) {
      lastHapticIndexRef.current = nearest;
      triggerHapticFeedback();
    }
  };

  const handlePointerUp = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    snapTo(visualIndex);
  };

  // Wheel handling
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 1 : -1;
    const target = Math.max(0, Math.min(years.length - 1, Math.round(visualIndex) + delta));
    snapTo(target);
  };

  // Active item coordinates (follows continuous drag or rests at apex)
  const activeIndex = Math.max(0, Math.min(years.length - 1, Math.round(visualIndex)));
  const activeYear = years[activeIndex] || years[0];
  const activeAngle = getAngleForIndex(activeIndex, visualIndex);
  const activeCoords = getArcCoords(activeAngle);

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
      className={`relative w-full h-full select-none touch-none overflow-hidden flex items-center ${className}`}
      style={{ minHeight: "380px" }}
    >
      {/* Complete Unified SVG Dial for Perfect Subpixel Alignment */}
      <svg
        className="absolute inset-0 w-full h-full"
        style={{ overflow: "visible" }}
      >
        {/* Subtle Arc Path */}
        <path
          d={arcPathData}
          fill="none"
          stroke="currentColor"
          className="text-slate-300/80 dark:text-slate-700/80"
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* All Items: Dot on Arc + Number Outside the Circle Next to the Dot */}
        {years.map((year, index) => {
          const angle = getAngleForIndex(index, visualIndex);
          const isVisible = Math.abs(angle) <= maxArcAngle + 0.15;
          if (!isVisible) return null;

          const coords = getArcCoords(angle);
          const distanceToActive = Math.abs(index - visualIndex);
          const isSelected = distanceToActive < 0.48;

          // Tangent tilt angle in degrees: aligns with the arc slope
          const rotationDeg = (angle * 180) / Math.PI * 0.7;

          // Outward radial normal vector
          const nx = Math.cos(angle);
          const ny = Math.sin(angle);

          // Gap from the dot on the circle to the number
          const gap = isSelected ? 24 : 18;
          const textX = coords.x + gap * nx;
          const textY = coords.y + gap * ny;

          const opacity = isSelected ? 1 : Math.max(0.18, 1 - distanceToActive * 0.38);

          return (
            <g key={`year-item-${year.yearNumber}`}>
              {/* Dot on the Arc for this item */}
              <circle
                cx={coords.x}
                cy={coords.y}
                r={isSelected ? 4.5 : 2.5}
                className={
                  isSelected
                    ? "fill-slate-900 dark:fill-white shadow-sm"
                    : "fill-slate-300 dark:fill-slate-700"
                }
              />

              {/* Number Sitting OUTSIDE the Circle Next to the Dot */}
              <text
                x={textX}
                y={textY}
                textAnchor="start"
                dominantBaseline="central"
                alignmentBaseline="central"
                transform={`rotate(${rotationDeg.toFixed(1)}, ${textX.toFixed(1)}, ${textY.toFixed(1)})`}
                onClick={(e) => {
                  e.stopPropagation();
                  snapTo(index);
                }}
                className={
                  isSelected
                    ? "font-black fill-slate-900 dark:fill-white cursor-pointer select-none"
                    : "font-bold fill-slate-400/80 hover:fill-slate-600 dark:fill-slate-600 dark:hover:fill-slate-400 cursor-pointer select-none transition-colors duration-150"
                }
                style={{
                  fontSize: isSelected ? "4.25rem" : "2.5rem",
                  fontWeight: isSelected ? 900 : 700,
                  fontVariantNumeric: "slashed-zero tabular-nums",
                  letterSpacing: isSelected ? "-0.04em" : "-0.02em",
                  opacity,
                }}
              >
                {year.yearCode}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Right-Hand Text Info: Dead-Center Aligned to the Active Item at activeCoords.y */}
      <div
        className="absolute z-30 pointer-events-none transition-all duration-150"
        style={{
          left: `${activeCoords.x + 148}px`,
          top: `${activeCoords.y}px`,
          transform: "translateY(-50%)",
          maxWidth: `calc(100% - ${activeCoords.x + 165}px)`,
        }}
      >
        <div className="space-y-1 animate-in fade-in slide-in-from-left-2 duration-150" key={activeYear.yearNumber}>
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
            {activeYear.title}
          </h3>
          {activeYear.subtitle && (
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              {activeYear.subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
