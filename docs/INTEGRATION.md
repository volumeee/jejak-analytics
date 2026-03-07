# Jejak — Integration Guide

## Quick Start

### 1. Start the Analytics Server

```bash
# Development
cd jejak/server
npm run dev
# Server starts on http://localhost:3100

# Or with Docker
cd jejak
docker compose up -d
```

### 2. Start the Dashboard

```bash
cd jejak/dashboard
npm run dev
# Dashboard starts on http://localhost:3101
```

### 3. Login & Configure

1. Open **http://localhost:3101** in your browser
2. Login with **admin / admin123**
3. Go to **Settings** → Add your website (name + domain)
4. Copy the **website ID** from the settings page

### 4. Add Tracker to Your Website

Add this script tag before `</body>` in your HTML:

```html
<script
  defer
  src="http://localhost:3100/jejak.js"
  data-website-id="YOUR_WEBSITE_ID"
  data-api="http://localhost:3100"
  data-heatmap="true"
  data-performance="true"
  data-errors="true"
></script>
```

---

## Tracker Configuration

| Attribute          | Default       | Description                      |
| ------------------ | ------------- | -------------------------------- |
| `data-website-id`  | **required**  | Your website UUID from Settings  |
| `data-api`         | script origin | Analytics server URL             |
| `data-heatmap`     | `true`        | Enable click/scroll heatmaps     |
| `data-performance` | `true`        | Track Core Web Vitals            |
| `data-errors`      | `true`        | Track JavaScript errors          |
| `data-recording`   | `false`       | Enable session recording (rrweb) |
| `data-sample-rate` | `0.1`         | Recording sample rate (0-1)      |

## Custom Event Tracking

### Programmatic API

```javascript
// After tracker loads
Jejak.track("button_click", { label: "Download", page: "/home" });
Jejak.track("upgrade", { amount: 50000, product: "Premium Plan" });
```

### Declarative (HTML Attributes)

```html
<button data-jj-event="download_click" data-jj-version="v2.0">Download</button>
```

> **Note**: For backward compatibility, `data-pa-*` attributes are still supported but `data-jj-*` is recommended for new implementations.

## A/B Testing

Create experiments in the **Dashboard > AB Experiments** tab, then use these attributes:

```html
<div data-jj-ab-test="TEST_ID" data-jj-ab-variant="A">Show Variant A</div>
<div data-jj-ab-test="TEST_ID" data-jj-ab-variant="B">Show Variant B</div>
```

Or programmatically:

```javascript
const variant = await Jejak.getVariant("TEST_ID");
if (variant === "A") {
  // Show variant A
} else {
  // Show variant B
}
```

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

## Environment Variables

See `.env.example` for all configurable options including database credentials,
JWT secrets, CORS origins, and data retention policies.

## Docker Deployment

```bash
# Production
cd jejak
cp .env.example .env
# Edit .env with your production values (especially JWT_SECRET)
docker compose up -d

# Services:
# - PostgreSQL: port 5432
# - Redis: port 6379
# - API Server: port 3100
# - Dashboard: port 3101
```
