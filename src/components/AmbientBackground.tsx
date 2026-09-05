import React from "react";

export const AmbientBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[1] select-none ambient-background-layer">
      {/* Subtle dispersed floating pink and blue balls */}
      {/* Top Left Pink Ball */}
      <div
        className="absolute -top-16 -left-16 w-80 h-80 sm:w-[400px] sm:h-[400px] rounded-full bg-pink-400/30 blur-2xl animate-float-1"
        aria-hidden="true"
      />

      {/* Top Right Blue Ball */}
      <div
        className="absolute top-12 -right-20 w-88 h-88 sm:w-[440px] sm:h-[440px] rounded-full bg-blue-400/30 blur-2xl animate-float-2"
        aria-hidden="true"
      />

      {/* Center Dispersed Soft Pink Ball */}
      <div
        className="absolute top-1/2 left-1/4 -translate-y-1/2 w-72 h-72 sm:w-88 sm:h-88 rounded-full bg-pink-400/25 blur-3xl animate-float-3"
        aria-hidden="true"
      />

      {/* Mid Right Sky Blue Ball */}
      <div
        className="absolute top-2/3 -right-12 w-80 h-80 sm:w-96 sm:h-96 rounded-full bg-sky-400/28 blur-2xl animate-float-4"
        aria-hidden="true"
      />

      {/* Bottom Left Soft Pink Ball */}
      <div
        className="absolute -bottom-16 -left-12 w-80 h-80 sm:w-[400px] sm:h-[400px] rounded-full bg-rose-400/25 blur-3xl animate-float-2"
        aria-hidden="true"
      />

      {/* Bottom Center Blue Ball */}
      <div
        className="absolute -bottom-14 left-1/2 -translate-x-1/2 w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-blue-400/25 blur-2xl animate-float-1"
        aria-hidden="true"
      />

      {/* Uniform Dot Grid Pattern Layer */}
      <div className="absolute inset-0 bg-dot-grid" aria-hidden="true" />
    </div>
  );
};
