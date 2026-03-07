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

## Quick Start

### 🚀 1. Production / End Users (Simplest Setup)

Jejak is distributed as lightweight, pre-built Docker images. You don't need to build from source! Just run this 1-liner in your terminal:

```bash
curl -O https://raw.githubusercontent.com/bagose/jejak-analytics/main/docker-compose.yml && docker compose up -d
```

> **Note:** This automatically downloads the config, pulls the lightweight `jejak-server` and `jejak-dashboard` images, and sets up PostgreSQL & Redis in the background.

- **Dashboard:** `http://localhost:3101`
- **Default Login:** `admin` / `admin123`

---

### 💻 2. Local Development (For Developers)

If you want to modify the source code or build the images yourself:

1. **Clone the repository:**

   ```bash
   git clone https://github.com/bagose/jejak-analytics.git
   cd jejak-analytics
   ```

2. **Run using the Development Docker Compose:**
   ```bash
   docker compose -f docker-compose.dev.yml up -d --build
   ```
   > This builds the Dashboard, Server, and Tracker scripts directly from your local source code.

## Tracker Integration

Add this tag to your website's `<head>`:

```html
<script
  defer
  src="http://your-server:3100/jejak.js"
  data-app-id="YOUR_WEBSITE_ID"
  data-host="http://your-server:3100"
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
_cfgLocal.track("purchase", { amount: 150.0, currency: "USD" });
```

### A/B Testing

```html
<div data-jj-ab-test="TEST_ID" data-jj-ab-variant="A">Show Variant A</div>
<div data-jj-ab-test="TEST_ID" data-jj-ab-variant="B">Show Variant B</div>
```

### Tracker Configuration

| Attribute     | Default       | Description                     |
| ------------- | ------------- | ------------------------------- |
| `data-app-id` | **required**  | Your website UUID from Settings |
| `data-host`   | script origin | Analytics server URL            |
| `data-h`      | `true`        | Enable click/scroll heatmaps    |
| `data-p`      | `true`        | Track Core Web Vitals           |
| `data-e`      | `true`        | Track JavaScript errors         |
| `data-r`      | `false`       | Enable session recording        |
| `data-sr`     | `0.1`         | Recording sample rate (0-1)     |

## Documentation

Full documentation with Indonesian translation is available inside the **Dashboard > Settings** page.

## Tech Stack

- **Server**: Node.js, Express, TypeScript, PostgreSQL, Redis.
- **Dashboard**: Vue 3, Vite, Tailwind CSS, Pinia, Chart.js.
- **Tracker**: Pure TypeScript (Rolled up into a tiny 6KB bundle).

## API Endpoints

| Method | Endpoint                   | Auth | Description               |
| ------ | -------------------------- | ---- | ------------------------- |
| POST   | `/api/v1/ping`             | No   | Data collection (tracker) |
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
