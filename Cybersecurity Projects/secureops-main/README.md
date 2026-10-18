# SecureOps - SOC Analyst Workbench

SecureOps is a full-stack SOC analyst workbench for alert triage, threat intelligence enrichment, case management, playbooks, and reporting. It is built with free and open-source tooling:

- React 18, Vite, Tailwind CSS, React Router, TanStack Query, Zustand, Recharts, Lucide React
- FastAPI, SQLAlchemy, SQLite by default, Pydantic, JWT auth, APScheduler-compatible background jobs
- Free-tier and free threat-intel providers: VirusTotal, AbuseIPDB, AlienVault OTX, GreyNoise, URLhaus, MalwareBazaar, Shodan

## Current MVP Scope

This repository contains a working product foundation, not a static prototype:

- JWT login/logout/refresh, RBAC roles, audit logs, seeded users
- Alert CRUD, filtering, priority scoring, timeline, comments, escalation, bulk actions
- Dashboard metrics, trends, severity chart, recent alerts, top threats
- IOC lookup, provider abstraction, quota tracking, 24-hour cache, bulk enrichment
- EDR ingest endpoints with idempotent retry handling for mobile/endpoint agents
- Live alert WebSockets for connected workbench sessions
- Drag/drop playbook builder with automated actions and versioned saves
- JSON, CSV, HTML, and PDF report exports
- SMTP report email delivery when email settings are configured
- Deeper analytics for false-positive rate, EDR share, workload, and source risk
- Case CRUD, workflow status, board/list views, SLA deadlines, tasks, comments, attachments metadata
- Seeded playbook templates and execution tracking APIs
- Report generation snapshots and scheduled report records
- UI-managed API keys saved to `.env` with encrypted values for sensitive settings
- Docker hardening, env sample, migrations scaffold, backend tests, and Playwright browser smoke tests

## Prerequisites

- Python 3.11+
- Node.js 22+ and npm
- Optional: Docker Desktop

## Quick Start

From the `secureops` directory:

```bash
cp .env.example .env
```

Backend:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Frontend:

```bash
cd frontend
npm install
npm run dev -- --host 127.0.0.1
```

Open `http://127.0.0.1:5173`.

Seed login:

```text
admin@secureops.local / SecureOps!2026
```

API docs:

```text
http://127.0.0.1:8000/api/docs
```

## Docker

```bash
docker compose up --build
```

The backend will run on `http://localhost:8000`; the frontend will run on `http://localhost:5173`.

## Configuration

All runtime configuration is environment-driven. Copy `.env.example` to `.env` and add provider keys only for the free APIs you want enabled. If a key is absent, SecureOps keeps the provider visible but marks it disabled and continues with local scoring and available free sources.

SQLite is the default:

```text
DATABASE_URL=sqlite:///./secureops.db
```

For free production hosting, switch to a free Postgres provider such as Supabase or Neon:

```text
DATABASE_URL=postgresql://user:pass@host:5432/secureops
```

## Tests

```bash
cd backend
pytest
```

The backend tests use in-memory SQLite and cover auth, alert scoring/IOC extraction, case SLA creation, enrichment response shape, and EDR normalization/idempotency.

Browser E2E smoke tests:

```bash
cd frontend
npx playwright install chromium
npm run e2e
```

## API Map

Core endpoints implemented under `/api/v1`:

- `/auth/login`, `/auth/logout`, `/auth/refresh`, `/auth/register`
- `/users`, `/users/me`, `/users/{id}/activity`
- `/alerts`, `/alerts/stats`, `/alerts/{id}/timeline`, `/alerts/bulk-action`
- `/cases`, `/cases/board`, `/cases/stats`, `/cases/{id}/timeline`
- `/threat-intel/lookup`, `/threat-intel/bulk`, `/threat-intel/history`, `/threat-intel/quota`
- `/playbooks`, `/playbooks/templates`, `/playbooks/automation-actions`, `/playbooks/{id}/execute`
- `/reports`, `/reports/generate`, `/reports/scheduled`
- `/dashboard/stats`, `/dashboard/alerts-trend`, `/dashboard/recent-alerts`, `/dashboard/top-threats`
- `/settings`, `/settings/api-keys`, `/settings/priority-rules`
- `/ingest/edr/config`, `/ingest/edr/alerts`, `/ingest/edr/alerts/batch`
- `/ws/alerts`

## EDR Integration

SecureOps can receive detections from your EDR app over HTTP.

Full integration handoff for the EDR team/agent:

```text
docs/MOBILE_EDR_INTEGRATION.md
```

Single alert:

```bash
curl -X POST http://127.0.0.1:8000/api/v1/ingest/edr/alerts ^
  -H "Content-Type: application/json" ^
  -H "X-SecureOps-Ingest-Key: your-edr-ingest-key" ^
  -d "{\"alert_id\":\"edr-1001\",\"title\":\"Malware blocked\",\"severity\":\"critical\",\"category\":\"Malware\",\"hostname\":\"WKS-FINANCE-01\",\"file_hash\":\"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855\",\"raw_event\":{\"engine\":\"my-edr\"}}"
```

Set `EDR_INGEST_API_KEY` from Settings -> API Configuration or directly in `.env`.

Repeated EDR pushes with the same `alert_id` update the existing SOC alert instead of creating duplicate alerts. This is intentional so mobile retry/backoff queues can resend safely.

## Deployment Notes

Free deployment path:

- Frontend: Vercel, Netlify, or Cloudflare Pages
- Backend: Render, Railway, or Fly.io free tier
- Database: Supabase or Neon Postgres free tier

Set `VITE_API_URL` in the frontend deployment to the backend URL plus `/api/v1`.

## Next Production Hardening Steps

- Move SQLite development data to managed Postgres before multi-user production use
- Add object storage for case attachments in production
- Add CI to run `pytest`, `npm run build`, and `npm run e2e`
- Tune EDR schema mappings as the mobile agent sends more event families
