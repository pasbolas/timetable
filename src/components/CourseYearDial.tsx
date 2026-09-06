import React, { useState, useRef, useEffect, useCallback } from "react";
import { triggerHapticFeedback } from "../services/haptics";

// ── Orb colour palette ──────────────────────────────────────────────────────
const ORB_PALETTE = ["#DE838D", "#3B82F6", "#10B981", "#F59E0B", "#8B5CF6"];

interface RGB {
  r: number;
  g: number;
  b: number;
}

function parseColor(c: string): RGB {
  if (typeof c !== "string") return { r: 222, g: 131, b: 141 };
  const trimmed = c.trim();
  if (trimmed.startsWith("#")) {
    const hex = trimmed.replace("#", "");
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16) || 0,
        g: parseInt(hex[1] + hex[1], 16) || 0,
        b: parseInt(hex[2] + hex[2], 16) || 0,
      };
    }
    return {
      r: parseInt(hex.slice(0, 2), 16) || 0,
      g: parseInt(hex.slice(2, 4), 16) || 0,
      b: parseInt(hex.slice(4, 6), 16) || 0,
    };
  }
  const match = trimmed.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (match) {
    return {
      r: parseInt(match[1], 10) || 0,
      g: parseInt(match[2], 10) || 0,
      b: parseInt(match[3], 10) || 0,
    };
  }
  return { r: 222, g: 131, b: 141 };
}

/** Linear-interpolate between two colours (hex or rgb), returns an rgb() string */
function lerpColor(a: string, b: string, t: number): string {
  const ca = parseColor(a), cb = parseColor(b);
  const clampedT = Math.max(0, Math.min(1, isNaN(t) ? 0 : t));
  const r  = Math.round(ca.r + (cb.r - ca.r) * clampedT);
  const g  = Math.round(ca.g + (cb.g - ca.g) * clampedT);
  const bl = Math.round(ca.b + (cb.b - ca.b) * clampedT);
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
      const duration = 380; // ms for a graceful, weighted glide

      const animate = (time: number) => {
        const elapsed = time - startTime;
        const progress = Math.min(1, elapsed / duration);
        // Smooth easeOutQuart: 1 - (1 - progress)^4
        const ease = 1 - Math.pow(1 - progress, 4);
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

  // Continuous target color calculation directly from visualIndex (0ms latency, 0 extra re-renders)
  const activeColorIndex = Math.max(0, Math.min(years.length - 1, visualIndex));
  const fromColorIdx = Math.floor(activeColorIndex);
  const toColorIdx = Math.min(years.length - 1, fromColorIdx + 1);
  const colorFrac = activeColorIndex - fromColorIdx;

  const fromHex = ORB_PALETTE[fromColorIdx % ORB_PALETTE.length];
  const toHex = ORB_PALETTE[toColorIdx % ORB_PALETTE.length];
  const animatedColor = lerpColor(fromHex, toHex, colorFrac);

  // Clean up any ongoing snap animation when component unmounts
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

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
      {/* High-performance GPU-composited ambient backdrop glow */}
      <div
        className="absolute pointer-events-none rounded-full"
        style={{
          left: `${apexX - 160}px`,
          top: `${centerY - 160}px`,
          width: "320px",
          height: "320px",
          background: `radial-gradient(circle, ${animatedColor} 0%, rgba(0,0,0,0) 70%)`,
          opacity: 0.45,
          filter: "blur(36px)",
          transform: "translate3d(0, 0, 0)",
          willChange: "background",
        }}
        aria-hidden="true"
      />

      {/* Complete Unified SVG Dial for Perfect Subpixel Alignment */}
      <svg
        className="absolute inset-0 w-full h-full"
        style={{ overflow: "hidden" }}
      >
        <defs>
          {/* Active Center Glow - smooth multi-stop gradient with natural quadratic falloff */}
          <radialGradient id="activeApexGlow" cx="45%" cy="50%" r="55%" gradientUnits="objectBoundingBox">
            <stop offset="0%" stopColor={animatedColor} stopOpacity="0.85" />
            <stop offset="30%" stopColor={animatedColor} stopOpacity="0.55" />
            <stop offset="60%" stopColor={animatedColor} stopOpacity="0.2" />
            <stop offset="85%" stopColor={animatedColor} stopOpacity="0.04" />
            <stop offset="100%" stopColor={animatedColor} stopOpacity="0" />
          </radialGradient>

          {/* Static per-year orb gradients - multi-stop falloff replaces heavy feGaussianBlur */}
          {ORB_PALETTE.map((paletteColor, i) => (
            <radialGradient key={i} id={`orbYear${i}`} cx="50%" cy="50%" r="50%" gradientUnits="objectBoundingBox">
              <stop offset="0%" stopColor={paletteColor} stopOpacity="0.85" />
              <stop offset="30%" stopColor={paletteColor} stopOpacity="0.55" />
              <stop offset="65%" stopColor={paletteColor} stopOpacity="0.2" />
              <stop offset="85%" stopColor={paletteColor} stopOpacity="0.04" />
              <stop offset="100%" stopColor={paletteColor} stopOpacity="0" />
            </radialGradient>
          ))}

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

        {/* Ambient Mist & Orbs clipped strictly to the inside of the arc */}
        <g clipPath="url(#dialClip)">
          <g clipPath="url(#orbInnerClip)">
            {/* Layer 1: Wide Atmospheric Bloom */}
            <circle
              cx={apexX - 52}
              cy={centerY}
              r={185}
              fill="url(#activeApexGlow)"
              style={{ opacity: 0.7 }}
            />

            {/* Layer 2: Intense Core Glow */}
            <circle
              cx={apexX - 44}
              cy={centerY}
              r={140}
              fill="url(#activeApexGlow)"
              style={{ opacity: 0.95 }}
            />

            {/* Layer 3: Individual Year Orbs along the arc curve */}
            {years.map((year, index) => {
              const angle = getAngleForIndex(index, visualIndex);
              const isVisible = Math.abs(angle) <= maxArcAngle + 0.15;
              if (!isVisible) return null;

              const coords = getArcCoords(angle);
              const distFromActive = Math.abs(index - visualIndex);
              const nx = Math.cos(angle);
              const ny = Math.sin(angle);

              // Smooth continuous sizing with higher base presence
              const factor = Math.max(0, 1 - Math.min(1, distFromActive / 1.5));
              const smoothFactor = factor * factor * (3 - 2 * factor);
              const orbRadius = 70 + 65 * smoothFactor;
              const orbOpacity = 0.55 + 0.45 * smoothFactor;

              const orbCx = coords.x - 52 * nx;
              const orbCy = coords.y - 52 * ny;
              const orbGradId = `orbYear${index % ORB_PALETTE.length}`;

              return (
                <circle
                  key={`orb-node-${year.yearNumber}`}
                  cx={orbCx}
                  cy={orbCy}
                  r={orbRadius}
                  fill={`url(#${orbGradId})`}
                  style={{ opacity: orbOpacity }}
                />
              );
            })}
          </g>
        </g>

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

          return (
            <g key={`year-item-${year.yearNumber}`} clipPath="url(#dialClip)">
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
