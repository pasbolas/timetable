import React from "react";

export const AmbientBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10 select-none">
      {/* Subtle dispersed floating pink and blue balls */}
      {/* Top Left Pink Ball */}
      <div
        className="absolute -top-20 -left-20 w-80 h-80 sm:w-[380px] sm:h-[380px] rounded-full bg-pink-400/25 blur-3xl animate-float-1"
        aria-hidden="true"
      />

      {/* Top Right Blue Ball */}
      <div
        className="absolute top-10 -right-24 w-88 h-88 sm:w-[420px] sm:h-[420px] rounded-full bg-blue-400/25 blur-3xl animate-float-2"
        aria-hidden="true"
      />

      {/* Center Dispersed Soft Pink Ball */}
      <div
        className="absolute top-1/2 left-1/4 -translate-y-1/2 w-72 h-72 sm:w-80 sm:h-80 rounded-full bg-pink-300/20 blur-3xl animate-float-3"
        aria-hidden="true"
      />

      {/* Mid Right Sky Blue Ball */}
      <div
        className="absolute top-2/3 -right-16 w-80 h-80 sm:w-96 sm:h-96 rounded-full bg-sky-400/20 blur-3xl animate-float-4"
        aria-hidden="true"
      />

      {/* Bottom Left Soft Pink Ball */}
      <div
        className="absolute -bottom-20 -left-16 w-80 h-80 sm:w-[380px] sm:h-[380px] rounded-full bg-rose-300/20 blur-3xl animate-float-2"
        aria-hidden="true"
      />

      {/* Bottom Center Blue Ball */}
      <div
        className="absolute -bottom-16 left-1/2 -translate-x-1/2 w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-blue-300/20 blur-3xl animate-float-1"
        aria-hidden="true"
      />

      {/* Uniform Dot Grid Pattern Layer */}
      <div className="absolute inset-0 bg-dot-grid opacity-85" aria-hidden="true" />
    </div>
  );
};
