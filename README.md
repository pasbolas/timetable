# MyTimetable PWA 📱📅

A mobile-first Progressive Web Application (PWA) built with **React**, **TypeScript**, **Tailwind CSS**, and **Vite** for university timetable schedules, powered by the **Scientia EU Timetabler API**.

---

## 🚀 Features

- 📱 **Mobile-First PWA Experience**: Add to Home Screen on iOS and Android with offline service worker support and app icon.
- 🔍 **Live Program Search**: Instant autocomplete search for degree programs and course codes (e.g. `TU856`).
- ⚡ **Auto Lab & Group Collapsing**: Concurrent lab/tutorial sessions (Group A, Group B) are cleanly aggregated into a single card with individual room assignments.
- 📆 **5-Week Horizontal Date Strip**: Seamlessly scroll through 35 days with lesson indicators and today badge.
- ⏰ **Live Time Indicator**: Real-time European/Dublin clock indicator updating every 15s with live lesson status.
- ☕ **Smart Break Detection**: Automatically detects free periods (> 6 mins) between classes.
- 🎨 **Pastel Theming**: Semantic color coding for Lectures, Labs, Tutorials, Studios, and Clinicals in both Dark and Light modes.
- 📥 **iCalendar (.ics) Export**: Export any lecture or lab directly into Apple Calendar, Google Calendar, or Outlook.
- 💾 **Offline Storage & Caching**: LocalStorage fallback and Service Worker caching for instant offline schedule loading.

---

## 🛠️ Quick Start

### 1. Run Development Server
To run locally on your computer:
```bash
npm run dev
```

### 2. Access on your Phone (Same Wi-Fi)
To test and install the PWA directly on your phone, launch Vite with the `--host` flag:
```bash
npm run dev -- --host
```
Open the network URL shown in your terminal (e.g. `http://192.168.x.x:5173`) on your phone's browser (Safari for iOS or Chrome for Android).

### 3. Install on your Phone Home Screen
- **iOS (Safari)**: Tap the **Share** button (box with upward arrow) $\rightarrow$ select **"Add to Home Screen"**.
- **Android (Chrome)**: Tap the **Install** banner or the 3-dot menu $\rightarrow$ select **"Install app"** / **"Add to Home screen"**.

### 4. Production Build
```bash
npm run build
npm run preview
```

---

## 📂 Project Structure

- [`src/config/timetableConfig.ts`](file:///C:/Users/Akshat%20Pasbola/Desktop/myTimetable/src/config/timetableConfig.ts): API endpoints, GUIDs, and Dublin timezone settings.
- [`src/services/apiClient.ts`](file:///C:/Users/Akshat%20Pasbola/Desktop/myTimetable/src/services/apiClient.ts): Standalone API client for Scientia EU v4 backend.
- [`src/services/transformer.ts`](file:///C:/Users/Akshat%20Pasbola/Desktop/myTimetable/src/services/transformer.ts): Heuristic parsers, lab collapsing, typo sanitization, and ISO week bucketing.
- [`src/services/storage.ts`](file:///C:/Users/Akshat%20Pasbola/Desktop/myTimetable/src/services/storage.ts): Persistent localStorage cache and search history.
- [`src/services/icalExport.ts`](file:///C:/Users/Akshat%20Pasbola/Desktop/myTimetable/src/services/icalExport.ts): Calendar export generator.
- [`src/hooks/useGetLessons.ts`](file:///C:/Users/Akshat%20Pasbola/Desktop/myTimetable/src/hooks/useGetLessons.ts): Data fetching with AbortController and offline fallback.
- [`src/hooks/useLiveTime.ts`](file:///C:/Users/Akshat%20Pasbola/Desktop/myTimetable/src/hooks/useLiveTime.ts): Real-time live clock and active lesson tracker.
- [`src/components/`](file:///C:/Users/Akshat%20Pasbola/Desktop/myTimetable/src/components/): Mobile UI components (TopBar, WeekDateStrip, DayTimeline, LessonCard, BreakCard, SearchModal, LessonDetailModal, PWAInstallPrompt).
