# Local CSV Visualizer

Browser-only CSV time-series visualizer. Import a local CSV file, select data series, and inspect synchronized line charts without sending data to a server.

## Privacy

CSV files are read and parsed in browser memory with `FileReader` and Papa Parse. This project has no API, analytics, tracking, or file-upload service. **Reset Data** removes parsed data from application memory.

## Features

- Drag-and-drop or choose a local CSV file.
- Parse semicolon- and comma-delimited CSV files with automatic header detection.
- Support long-form `SECONDS`, `PID`, `VALUE`, `UNITS` data, such as included `example.csv`.
- Search, select, deselect, and bulk-select data series.
- Warn before activating more than 10 additional charts.
- Render responsive line charts with synchronized crosshair, hover point, and fixed value readouts.
- Zoom every chart with mouse wheel or global controls.
- Drag across a chart to select and zoom a shared time range.
- Pan all active charts together with global timeline scrollbar.

## Example Format

`example.csv` uses semicolon-delimited long-form telemetry data:

```csv
SECONDS;PID;VALUE;UNITS
36099.6019245;Motordrehzahl;1335;rpm
36099.6019245;Eingangsspannung Steuergeraet;14.14;V
```

`SECONDS` is formatted as elapsed `HH:mm:ss.SSS`. Each unique `PID` becomes selectable line chart. Missing values render as gaps.

## Local Development

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

Other commands:

```bash
npm run build
npm run preview
```

## Stack

- Vue 3 with TypeScript and Composition API
- Vite
- Tailwind CSS
- Papa Parse
- Chart.js and vue-chartjs
- Lucide Vue icons

## GitHub Pages

Pushes to `main` run `.github/workflows/deploy.yaml`, which builds and deploys static output to GitHub Pages.

Before first deployment, set repository **Settings -> Pages -> Build and deployment -> Source** to **GitHub Actions**.

Expected Pages URL: [https://stfngr.github.io/csv-visualizer/](https://stfngr.github.io/csv-visualizer/)

## Repository

[github.com/Stfngr/csv-visualizer](https://github.com/Stfngr/csv-visualizer)
