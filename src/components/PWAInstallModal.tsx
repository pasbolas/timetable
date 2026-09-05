import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, PlusSquare, MoreHorizontal, Monitor } from "lucide-react";
import { BrowserEnvironment } from "../hooks/usePWAInstall";

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  browserEnv: BrowserEnvironment;
}

interface Step {
  icon: React.ReactNode;
  label: string;
  detail: string;
}

function getInstructions(env: BrowserEnvironment): {
  title: string;
  subtitle: string;
  steps: Step[];
  note?: string;
} {
  // Share icon SVG (reused across iOS steps)
  const ShareIcon = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
  const CheckIcon = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );

  if (env === "ios-safari") {
    return {
      title: "Add to Home Screen",
      subtitle: "Follow these steps in Safari",
      steps: [
        {
          icon: ShareIcon,
          label: "Tap the Share button",
          detail: "Tap the \u25a1\u2191 Share icon in the Safari toolbar at the bottom of your screen.",
        },
        {
          icon: <PlusSquare className="w-5 h-5" />,
          label: "Select \u201cAdd to Home Screen\u201d",
          detail: "Scroll down in the share sheet and tap \u201cAdd to Home Screen\u201d.",
        },
        {
          icon: CheckIcon,
          label: "Tap Add",
          detail: "Confirm by tapping \u201cAdd\u201d in the top-right corner. MyTimetable will appear on your home screen.",
        },
      ],
      note: "Open from your home screen for the full app experience \u2014 no browser chrome, offline support and faster loading.",
    };
  }

  if (env === "ios-other") {
    const GlobeIcon = (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    );
    return {
      title: "Add to Home Screen",
      subtitle: "Best done in Safari on iOS",
      steps: [
        {
          icon: GlobeIcon,
          label: "Open this page in Safari",
          detail: "Copy the URL and paste it into Safari \u2014 the \u201cAdd to Home Screen\u201d option is only available there on iOS.",
        },
        {
          icon: ShareIcon,
          label: "Tap Share \u2192 Add to Home Screen",
          detail: "Use the \u25a1\u2191 Share icon, then tap \u201cAdd to Home Screen\u201d and confirm.",
        },
      ],
      note: "Apple restricts PWA installation to Safari only on iOS devices.",
    };
  }

  if (env === "desktop-safari") {
    return {
      title: "Add to Dock",
      subtitle: "Follow these steps in Safari on macOS",
      steps: [
        {
          icon: ShareIcon,
          label: "Open the File menu",
          detail: "In the Safari menu bar at the top, click \u201cFile\u201d.",
        },
        {
          icon: <Monitor className="w-5 h-5" />,
          label: "Click \u201cAdd to Dock\u2026\u201d",
          detail: "Select \u201cAdd to Dock\u2026\u201d from the dropdown. This option is available in Safari 17+ on macOS Sonoma.",
        },
        {
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ),
          label: "Click Add",
          detail: "Confirm with \u201cAdd\u201d. MyTimetable will appear in your macOS Dock as a standalone app.",
        },
      ],
      note: "Requires macOS Sonoma (14+) and Safari 17+. On older macOS you can bookmark to the Favourites Bar instead.",
    };
  }

  if (env === "desktop-firefox") {
    const HomeIcon = (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    );
    return {
      title: "Install as App",
      subtitle: "Follow these steps in Firefox",
      steps: [
        {
          icon: HomeIcon,
          label: "Look for the install icon",
          detail: "Check the address bar for a small screen/house icon on the right side \u2014 this appears when PWA install is supported.",
        },
        {
          icon: <MoreHorizontal className="w-5 h-5" />,
          label: "Or use the menu",
          detail: "Click the \u2630 menu, then find \u201cInstall Site as App\u201d (available in Firefox 96+ with site manifest support).",
        },
        {
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ),
          label: "Confirm installation",
          detail: "Follow the prompt to add MyTimetable as a standalone desktop app.",
        },
      ],
      note: "For the best PWA experience, Chrome or Edge offer a more seamless install process on desktop.",
    };
  }

  if (env === "android-firefox") {
    return {
      title: "Add to Home Screen",
      subtitle: "Follow these steps in Firefox for Android",
      steps: [
        {
          icon: <MoreHorizontal className="w-5 h-5" />,
          label: "Tap the menu (\u22ee)",
          detail: "Tap the three-dot menu in the top-right corner of Firefox.",
        },
        {
          icon: <PlusSquare className="w-5 h-5" />,
          label: "Tap \u201cAdd to Home Screen\u201d",
          detail: "Find and tap \u201cAdd to Home Screen\u201d in the menu options.",
        },
        {
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ),
          label: "Confirm",
          detail: "Tap \u201cAdd\u201d when prompted. MyTimetable will appear on your Android home screen.",
        },
      ],
    };
  }

  // Fallback / other
  return {
    title: "Add to Home Screen",
    subtitle: "Install MyTimetable for the best experience",
    steps: [
      {
        icon: <MoreHorizontal className="w-5 h-5" />,
        label: "Open your browser menu",
        detail: "Look for the \u22ee or \u00b7\u00b7\u00b7 menu icon in your browser\u2019s toolbar.",
      },
      {
        icon: <PlusSquare className="w-5 h-5" />,
        label: "Find \u201cAdd to Home Screen\u201d or \u201cInstall\u201d",
        detail: "Look for an option labelled \u201cAdd to Home Screen\u201d, \u201cInstall App\u201d, or similar.",
      },
      {
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ),
        label: "Confirm",
        detail: "Follow the prompts to install MyTimetable as a standalone app.",
      },
    ],
    note: "For the best experience, try Chrome on Android or Safari on iOS.",
  };
}

function BrowserBadge({ env }: { env: BrowserEnvironment }) {
  const map: Partial<Record<BrowserEnvironment, { label: string; color: string }>> = {
    "ios-safari": { label: "Safari \u00b7 iOS", color: "#0A84FF" },
    "ios-other": { label: "iOS", color: "#0A84FF" },
    "desktop-safari": { label: "Safari \u00b7 macOS", color: "#0A84FF" },
    "desktop-firefox": { label: "Firefox", color: "#FF7139" },
    "android-firefox": { label: "Firefox \u00b7 Android", color: "#FF7139" },
    "android-other": { label: "Android", color: "#34A853" },
    "desktop-chromium": { label: "Chrome / Edge", color: "#4285F4" },
    other: { label: "Browser", color: "#8B8B8B" },
  };
  const info = map[env] ?? { label: "Browser", color: "#8B8B8B" };
  return (
    <span
      className="text-[10px] font-black px-2 py-0.5 rounded-full border"
      style={{
        color: info.color,
        borderColor: `${info.color}55`,
        backgroundColor: `${info.color}18`,
      }}
    >
      {info.label}
    </span>
  );
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({
  isOpen,
  onClose,
  browserEnv,
}) => {
  const instructions = getInstructions(browserEnv);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-auto select-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md cursor-pointer"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1, transition: { type: "tween", ease: [0.16, 1, 0.3, 1], duration: 0.32 } }}
            exit={{ y: "100%", opacity: 0, transition: { type: "tween", ease: [0.32, 0, 0.67, 0], duration: 0.2 } }}
            className="relative z-10 w-full sm:max-w-sm bg-black rounded-t-3xl sm:rounded-2xl border border-white/20 overflow-hidden flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ambient glow */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full blur-3xl opacity-40"
                style={{ background: "radial-gradient(circle, rgba(59,130,246,0.5) 0%, transparent 70%)" }}
              />
            </div>

            {/* Drag handle */}
            <div className="shrink-0 relative z-10 pt-3.5 pb-1 flex justify-center">
              <div className="w-16 h-1.5 bg-zinc-700 rounded-full" />
            </div>

            {/* Header */}
            <div className="px-5 pt-2 pb-4 border-b border-white/10 relative z-10 flex items-start justify-between gap-3 shrink-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <BrowserBadge env={browserEnv} />
                </div>
                <h2 className="text-lg font-black text-white leading-tight">
                  {instructions.title}
                </h2>
                <p className="text-xs font-medium text-zinc-400 mt-0.5">
                  {instructions.subtitle}
                </p>
              </div>
              <button
                onClick={onClose}
                className="shrink-0 p-1.5 rounded-xl border border-white/20 hover:bg-zinc-900 active:scale-95 transition-all mt-0.5"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Steps */}
            <div className="px-5 pt-4 pb-2 space-y-4 relative z-10">
              {instructions.steps.map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{
                    opacity: 1,
                    x: 0,
                    transition: { delay: 0.1 + i * 0.08, duration: 0.28, ease: "easeOut" },
                  }}
                  className="flex items-start gap-3.5"
                >
                  {/* Icon bubble with step number */}
                  <div className="shrink-0 w-9 h-9 rounded-xl bg-zinc-900 border border-white/15 flex items-center justify-center relative">
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-zinc-700 border border-zinc-600 flex items-center justify-center text-[9px] font-black text-zinc-300 leading-none">
                      {i + 1}
                    </span>
                    <span className="text-white">{step.icon}</span>
                  </div>

                  <div className="min-w-0 pt-1">
                    <div className="text-xs font-black text-white leading-snug">{step.label}</div>
                    <div className="text-[11px] font-medium text-zinc-400 mt-0.5 leading-relaxed">{step.detail}</div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Note */}
            {instructions.note && (
              <div className="mx-5 mb-2 mt-3 p-3 rounded-xl bg-zinc-900/80 border border-white/10 relative z-10">
                <p className="text-[11px] font-medium text-zinc-400 leading-relaxed">
                  <span className="text-zinc-300 font-black">Tip: </span>
                  {instructions.note}
                </p>
              </div>
            )}

            {/* Done button */}
            <div className="px-5 pt-3 pb-7 relative z-10">
              <button
                onClick={onClose}
                className="w-full py-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700 active:scale-98 border border-white/20 text-white text-sm font-black transition-all"
              >
                Got it
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
