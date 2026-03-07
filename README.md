# Jejak 🐾

Premium, lightweight, privacy-first, and self-hosted web analytics.

## Features

- **📊 Detailed Dashboard**: KPI cards, traffic charts, and top pages/sources.
- **⚡ Real-time**: See active visitors and live activity feeds as they happen.
- **🔥 Behavior Tracking**: Heatmaps, session tracking, and conversion funnels.
- **🧪 A/B Testing**: Built-in experimentation with variant assignment and conversion tracking.
- **🐛 Technical Monitoring**: Performance (Core Web Vitals) and Error tracking with stack traces.
- **🛡️ Privacy First**: Self-hosted, no cookies required by default, and fully compliant with data standards.
- **🔌 Plug & Play**: Simple script integration with declarative event tracking.

## Quick Start (Deployment)

1. **Clone & Setup**:

   ```bash
   git clone <repo-url>
   cd jejak
   ```

2. **Configure Environment**:
   Copy `.env.example` to `.env` and fill in your database credentials and secret keys.

3. **Docker Deployment (Recommended)**:
   ```bash
   docker compose up -d
   ```
   Dashboard will be available at `http://localhost:3101`.
   API & Collector will be available at `http://localhost:3100`.

## Tracker Integration

Add this tag to your website's `<head>`:

```html
<script
  defer
  src="http://your-server:3100/jejak.js"
  data-website-id="YOUR_WEBSITE_ID"
  data-api="http://your-server:3100"
></script>
```

### Event Tracking

#### 1. Declarative (HTML Attributes)

```html
<button data-jj-event="cta_click" data-jj-label="Mulai Sekarang">
  Start Now
</button>
```

#### 2. Programmatic (JavaScript)

```javascript
Jejak.track("purchase", { amount: 150.0, currency: "USD" });
```

### A/B Testing

```html
<div data-jj-ab-test="TEST_ID" data-jj-ab-variant="A">Show Variant A</div>
<div data-jj-ab-test="TEST_ID" data-jj-ab-variant="B">Show Variant B</div>
```

### Tracker Configuration

| Attribute          | Default       | Description                      |
| ------------------ | ------------- | -------------------------------- |
| `data-website-id`  | **required**  | Your website UUID from Settings  |
| `data-api`         | script origin | Analytics server URL             |
| `data-heatmap`     | `true`        | Enable click/scroll heatmaps     |
| `data-performance` | `true`        | Track Core Web Vitals            |
| `data-errors`      | `true`        | Track JavaScript errors          |
| `data-recording`   | `false`       | Enable session recording (rrweb) |
| `data-sample-rate` | `0.1`         | Recording sample rate (0-1)      |

## Documentation

Full documentation with Indonesian translation is available inside the **Dashboard > Settings** page.

## Tech Stack

- **Server**: Node.js, Express, TypeScript, PostgreSQL, Redis.
- **Dashboard**: Vue 3, Vite, Tailwind CSS, Pinia, Chart.js.
- **Tracker**: Pure TypeScript (Rolled up into a tiny 6KB bundle).

## API Endpoints

| Method | Endpoint                   | Auth | Description               |
| ------ | -------------------------- | ---- | ------------------------- |
| POST   | `/api/event`               | No   | Data collection (tracker) |
| POST   | `/api/auth/login`          | No   | Dashboard login           |
| GET    | `/api/stats/overview`      | JWT  | KPI overview              |
| GET    | `/api/stats/timeseries`    | JWT  | Traffic chart data        |
| GET    | `/api/stats/pages`         | JWT  | Top pages                 |
| GET    | `/api/stats/sources`       | JWT  | Traffic sources           |
| GET    | `/api/stats/visitors`      | JWT  | Visitor breakdown         |
| GET    | `/api/sessions`            | JWT  | Session list              |
| GET    | `/api/heatmaps`            | JWT  | Heatmap data              |
| GET    | `/api/funnels/:id/analyze` | JWT  | Funnel analysis           |
| POST   | `/api/ab-tests/assign`     | No   | A/B test assignment       |
| GET    | `/api/performance`         | JWT  | Core Web Vitals           |
| GET    | `/api/errors`              | JWT  | Error tracking            |
| GET    | `/api/export/:type`        | JWT  | CSV/JSON export           |
| POST   | `/api/share`               | JWT  | Create share link         |
| GET    | `/api/share/:token/stats`  | No   | Shared dashboard          |
| WS     | `/ws?websiteId=xxx`        | No   | Real-time updates         |

---

© 2026 Jejak Team. Built for speed and privacy.
