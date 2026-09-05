import React, { useState, useEffect } from "react";
import { Download, X, Smartphone } from "lucide-react";
import { usePWAInstall } from "../hooks/usePWAInstall";

export const PWAInstallPrompt: React.FC = () => {
  const { isInstalled, installApp } = usePWAInstall();
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (isInstalled) {
      setShowPrompt(false);
      return;
    }

    const dismissed = localStorage.getItem("mytimetable_install_dismissed");
    if (!dismissed) {
      setShowPrompt(true);
    }
  }, [isInstalled]);

  const handleInstallClick = async () => {
    const outcome = await installApp();
    if (outcome === "accepted") {
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("mytimetable_install_dismissed", "true");
  };

  if (!showPrompt || isInstalled) return null;

  return (
    <div
      className="fixed left-4 right-4 max-w-md mx-auto z-40 animate-in slide-in-from-bottom-6 duration-300"
      style={{ bottom: "calc(max(env(safe-area-inset-bottom, 0px), 8px) + 5.5rem)" }}
    >
      <div className="p-3.5 rounded-xl bg-zinc-950 border border-white/25 flex items-center justify-between gap-3 shadow-2xl">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-zinc-800 text-white flex items-center justify-center shrink-0 border border-zinc-700">
            <Smartphone className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-black text-white truncate">
              Install MyTimetable
            </div>
            <div className="text-[11px] text-zinc-300 font-medium leading-tight truncate">
              Add to your device for instant offline access
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleInstallClick}
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold active:scale-95 transition-all flex items-center gap-1 cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-black" />
            Install
          </button>
          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
