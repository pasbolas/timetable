import React, { useState, useRef, useEffect, useCallback } from "react";
import { triggerHapticFeedback } from "../services/haptics";

// ── Orb colour palette ──────────────────────────────────────────────────────
const ORB_PALETTE = ["#DE838D","#83B4DE","#83DEB4","#DEC883","#B483DE"];

function hexToRgb(hex: string) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

/** Linear-interpolate between two hex colours, returns an rgb() string */
function lerpColor(a: string, b: string, t: number): string {
  const ca = hexToRgb(a), cb = hexToRgb(b);
  const r  = Math.round(ca.r + (cb.r - ca.r) * t);
  const g  = Math.round(ca.g + (cb.g - ca.g) * t);
  const bl = Math.round(ca.b + (cb.b - ca.b) * t);
  return `rgb(${r},${g},${bl})`;
}

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
      {/* Compute dynamic per-year colours from continuous visualIndex */}
      {(() => {
        // (colours computed inline below in defs via dynamicOrbColors)
        return null;
      })()}

      {/* Complete Unified SVG Dial for Perfect Subpixel Alignment */}
      <svg
        className="absolute inset-0 w-full h-full"
        style={{ overflow: "hidden" }}
      >
        <defs>
          {/* Dynamic per-year orb gradients — recomputed every render from lerpColor */}
          {ORB_PALETTE.map((ownColor, i) => {
            const clampedVI  = Math.max(0, Math.min(ORB_PALETTE.length - 1, visualIndex));
            const fromIdx    = Math.floor(clampedVI);
            const toIdx      = Math.min(ORB_PALETTE.length - 1, fromIdx + 1);
            const frac       = clampedVI - fromIdx;
            const activeBlend = lerpColor(ORB_PALETTE[fromIdx], ORB_PALETTE[toIdx], frac);
            const dist       = Math.abs(i - visualIndex);
            const proximity  = Math.max(0, 1 - dist * 1.2);
            const color      = lerpColor(ownColor, activeBlend, proximity * 0.75);
            return (
              <radialGradient key={i} id={`orbYear${i}`} cx="50%" cy="50%" r="50%" gradientUnits="objectBoundingBox">
                <stop offset="0%"   stopColor={color} stopOpacity="1" />
                <stop offset="100%" stopColor={color} stopOpacity="0" />
              </radialGradient>
            );
          })}
          {/* Mist blur — selected (heavy) */}
          <filter id="mistSelected" x="-80%" y="-80%" width="260%" height="260%" colorInterpolationFilters="sRGB">
            <feGaussianBlur stdDeviation="28" />
          </filter>
          {/* Mist blur — inactive (lighter) */}
          <filter id="mistDim" x="-80%" y="-80%" width="260%" height="260%" colorInterpolationFilters="sRGB">
            <feGaussianBlur stdDeviation="18" />
          </filter>
          {/* Clip orbs to INSIDE of arc only — prevents bleeding onto numbers */}
          <clipPath id="orbInnerClip">
            <path d={`
              M ${pTop.x.toFixed(1)},0
              L 0,0
              L 0,${dimensions.height}
              L ${pBottom.x.toFixed(1)},${dimensions.height}
              L ${pBottom.x.toFixed(1)},${pBottom.y.toFixed(1)}
              A ${radius} ${radius} 0 0,0 ${pTop.x.toFixed(1)},${pTop.y.toFixed(1)}
              Z
            `} />
          </clipPath>
          {/* Clip to SVG canvas */}
          <clipPath id="dialClip">
            <rect x="0" y="0" width={dimensions.width} height={dimensions.height} />
          </clipPath>
        </defs>

        {/* Subtle Arc Path */}
        <path
          d={arcPathData}
          fill="none"
          stroke="currentColor"
          className="text-white"
          strokeWidth="2"
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

          // ── Orb geometry ──────────────────────────────────────────────────────
          const orbRadius  = isSelected ? 110 : 65;
          const orbOpacity = isSelected ? 1 : 0.80;
          const orbCx      = coords.x - 55 * nx;
          const orbCy      = coords.y - 55 * ny;
          const orbGradId  = `orbYear${index % ORB_PALETTE.length}`;

          return (
            <g key={`year-item-${year.yearNumber}`} clipPath="url(#dialClip)">
              {/* Wrap in clip group so clip applies AFTER the blur filter */}
              <g clipPath="url(#orbInnerClip)">
                <circle
                  cx={orbCx} cy={orbCy} r={orbRadius}
                  fill={`url(#${orbGradId})`}
                  filter={isSelected ? "url(#mistSelected)" : "url(#mistDim)"}
                  style={{ opacity: orbOpacity }}
                />
              </g>

              {/* Dot on the Arc for this item */}
              <circle
                cx={coords.x}
                cy={coords.y}
                r={isSelected ? 5 : 2.5}
                className={
                  isSelected
                    ? "fill-white"
                    : "fill-zinc-700"
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
                    ? "font-black fill-white cursor-pointer select-none"
                    : "font-bold fill-zinc-500 hover:fill-white cursor-pointer select-none transition-colors duration-150"
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
          <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-none">
            {activeYear.title}
          </h3>
          {activeYear.subtitle && (
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-bold">
              {activeYear.subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
