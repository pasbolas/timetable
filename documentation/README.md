# Timetable Architecture & API Documentation

Welcome to the technical documentation for the **Timetable** application. This folder provides in-depth specifications, API endpoints, heuristic parsing pipelines, layout engines, and a starter guide to assist in building new projects or extensions using these APIs and display systems.

---

## 📚 Documentation Index

| Document | Description |
|---|---|
| 📡 [**API Reference**](file:///c:/Users/Akshat%20Pasbola/Desktop/timetable/documentation/api-reference.md) | Full endpoint details, headers, query params, POST request bodies, and JSON response models for the Scientia EU Timetabling backend (Search & Events APIs). |
| ⚙️ [**Data Processing Pipeline**](file:///c:/Users/Akshat%20Pasbola/Desktop/timetable/documentation/data-processing-pipeline.md) | Field extraction, timezone conversion, event type & short-name inference heuristics, typo corrections, lab-group collapsing, and ISO week day bucketing. |
| 🎨 [**Display & Layout Framework**](file:///c:/Users/Akshat%20Pasbola/Desktop/timetable/documentation/display-and-layout-framework.md) | Dual-mode visual architecture: Desktop multi-column greedy bin-packing grid vs. Mobile dynamic day timeline with break cards, live time indicator, and 5-week date strip. |
| 🧩 [**Architecture & Custom Hooks**](file:///c:/Users/Akshat%20Pasbola/Desktop/timetable/documentation/architecture-and-hooks.md) | React component tree, lifecycle hooks (`useGetLessons`, `useSelectedProgram`, `useFetch`, `useIsMobile`, `useTheme`), storage persistence, and request cancellation patterns. |
| 🚀 [**New Project Starter Guide**](file:///c:/Users/Akshat%20Pasbola/Desktop/timetable/documentation/new-project-starter-guide.md) | Quick-start guide with ready-to-use TypeScript API client, transformer modules, and minimal React component for new projects. |

---

## ⚡ Quick API Summary

### Search Endpoint:
- **URL**: `POST https://scientia-eu-v4-api-d4-01.azurewebsites.net/api/Public/CategoryTypes/241e4d36-93f2-4938-9e15-d4536fe3b2eb/Categories/FilterWithCache/50a55ae1-1c87-4dea-bb73-c9e67941e1fd?pageNumber=1&query={query}`
- **Purpose**: Search for academic degree programs, courses, or cohort codes (e.g., `TU856`).

### Timetable Events Endpoint:
- **URL**: `POST https://scientia-eu-v4-api-d4-01.azurewebsites.net/api/Public/CategoryTypes/Categories/Events/Filter/50a55ae1-1c87-4dea-bb73-c9e67941e1fd?startRange={startISO}&endRange={endISO}`
- **Purpose**: Retrieve scheduled classes, locations, and staff assignments for a program within a specified date window.
