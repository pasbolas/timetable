import React from "react";
import { MapPin } from "lucide-react";
import { parseRoomLocation } from "../services/transformer";

interface RoomBadgeProps {
  location?: string;
  size?: "xs" | "sm" | "md";
  className?: string;
  hideDesc?: boolean;
}

export const RoomBadge: React.FC<RoomBadgeProps> = ({
  location,
  size = "sm",
  className = "",
  hideDesc = false,
}) => {
  if (!location) return null;
  const { code, desc } = parseRoomLocation(location);

  const iconSizes = {
    xs: "w-2.5 h-2.5",
    sm: "w-3 h-3",
    md: "w-3.5 h-3.5",
  };

  const tagTextSizes = {
    xs: "text-[9px] px-1 py-0.2",
    sm: "text-[10px] sm:text-[11px] px-1.5 py-0.5",
    md: "text-xs px-2 py-0.5",
  };

  const descTextSizes = {
    xs: "text-[8px]",
    sm: "text-[10px] sm:text-[11px]",
    md: "text-[11px] sm:text-xs",
  };

  return (
    <div
      className={`room-highlight-pill inline-flex items-center gap-1.5 rounded-lg select-none truncate transition-all shadow-xs max-w-full ${className}`}
      title={location}
    >
      <MapPin className={`${iconSizes[size]} shrink-0 stroke-[2.5]`} />
      <span className={`room-code-tag font-black rounded tracking-tight shrink-0 ${tagTextSizes[size]}`}>
        {code}
      </span>
      {!hideDesc && desc && (
        <span className={`room-desc-text font-bold truncate ${descTextSizes[size]}`}>
          {desc}
        </span>
      )}
    </div>
  );
};
