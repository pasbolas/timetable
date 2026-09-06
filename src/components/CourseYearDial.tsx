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

  // Continuous target color calculation from visualIndex
  const activeColorIndex = Math.max(0, Math.min(years.length - 1, visualIndex));
  const fromColorIdx = Math.floor(activeColorIndex);
  const toColorIdx = Math.min(years.length - 1, fromColorIdx + 1);
  const colorFrac = activeColorIndex - fromColorIdx;

  const fromHex = ORB_PALETTE[fromColorIdx % ORB_PALETTE.length];
  const toHex = ORB_PALETTE[toColorIdx % ORB_PALETTE.length];
  const targetRgb = parseColor(lerpColor(fromHex, toHex, colorFrac));

  const [currentRgb, setCurrentRgb] = useState<RGB>(targetRgb);
  const currentRgbRef = useRef<RGB>(targetRgb);
  const colorAnimFrameRef = useRef<number | null>(null);

  // Smooth, gradual color animation loop: blends slowly without jerky shifts
  useEffect(() => {
    const updateColor = () => {
      const cur = currentRgbRef.current;
      const speed = isDraggingRef.current ? 0.08 : 0.055;
      const dr = (targetRgb.r - cur.r) * speed;
      const dg = (targetRgb.g - cur.g) * speed;
      const db = (targetRgb.b - cur.b) * speed;

      if (Math.abs(dr) > 0.1 || Math.abs(dg) > 0.1 || Math.abs(db) > 0.1) {
        const next: RGB = {
          r: cur.r + dr,
          g: cur.g + dg,
          b: cur.b + db,
        };
        currentRgbRef.current = next;
        setCurrentRgb(next);
        colorAnimFrameRef.current = requestAnimationFrame(updateColor);
      } else {
        currentRgbRef.current = targetRgb;
        setCurrentRgb(targetRgb);
      }
    };

    if (colorAnimFrameRef.current) {
      cancelAnimationFrame(colorAnimFrameRef.current);
    }
    colorAnimFrameRef.current = requestAnimationFrame(updateColor);

    return () => {
      if (colorAnimFrameRef.current) {
        cancelAnimationFrame(colorAnimFrameRef.current);
      }
    };
  }, [targetRgb.r, targetRgb.g, targetRgb.b]);

  const animatedColor = `rgb(${Math.round(currentRgb.r)},${Math.round(currentRgb.g)},${Math.round(currentRgb.b)})`;

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
        style={{ overflow: "hidden" }}
      >
        <defs>
          {/* Active Center Glow - slowly morphs colors with smooth animation */}
          <radialGradient id="activeApexGlow" cx="42%" cy="50%" r="60%" gradientUnits="objectBoundingBox">
            <stop offset="0%"   stopColor={animatedColor} stopOpacity="1" style={{ stopColor: animatedColor, stopOpacity: 1 }} />
            <stop offset="35%"  stopColor={animatedColor} stopOpacity="0.95" style={{ stopColor: animatedColor, stopOpacity: 0.95 }} />
            <stop offset="70%"  stopColor={animatedColor} stopOpacity="0.55" style={{ stopColor: animatedColor, stopOpacity: 0.55 }} />
            <stop offset="100%" stopColor={animatedColor} stopOpacity="0" style={{ stopColor: animatedColor, stopOpacity: 0 }} />
          </radialGradient>

          {/* Dynamic per-year orb gradients - each year blends between its own color and the animated color */}
          {ORB_PALETTE.map((ownColor, i) => {
            const dist = Math.abs(i - visualIndex);
            const proximity = Math.max(0, 1 - dist * 1.0);
            const color = lerpColor(ownColor, animatedColor, proximity * 0.75);
            return (
              <radialGradient key={i} id={`orbYear${i}`} cx="50%" cy="50%" r="52%" gradientUnits="objectBoundingBox">
                <stop offset="0%"   stopColor={color} stopOpacity="1" style={{ stopColor: color, stopOpacity: 1 }} />
                <stop offset="45%"  stopColor={color} stopOpacity="0.85" style={{ stopColor: color, stopOpacity: 0.85 }} />
                <stop offset="100%" stopColor={color} stopOpacity="0" style={{ stopColor: color, stopOpacity: 0 }} />
              </radialGradient>
            );
          })}

          {/* Dense core mist blur */}
          <filter id="mistBlur" x="-100%" y="-100%" width="300%" height="300%" colorInterpolationFilters="sRGB">
            <feGaussianBlur stdDeviation="32" />
          </filter>

          {/* Wide atmospheric ambient bloom */}
          <filter id="mistBloom" x="-120%" y="-120%" width="340%" height="340%" colorInterpolationFilters="sRGB">
            <feGaussianBlur stdDeviation="48" />
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

        {/* Ambient Mist & Orbs clipped strictly to the inside of the arc */}
        <g clipPath="url(#dialClip)">
          <g clipPath="url(#orbInnerClip)">
            {/* Layer 1: Wide Atmospheric Bloom for high luminescence */}
            <circle
              cx={apexX - 52}
              cy={centerY}
              r={185}
              fill="url(#activeApexGlow)"
              filter="url(#mistBloom)"
              style={{ opacity: 0.85 }}
            />

            {/* Layer 2: Intense Core Glow */}
            <circle
              cx={apexX - 44}
              cy={centerY}
              r={150}
              fill="url(#activeApexGlow)"
              filter="url(#mistBlur)"
              style={{ opacity: 1 }}
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
                  filter="url(#mistBlur)"
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
