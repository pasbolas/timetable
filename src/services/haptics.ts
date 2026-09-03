/**
 * Universal Mobile Haptic Feedback Utility
 * Supports Android Vibration API and iOS 17.4+ native Taptic Engine switch feedback
 */

export function triggerHapticFeedback(): void {
  // 1. Android & standard Web Vibration API
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    try {
      navigator.vibrate(12);
    } catch {
      // Ignore vibration failures if device disallows
    }
  }

  // 2. iOS Taptic Engine selection feedback via native switch element
  if (typeof document !== "undefined") {
    try {
      let hapticEl = document.getElementById("haptic-switch-trigger") as HTMLInputElement | null;
      if (!hapticEl) {
        const label = document.createElement("label");
        label.style.position = "fixed";
        label.style.left = "-9999px";
        label.style.top = "-9999px";
        label.style.width = "0";
        label.style.height = "0";
        label.style.opacity = "0";
        label.style.pointerEvents = "none";
        label.setAttribute("aria-hidden", "true");

        hapticEl = document.createElement("input");
        hapticEl.id = "haptic-switch-trigger";
        hapticEl.type = "checkbox";
        hapticEl.setAttribute("switch", "");
        label.appendChild(hapticEl);
        document.body.appendChild(label);
      }
      hapticEl.click();
    } catch {
      // Ignore if unsupported
    }
  }
}
