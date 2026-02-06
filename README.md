# Air Quality Dashboard

A sleek, dark-themed web dashboard for the **Apollo AIR-1** (ESPHome-based) air quality sensor. Paste raw sensor output and get instant visualizations with color-coded gauges, WHO guideline comparisons, and historical tracking.

## Features

- **Paste-to-parse** — copy the full page from the sensor's web UI and paste it in; all values are extracted automatically
- **Color-coded gauges** — PM2.5, PM10, CO2, VOC, humidity, and temperature with threshold-based coloring and health advice
- **WiFi signal bars** — RSSI displayed as visual bars with strength labels instead of raw dBm
- **WHO guideline bars** — see how your readings compare to WHO annual/daily limits
- **Particle breakdown** — size distribution across PM1, PM2.5, PM4, and PM10
- **Compare mode** — select any two readings to see deltas across all metrics
- **History** — last 50 readings stored in localStorage with view, compare, and delete
- **Export / Import** — download history as JSON, load it on another device
- **Manual entry** — enter values by hand when paste isn't available
- **Mobile-first** — designed for phones, works everywhere

## Getting Started

```bash
bun install
bun dev          # starts dev server at localhost:4321
```

## Commands

| Command | Description |
|---------|-------------|
| `bun dev` | Start dev server (opens browser) |
| `bun run build` | Build to `./dist` |
| `bun preview` | Build + run Wrangler dev server |
| `bun deploy` | Build + deploy to Cloudflare Workers |

## Project Structure

```
src/
├── components/
│   ├── types.ts               # Shared TypeScript interfaces
│   ├── thresholds.ts          # Thresholds, parser, utilities, styles
│   ├── storage.ts             # localStorage persistence + export/import
│   ├── GaugeComponents.tsx    # Delta, GaugeBar, VocQualityBadge
│   ├── AnalysisComponents.tsx # ParticleBreakdown, WHOBars, StatusPanel
│   ├── HistoryCard.tsx        # History entry with view/compare/delete
│   ├── Dashboard.tsx          # Main stateful component
│   └── Layout.astro           # HTML shell
├── pages/
│   ├── index.astro            # Dashboard page
│   └── 404.astro              # Not found
└── global.css                 # Body reset
```

## How It Works

1. Open your Apollo AIR-1 sensor web UI (e.g. `http://192.168.50.20`)
2. Select All, Copy the full page text
3. Paste into the dashboard and hit **Save & Analyze**
4. View gauges, status, WHO comparisons, and particle breakdown
5. Previous readings are saved locally — tap **View** or **Compare** on any history entry

## Tech Stack

- [Astro](https://astro.build/) — static site framework with server-side rendering
- [Solid-JS](https://www.solidjs.com/) — reactive UI via `client:load` island
- [Cloudflare Workers](https://workers.cloudflare.com/) — edge deployment
- [Bun](https://bun.sh/) — package manager and runtime
- [Biome](https://biomejs.dev/) — linting and formatting

## License

MIT License

Copyright (c) 2026 David Clausen

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
