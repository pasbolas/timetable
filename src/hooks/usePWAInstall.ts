import { useState, useEffect, useCallback } from "react";

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface Window {
    __pwaDeferredPrompt?: BeforeInstallPromptEvent | null;
  }
}

export type BrowserEnvironment =
  | "ios-safari"
  | "ios-other"
  | "android-chrome"
  | "android-firefox"
  | "android-other"
  | "desktop-chromium"
  | "desktop-firefox"
  | "desktop-safari"
  | "other";

export function detectBrowserEnvironment(): BrowserEnvironment {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return "other";
  }

  const ua = navigator.userAgent.toLowerCase();
  const isIOS =
    /iphone|ipad|ipod/.test(ua) ||
    (navigator.maxTouchPoints > 1 && /macintosh/.test(ua));
  const isAndroid = /android/.test(ua);

  if (isIOS) {
    const isWebKitSafari = /safari/.test(ua) && !/crios|fxios|edgios|opios/.test(ua);
    return isWebKitSafari ? "ios-safari" : "ios-other";
  }

  if (isAndroid) {
    if (/firefox|fxios/.test(ua)) return "android-firefox";
    if (/chrome|chromium|crios/.test(ua)) return "android-chrome";
    return "android-other";
  }

  // Desktop
  if (/firefox/.test(ua)) return "desktop-firefox";
  if (/safari/.test(ua) && !/chrome|chromium|edg/.test(ua)) return "desktop-safari";
  if (/chrome|chromium|edg|opera|opr|brave/.test(ua)) return "desktop-chromium";

  return "other";
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    () => (typeof window !== "undefined" ? window.__pwaDeferredPrompt || null : null)
  );
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [browserEnv, setBrowserEnv] = useState<BrowserEnvironment>("other");
  const [showInstallGuide, setShowInstallGuide] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check standalone mode across multiple indicators
    const checkInstalled = () => {
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        window.matchMedia("(display-mode: window-controls-overlay)").matches ||
        window.matchMedia("(display-mode: fullscreen)").matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
        document.referrer.includes("android-app://");
      setIsInstalled(Boolean(isStandalone));
    };

    checkInstalled();
    setBrowserEnv(detectBrowserEnvironment());

    // Sync if prompt was already stored early on window
    if (window.__pwaDeferredPrompt && !deferredPrompt) {
      setDeferredPrompt(window.__pwaDeferredPrompt);
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      window.__pwaDeferredPrompt = promptEvent;
      setDeferredPrompt(promptEvent);
    };

    const handleEarlyPromptReady = () => {
      if (window.__pwaDeferredPrompt) {
        setDeferredPrompt(window.__pwaDeferredPrompt);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      window.__pwaDeferredPrompt = null;
      setDeferredPrompt(null);
      setShowInstallGuide(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("pwa-prompt-available", handleEarlyPromptReady);
    window.addEventListener("appinstalled", handleAppInstalled);
    window.addEventListener("pwa-installed-event", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("pwa-prompt-available", handleEarlyPromptReady);
      window.removeEventListener("appinstalled", handleAppInstalled);
      window.removeEventListener("pwa-installed-event", handleAppInstalled);
    };
  }, [deferredPrompt]);

  const canPromptNatively = Boolean(
    deferredPrompt || (typeof window !== "undefined" && window.__pwaDeferredPrompt)
  );

  const installApp = useCallback(async () => {
    const promptEvent =
      deferredPrompt || (typeof window !== "undefined" ? window.__pwaDeferredPrompt : null);

    // 1. If native beforeinstallprompt is ready (Chromium on Android / Desktop / Edge / Brave / Samsung)
    if (promptEvent) {
      try {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice.outcome === "accepted") {
          setIsInstalled(true);
        }
        window.__pwaDeferredPrompt = null;
        setDeferredPrompt(null);
        return choice.outcome;
      } catch (err) {
        console.warn("Native PWA prompt error:", err);
      }
    }

    // 2. Fallback: on iOS Safari or when native prompt is unavailable, show browser-specific guidance
    setShowInstallGuide(true);
    return "guide";
  }, [deferredPrompt]);

  return {
    isInstalled,
    canPromptNatively,
    browserEnv,
    isIOS: browserEnv === "ios-safari" || browserEnv === "ios-other",
    installApp,
    showInstallGuide,
    setShowInstallGuide,
  };
}
