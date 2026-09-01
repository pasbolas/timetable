# Architecture & Custom Hooks

This document details the React component architecture, state management patterns, custom hooks, storage persistence, and asynchronous request abort patterns.

---

## 1. Application Component Hierarchy

```text
App.jsx (Router)
└── TimetablePage.jsx
    ├── Header.jsx (Desktop Only)
    │   ├── Search.jsx
    │   │   ├── SearchBar.jsx
    │   │   └── SearchResults.jsx
    │   └── ThemeToggle.jsx
    ├── Main.jsx
    │   ├── [If Desktop] DesktopTimetable.jsx
    │   │   ├── DesktopTableTopBar.jsx
    │   │   └── DesktopTableMain.jsx
    │   │       ├── DesktopTableWeekdays.jsx
    │   │       ├── DesktopTableTimes.jsx
    │   │       └── DesktopTableLessons.jsx
    │   │           ├── DesktopTimeLine.jsx
    │   │           ├── DesktopLessonsLines.jsx
    │   │           └── DesktopTableDay.jsx
    │   │               └── DesktopLessonsContainer.jsx
    │   │                   └── DesktopLessonsContainerColumn.jsx
    │   │                       └── DesktopLesson.jsx
    │   └── [If Mobile] MobileTimetable.jsx
    │       ├── MobileTopBar.jsx
    │       │   ├── LeftOverlayTab.jsx (Settings, Search, Nav)
    │       │   └── Search.jsx
    │       ├── MobileWeekStrip.jsx (5-week pill strip)
    │       └── MobileDayTimeline.jsx
    │           ├── MobileLessonCard.jsx
    │           └── MobileBreakCard.jsx
    └── Footer.jsx (Desktop Only)
```

---

## 2. Custom Hooks Reference

### 2.1 `useGetLessons` (`src/customHooks/useGetLessons.js`)
Handles fetching and updating the timetable data for the currently active program and displayed week.

#### Signature:
```javascript
const { lessons, isPending, error, reload } = useGetLessons(
    selectedProgram,
    displayedWeekStart,
    isMobile,
    setClearLessonsContext
);
```

#### Lifecycle & Behavior:
- Automatically attaches an `AbortController`. If the user navigates weeks rapidly or searches for another program, previous in-flight requests are immediately cancelled.
- Calls `organizeLessons()` and `addEmptyDays()` upon successful JSON response.
- Exposes a `reload()` callback to re-fetch on network recovery or retry button click.

---

### 2.2 `useSelectedProgram` (`src/customHooks/useSelectedProgram.js`)
Manages the user's active program selection and handles persistent local storage.

#### Signature:
```javascript
const [selectedProgram, changeProgram] = useSelectedProgram(clearLessonsContext, toToday);
```

#### Key Logic:
- Reads initial state from `localStorage.getItem("selectedProgram")`.
- When updating via `changeProgram(newProgram)`:
  1. Updates React state.
  2. Syncs to `localStorage.setItem("selectedProgram", JSON.stringify(newProgram))`.
  3. Triggers `clearLessons()` to flush stale schedule items immediately.
  4. Resets displayed date to current week (`toToday()`).

---

### 2.3 `useTheme` (`src/customHooks/useTheme.js`)
Controls dark and light mode themes across the document root.

#### Signature:
```javascript
const { theme, toggleTheme, setTheme } = useTheme();
```

#### Behavior:
- Checks `localStorage.getItem("theme")`.
- If unset, queries `window.matchMedia("(prefers-color-scheme: dark)")` for system preference.
- Appends `data-theme="dark"` or `data-theme="light"` to the `<html>` document element.

---

### 2.4 `useIsMobile` (`src/customHooks/useIsMobile.js`)
Listens to viewport dimension changes and toggles mobile layout mode.

```javascript
export const useIsMobile = (clearLessonsContext, toToday) => {
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    return isMobile;
};
```

---

## 3. Concurrency & Race-Condition Handling

Both `Search.jsx` and `useGetLessons.js` implement instance-level `AbortController` instances stored in `useRef`:

```javascript
const fetchingRef = useRef({});

// Inside fetch callback:
if (fetchingRef.current.controller) {
    fetchingRef.current.controller.abort();
}

const controller = new AbortController();
fetchingRef.current.controller = controller;

fetch(url, { ...options, signal: controller.signal })
    .then(res => res.json())
    .then(data => setData(data))
    .catch(err => {
        if (err.name === "AbortError") return; // Silently ignore cancelled requests
        setError(err);
    });
```
