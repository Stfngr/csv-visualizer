# Functional Specification: Local CSV Data Visualizer (Client-Side Only)

**Version:** 1.2
**Status:** Approved  
**Target Environment:** Browser-only (Client-Side Execution)

---

## 1. Overview & Goal

Build a single-page web application (SPA) that enables users to upload a local CSV file, select/deselect specific data series using checkboxes, and dynamically view and update multiple charts. 

**Strict Privacy Requirement:** The application MUST process all data entirely within the client's browser using local JavaScript. No data may be uploaded to external servers, APIs, or cloud services.

---

## 2. Technical Stack & Dependencies

- **Framework:** Vue.js 3 (Composition API with `<script setup>`) or React with Vite.
- **Language:** TypeScript.
- **Styling:** Tailwind CSS (for layout, responsive grid, sidebar, and control controls).
- **CSV Parser:** Papa Parse (`papaparse`).
- **Charting Library:** Chart.js with wrapper (`vue-chartjs` or `react-chartjs-2`) OR Apache ECharts.
- **Icons:** Lucide Icons / Heroicons (SVG-based).

---

## 3. System Architecture & Data Flow

1. **File Selection:** User selects a local `.csv` file via `<input type="file" accept=".csv">` or Drag-and-Drop.
2. **File Reading & Parsing:** File is read in-memory using the HTML5 `FileReader` API and parsed into memory with Papa Parse.
3. **State Initialization:**
   - `headers`: Array of column names derived from CSV headers.
   - `series`: Parsed series containing numeric x-values, exact source x-label text, and numeric or null y-values.
   - `visibilityState`: Dictionary tracking visibility (`boolean`) of each selectable series.
4. **Reactivity:** Computed properties derive active visual datasets from `series` + `visibilityState`.
5. **Rendering:** Charts dynamically update on canvas when `visibilityState` changes without re-parsing the file.

---

## 4. Detailed Feature Specifications

### 4.1. File Import & Processing
- **F-1.1:** Before a file is loaded, display a large, prominent Drag-and-Drop upload area in the main content panel with a standard file picker button. Do not show file import controls in the sidebar.
- **F-1.2:** Restrict file types to `.csv` extension and `text/csv` MIME type.
- **F-1.3:** Handle parsing errors gracefully (e.g., malformed CSVs, empty files, non-numeric values) by displaying user-friendly notification toasts/banners.
- **F-1.4:** Automatically detect whether the first row contains headers.
- **F-1.5:** Parse both long-form `SECONDS`/`PID`/`VALUE`/`UNITS` data and generic numeric-column CSV data.

### 4.2. Data Management & Filtering (Sidebar / Control Panel)
- **F-2.1:** Display a list of items representing the toggleable data (columns/series) with checkboxes.
- **F-2.2:** Provide a **"Select All"** and **"Deselect All"** global action toggle.
- **F-2.3:** Include a search/filter input field in the sidebar to quickly filter long lists of checkboxes.
- **F-2.4:** Checking or unchecking an item must immediately update all visible charts without re-parsing the original CSV file.

### 4.3. Chart Rendering & Visualization
- **F-3.1:** Dynamically generate one chart component per available numeric data column (or category).
- **F-3.2:** Render line charts in responsive CSS Grid layout (2 columns on desktop, 1 column on mobile).
- **F-3.3:** Show precise source time text and numeric value in synchronized hover readouts.
- **F-3.4:** Preserve time text exactly as supplied in source CSV, including leading zeroes and decimal precision. Numeric time values remain available for zooming, panning, selection, and crosshair synchronization.
- **F-3.5:** Support shared zoom, pan, range selection, and crosshair interaction across active charts.
- **F-3.6:** High-performance canvas rendering must maintain smooth interaction when toggling checkboxes.

### 4.4. Privacy & Security Constraints
- **NFR-1.1 (Air-Gapped Operation):** Zero external network calls after initial page loading. No analytics, tracking scripts, or telemetry.
- **NFR-1.2 (Memory Hygiene):** Provide a "Reset / Clear Data" button that clears all parsed CSV data from browser RAM.

---

## 5. UI / UX Design Layout Structure

```
+-----------------------------------------------------------------------+
| HEADER: Local CSV Visualizer | [Reset Data] | [Chart Type: Line/Bar] |
+-----------------------------------+-----------------------------------+
| SIDEBAR (Width: 300px)            | MAIN CONTENT AREA                 |
|                                   |                                   |
| File details after import          | [ Large Drag & Drop area ]        |
|                                   | [ Choose File button ]            |
|                                   |                                   |
| Filter List: [ Search... ]        | Grid Layout:                      |
| [x] Select / Deselect All         | +---------------+ +---------------+ |
|                                   | | Chart 1       | | Chart 2       | |
| Data Series:                      | | (Column A)    | | (Column B)    | |
| [x] Series 1                      | +---------------+ +---------------+ |
| [x] Series 2                      | +---------------+ +---------------+ |
| [ ] Series 3 (Hidden)             | | Chart 3       | | Chart 4       | |
| [x] Series 4                      | | (Column C)    | | (Column D)    | |
|                                   | +---------------+ +---------------+ |
+-----------------------------------+-----------------------------------+
```

---

## 6. Quality Assurance

- **QA-1.1:** Automated unit tests must cover long-form and generic CSV parsing, series grouping, missing values, source-time label preservation, parser failures, and upload file validation.
- **QA-1.2:** Tests run with Vitest in a jsdom environment using Vue Test Utils for component tests.
- **QA-1.3:** `npm test` runs tests once; `npm run test:watch` runs them continuously.
- **QA-1.4:** Before any Git push, `npm test` and `npm run build` must pass against current worktree state. Do not bypass failed verification.

---

## 7. Edge Cases & Non-Functional Requirements

- **Non-numeric values:** Replace missing or non-numeric values with `null` or `0` to prevent chart rendering crashes.
- **Large Datasets (> 50,000 rows):** Implement throttling/debouncing on checkbox changes if rendering latency exceeds 100ms.
- **Performance:** Initial file parsing of a 10MB CSV should complete under 1.5 seconds.
- **Portability:** App should build to a static bundle (`index.html`, `bundle.js`, `style.css`) that can be served via any local web server or opened directly.
