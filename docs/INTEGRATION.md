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
<script defer type="text/javascript">
  const script = document.createElement("script");
  script.defer = true;
  script.src = "http://localhost:3100/jejak.js?v=" + new Date().getTime();
  script.setAttribute("data-app-id", "YOUR_WEBSITE_ID");
  script.setAttribute("data-host", "http://localhost:3100");
  script.setAttribute("data-h", "true");
  script.setAttribute("data-p", "true");
  script.setAttribute("data-e", "true");
  script.setAttribute("data-r", "true");
  script.setAttribute("data-sr", "1");
  document.head.appendChild(script);
</script>
```

---

## Tracker Configuration

| Attribute     | Default       | Description                     |
| ------------- | ------------- | ------------------------------- |
| `data-app-id` | **required**  | Your website UUID from Settings |
| `data-host`   | script origin | Analytics server URL            |
| `data-h`      | `true`        | Enable click/scroll heatmaps    |
| `data-p`      | `true`        | Track Core Web Vitals           |
| `data-e`      | `true`        | Track JavaScript errors         |
| `data-r`      | `false`       | Enable session recording        |
| `data-sr`     | `0.1`         | Recording sample rate (0-1)     |

## Custom Event Tracking

### Programmatic API

```javascript
// After tracker loads
_cfgLocal.track("button_click", { label: "Download", page: "/home" });
_cfgLocal.track("upgrade", { amount: 50000, product: "Premium Plan" });
```

### Declarative (HTML Attributes)

```html
<button data-jj-event="download_click" data-jj-version="v2.0">Download</button>
```

## A/B Testing

Create experiments in the **Dashboard > AB Experiments** tab, then use these attributes:

```html
<div data-jj-ab-test="TEST_ID" data-jj-ab-variant="A">Show Variant A</div>
<div data-jj-ab-test="TEST_ID" data-jj-ab-variant="B">Show Variant B</div>
```

Or programmatically:

```javascript
const variant = await _cfgLocal.getVariant("TEST_ID");
if (variant === "A") {
  // Show variant A
} else {
  // Show variant B
}
```

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
