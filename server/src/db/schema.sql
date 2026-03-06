-- ═══════════════════════════════════════════════════════════════
-- Jejak 🐾 — Database Schema
-- Self-hosted analytics platform
-- ═══════════════════════════════════════════════════════════════

-- ── Extensions ───────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Websites ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS websites (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(255) NOT NULL,
    domain      VARCHAR(255) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(domain)
);

-- ── Users (Dashboard Auth) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username       VARCHAR(100) NOT NULL UNIQUE,
    password_hash  VARCHAR(255) NOT NULL,
    role           VARCHAR(20) NOT NULL DEFAULT 'admin',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Sessions ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    website_id       UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
    fingerprint_hash VARCHAR(64) NOT NULL,
    started_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at         TIMESTAMPTZ,
    duration         INTEGER DEFAULT 0,         -- seconds
    is_bounce        BOOLEAN DEFAULT TRUE,
    entry_url        TEXT,
    exit_url         TEXT,

    -- Visitor info (non-PII)
    country          VARCHAR(2),                -- ISO 3166-1 alpha-2
    city             VARCHAR(100),
    device_type      VARCHAR(20),               -- desktop, mobile, tablet
    browser          VARCHAR(50),
    browser_version  VARCHAR(20),
    os               VARCHAR(50),
    os_version       VARCHAR(20),
    screen_width     SMALLINT,
    screen_height    SMALLINT,
    language         VARCHAR(10),

    -- Traffic source
    referrer         TEXT,
    referrer_domain  VARCHAR(255),
    utm_source       VARCHAR(255),
    utm_medium       VARCHAR(255),
    utm_campaign     VARCHAR(255),
    utm_content      VARCHAR(255),
    utm_term         VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_sessions_website_started ON sessions(website_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_fingerprint     ON sessions(website_id, fingerprint_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_country         ON sessions(website_id, country);

-- ── Page Views ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS page_views (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id   UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    website_id   UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
    url          TEXT NOT NULL,
    path         VARCHAR(2048),
    title        VARCHAR(512),
    referrer     TEXT,
    entered_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    exited_at    TIMESTAMPTZ,
    time_on_page INTEGER DEFAULT 0               -- seconds
);

CREATE INDEX IF NOT EXISTS idx_pageviews_website_time ON page_views(website_id, entered_at DESC);
CREATE INDEX IF NOT EXISTS idx_pageviews_session      ON page_views(session_id);
CREATE INDEX IF NOT EXISTS idx_pageviews_path         ON page_views(website_id, path);

-- ── Custom Events ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id  UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    website_id  UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    properties  JSONB DEFAULT '{}',
    url         TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_website_time ON events(website_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_name         ON events(website_id, name);
CREATE INDEX IF NOT EXISTS idx_events_session      ON events(session_id);

-- ── Heatmap Data ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS heatmap_data (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    website_id       UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
    session_id       UUID REFERENCES sessions(id) ON DELETE CASCADE,
    url              TEXT NOT NULL,
    path             VARCHAR(2048),
    event_type       VARCHAR(10) NOT NULL,       -- click, scroll, move
    x                REAL NOT NULL,              -- relative to viewport (0-1)
    y                REAL NOT NULL,
    viewport_width   SMALLINT,
    viewport_height  SMALLINT,
    element_selector VARCHAR(512),
    device_type      VARCHAR(20),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_heatmap_website_url ON heatmap_data(website_id, path, event_type);
CREATE INDEX IF NOT EXISTS idx_heatmap_time        ON heatmap_data(website_id, created_at DESC);

-- ── Session Recordings ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS session_recordings (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id  UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    website_id  UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
    events_data JSONB NOT NULL DEFAULT '[]',
    duration    INTEGER DEFAULT 0,               -- seconds
    page_count  SMALLINT DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recordings_website ON session_recordings(website_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recordings_session ON session_recordings(session_id);

-- ── Funnels ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS funnels (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    website_id  UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    steps       JSONB NOT NULL DEFAULT '[]',     -- [{name, type, value}]
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── A/B Tests ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ab_tests (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    website_id     UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
    name           VARCHAR(255) NOT NULL,
    description    TEXT,
    variants       JSONB NOT NULL DEFAULT '[]',  -- [{name, weight}]
    goal_event     VARCHAR(255),
    status         VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft, running, paused, completed
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ab_test_assignments (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_id     UUID NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
    session_id  UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    variant     VARCHAR(100) NOT NULL,
    converted   BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(test_id, session_id)
);

-- ── Performance Metrics ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS performance_metrics (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id  UUID REFERENCES sessions(id) ON DELETE CASCADE,
    website_id  UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
    url         TEXT NOT NULL,
    path        VARCHAR(2048),

    -- Core Web Vitals (milliseconds, except CLS which is unitless)
    lcp         REAL,        -- Largest Contentful Paint
    fid         REAL,        -- First Input Delay
    inp         REAL,        -- Interaction to Next Paint
    cls         REAL,        -- Cumulative Layout Shift (unitless)
    fcp         REAL,        -- First Contentful Paint
    ttfb        REAL,        -- Time to First Byte

    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_perf_website_time ON performance_metrics(website_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_perf_path         ON performance_metrics(website_id, path);

-- ── Error Logs ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS error_logs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id  UUID REFERENCES sessions(id) ON DELETE CASCADE,
    website_id  UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
    message     TEXT NOT NULL,
    stack       TEXT,
    source      VARCHAR(512),
    line        INTEGER,
    col         INTEGER,
    url         TEXT,
    browser     VARCHAR(50),
    os          VARCHAR(50),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_errors_website_time ON error_logs(website_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_errors_message      ON error_logs(website_id, message);

-- ── Materialized Views (for fast dashboard queries) ──────────
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_stats AS
SELECT
    pv.website_id,
    DATE(pv.entered_at AT TIME ZONE 'UTC') AS day,
    COUNT(*)                            AS views,
    COUNT(DISTINCT pv.session_id)       AS sessions,
    COUNT(DISTINCT pv.session_id) FILTER (WHERE s.is_bounce = TRUE) AS bounces
FROM page_views pv
JOIN sessions s ON s.id = pv.session_id
GROUP BY pv.website_id, DATE(pv.entered_at AT TIME ZONE 'UTC');

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_daily_stats ON mv_daily_stats(website_id, day);

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_page_stats AS
SELECT
    pv.website_id,
    pv.path,
    DATE(pv.entered_at AT TIME ZONE 'UTC') AS day,
    COUNT(*)                            AS views,
    COUNT(DISTINCT pv.session_id)       AS visitors,
    AVG(pv.time_on_page)                AS avg_time
FROM page_views pv
GROUP BY pv.website_id, pv.path, DATE(pv.entered_at AT TIME ZONE 'UTC');

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_page_stats ON mv_page_stats(website_id, path, day);
