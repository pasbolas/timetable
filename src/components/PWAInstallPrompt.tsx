import React, { useState, useEffect } from "react";
import { Download, X, Smartphone, Share } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already in standalone mode
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) return;

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Show iOS tip if visited multiple times
    const dismissed = localStorage.getItem("mytimetable_install_dismissed");
    if (isIosDevice && !dismissed) {
      setShowPrompt(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("mytimetable_install_dismissed", "true");
  };

  if (!showPrompt) return null;

  return (
    <div
      className="fixed left-4 right-4 max-w-md mx-auto z-40 animate-in slide-in-from-bottom-6 duration-300"
      style={{ bottom: "calc(max(env(safe-area-inset-bottom, 0px), 8px) + 5.5rem)" }}
    >
      <div className="p-3.5 rounded-xl bg-black border-2 border-white flex items-center justify-between gap-3 shadow-2xl">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-white text-black flex items-center justify-center shrink-0 border border-white">
            <Smartphone className="w-5 h-5 text-black" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-black text-white truncate">
              Install MyTimetable
            </div>
            <div className="text-[11px] text-zinc-300 font-medium leading-tight">
              {isIOS ? (
                <span className="flex items-center gap-1">
                  Tap <Share className="w-3 h-3 inline text-white" /> then &quot;Add to Home Screen&quot;
                </span>
              ) : (
                "Add to your phone for instant offline access"
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {!isIOS && deferredPrompt && (
            <button
              onClick={handleInstallClick}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold border border-white active:scale-95 transition-all flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5 text-black" />
              Install
            </button>
          )}
          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-lg text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
};
