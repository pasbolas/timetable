# Scientia EU Timetable API Reference

This document provides a comprehensive technical reference for the underlying **Scientia Enterprise Timetabling API** (EU v4) used in this application. It specifies all endpoints, HTTP methods, headers, request bodies, query parameters, response structures, and sample requests.

---

## 1. Overview & Base Configuration

The backend services are hosted on Azure App Services for the institution's instance of Scientia Timetabler.

- **Base URL Host**: `https://{database_name}.azurewebsites.net`
- **Default Database Instance**: `scientia-eu-v4-api-d4-01`
- **Institution Identifier GUID**: `50a55ae1-1c87-4dea-bb73-c9e67941e1fd`
- **Programs Category Type Identity GUID**: `241e4d36-93f2-4938-9e15-d4536fe3b2eb`
- **Primary Timezone**: `Europe/Dublin` (`UTC+0` in winter / `UTC+1` IST in summer)

---

## 2. Program / Course Search API

Used for real-time autocomplete and fuzzy searching of degree programs, courses, or student cohorts.

### Endpoint
```http
POST /api/Public/CategoryTypes/{CategoryTypeIdentity}/Categories/FilterWithCache/{InstitutionId}?pageNumber={pageNumber}&query={query}
```

### Path & Query Parameters

| Parameter | Type | Required | Description | Example |
|---|---|---|---|---|
| `CategoryTypeIdentity` | GUID (string) | Yes | Category type for programs/courses | `241e4d36-93f2-4938-9e15-d4536fe3b2eb` |
| `InstitutionId` | GUID (string) | Yes | Institution tenant ID | `50a55ae1-1c87-4dea-bb73-c9e67941e1fd` |
| `pageNumber` | Integer | Yes | Page index for paginated results (1-based) | `1` |
| `query` | String | Yes | User search string (e.g. course code or title) | `TU856` or `Computer Science` |

### Headers
```http
Accept: application/json
Content-Type: application/json
```

### Request Body
Empty body or empty JSON object: `{}`.

### Sanitization Rules
- Ampersands (`&`) should be removed or encoded from the query to prevent query string truncation (`query = query.replaceAll("&", "")`).

### Response Structure (JSON)

```json
{
  "TotalResults": 4,
  "Results": [
    {
      "Identity": "d8b3f124-7b90-4bf6-9051-93c6fcf376b5",
      "CategoryTypeIdentity": "241e4d36-93f2-4938-9e15-d4536fe3b2eb",
      "Name": "TU856/2 - Computer Science (Infrastructure)",
      "Description": "BSc (Hons) in Computer Science (Infrastructure)",
      "ParentIdentity": null
    }
  ]
}
```

#### Key Fields Extracted:
- `Identity`: Unique program identifier GUID required for querying events.
- `CategoryTypeIdentity`: Category type GUID passed back into the events filter payload.
- `Name`: Full program name (e.g., `TU856/2 - Computer Science`). The application extracts the short code (`TU856/2`) for UI buttons/chips.

### Example cURL Request

```bash
curl -X POST "https://scientia-eu-v4-api-d4-01.azurewebsites.net/api/Public/CategoryTypes/241e4d36-93f2-4938-9e15-d4536fe3b2eb/Categories/FilterWithCache/50a55ae1-1c87-4dea-bb73-c9e67941e1fd?pageNumber=1&query=TU856" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json"
```

---

## 3. Events & Timetable Retrieval API

Fetches all scheduled lectures, tutorials, laboratory sessions, seminars, and events for a selected program within a specified ISO date-time range.

### Endpoint
```http
POST /api/Public/CategoryTypes/Categories/Events/Filter/{InstitutionId}?startRange={startRange}&endRange={endRange}
```

### Path & Query Parameters

| Parameter | Type | Required | Description | Example |
|---|---|---|---|---|
| `InstitutionId` | GUID (string) | Yes | Institution tenant ID | `50a55ae1-1c87-4dea-bb73-c9e67941e1fd` |
| `startRange` | ISO 8601 String | Yes | Beginning of date range | `2026-09-01T00:00:00.000Z` |
| `endRange` | ISO 8601 String | Yes | End of date range (end of ISO week) | `2026-09-07T23:59:59.999Z` |

### Headers
```http
Accept: application/json
Content-Type: application/json
```

### Request Payload Schema

```json
{
  "ViewOptions": {
    "Days": [
      { "DayOfWeek": 1 },
      { "DayOfWeek": 2 },
      { "DayOfWeek": 3 },
      { "DayOfWeek": 4 },
      { "DayOfWeek": 5 },
      { "DayOfWeek": 6 }
    ]
  },
  "CategoryTypesWithIdentities": [
    {
      "CategoryTypeIdentity": "241e4d36-93f2-4938-9e15-d4536fe3b2eb",
      "CategoryIdentities": [
        "d8b3f124-7b90-4bf6-9051-93c6fcf376b5"
      ]
    }
  ],
  "FetchBookings": false,
  "FetchPersonalEvents": false,
  "PersonalIdentities": []
}
```

#### Field Explanations:
- `ViewOptions.Days`: Array of objects declaring the days of week to include (`1` = Monday ... `6` = Saturday, `7` / `0` = Sunday).
- `CategoryTypesWithIdentities`: Contains the category type GUID and an array of program `CategoryIdentities` GUIDs to aggregate.
- `FetchBookings`: Boolean flag for ad-hoc room bookings (typically `false`).
- `FetchPersonalEvents`: Boolean flag for individual student account calendar events (typically `false`).

### Response Structure (JSON)

```json
{
  "CategoryEvents": [
    {
      "CategoryTypeIdentity": "241e4d36-93f2-4938-9e15-d4536fe3b2eb",
      "CategoryIdentity": "d8b3f124-7b90-4bf6-9051-93c6fcf376b5",
      "Results": [
        {
          "Identity": "993a4bc0-93bf-4da2-9b2f-3d60064b3ec6",
          "StartDateTime": "2026-09-02T09:00:00",
          "EndDateTime": "2026-09-02T11:00:00",
          "Name": "CMPU2016/Lecture/01",
          "Description": "Object Oriented Programming",
          "EventType": "Lecture",
          "Location": "CQ-008 Central Quad",
          "ExtraProperties": [
            {
              "Name": "Staff",
              "Value": "Dr. Alan Turing"
            },
            {
              "Name": "Department",
              "Value": "Computer Science"
            }
          ]
        },
        {
          "Identity": "8f64da21-f09b-4351-a79d-3f82e1d092bb",
          "StartDateTime": "2026-09-02T11:00:00",
          "EndDateTime": "2026-09-02T13:00:00",
          "Name": "CMPU2016/Lab/Group A",
          "Description": "Object Oriented Programming Lab",
          "EventType": "Laboratory",
          "Location": "CQ-112 Central Quad",
          "ExtraProperties": [
            {
              "Name": "Staff",
              "Value": "Grace Hopper"
            }
          ]
        },
        {
          "Identity": "7a52ce11-e18b-4240-b68c-2f71e0c081aa",
          "StartDateTime": "2026-09-02T11:00:00",
          "EndDateTime": "2026-09-02T13:00:00",
          "Name": "CMPU2016/Lab/Group B",
          "Description": "Object Oriented Programming Lab",
          "EventType": "Laboratory",
          "Location": "CQ-114 Central Quad",
          "ExtraProperties": [
            {
              "Name": "Staff",
              "Value": "Margaret Hamilton"
            }
          ]
        }
      ]
    }
  ]
}
```

### Example cURL Request

```bash
curl -X POST "https://scientia-eu-v4-api-d4-01.azurewebsites.net/api/Public/CategoryTypes/Categories/Events/Filter/50a55ae1-1c87-4dea-bb73-c9e67941e1fd?startRange=2026-09-01T00%3A00%3A00.000Z&endRange=2026-09-07T23%3A59%3A59.999Z" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "ViewOptions": {
      "Days": [
        {"DayOfWeek": 1},
        {"DayOfWeek": 2},
        {"DayOfWeek": 3},
        {"DayOfWeek": 4},
        {"DayOfWeek": 5},
        {"DayOfWeek": 6}
      ]
    },
    "CategoryTypesWithIdentities": [
      {
        "CategoryTypeIdentity": "241e4d36-93f2-4938-9e15-d4536fe3b2eb",
        "CategoryIdentities": ["d8b3f124-7b90-4bf6-9051-93c6fcf376b5"]
      }
    ],
    "FetchBookings": false,
    "FetchPersonalEvents": false,
    "PersonalIdentities": []
  }'
```

---

## 4. Error Handling & HTTP Statuses

| Status Code | Reason | Cause & Handling |
|---|---|---|
| `200 OK` | Success | Payload parsed as JSON. Empty `Results` array indicates no classes scheduled for the week. |
| `400 Bad Request` | Invalid parameters | Malformed date range or missing category identifier. |
| `404 Not Found` | Unknown endpoint/tenant | Verify database name and institution GUID. |
| `500 Internal Error` | Scientia Server Error | Downstream database failure or rate limit. Retry with exponential backoff. |
| `AbortError` | Client Aborted | Triggered when a new user request supersedes a previous in-flight search/fetch. |
