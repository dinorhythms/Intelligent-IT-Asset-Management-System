# Intelligent IT Asset Management System

This workspace contains a complete starter project for an Intelligent IT Asset Management System with QR code tracking, agentic AI workflows, and predictive maintenance.

## Project structure
- backend: NestJS API server
- frontend: Next.js dashboard
- electron: Electron desktop wrapper
- ai-service: Python Flask service for predictive scoring and anomaly detection
- database: PostgreSQL schema in db/schema.sql

## Run locally
1. Install backend dependencies:
   npm --prefix backend install
2. Install frontend dependencies:
   npm --prefix frontend install
3. Install Electron dependencies:
   npm --prefix electron install
4. Start backend:
   npm run backend
5. Start frontend:
   npm run frontend
6. Start AI service:
   npm run ai
7. Start Electron desktop app:
   npm run electron

## Database
Use the SQL schema from db/schema.sql with PostgreSQL.

## AI service (predictive maintenance)

The Python/Flask microservice in `ai-service/` provides predictive scoring,
anomaly detection, maintenance recommendations and scheduling. See
`ai-service/README.md` for full endpoint docs and example requests.

Setup (one-time):

    python -m pip install -r ai-service/requirements.txt
    cp ai-service/.env.example ai-service/.env

Run together with the backend (two terminals):

    # Terminal 1 - Flask AI service on http://127.0.0.1:5001
    python ai-service/app.py

    # Terminal 2 - NestJS backend on http://localhost:3001
    npm run backend

The NestJS backend proxies AI calls through its `AiModule`
(`src/modules/ai/`) at:

    POST /ai/predict              -> Flask /predict
    POST /ai/anomaly              -> Flask /anomaly
    POST /ai/recommend            -> Flask /recommend
    POST /ai/maintenance-schedule -> Flask /maintenance_schedule
    GET  /ai/health               -> Flask /health
    GET  /ai/history              -> persisted AI results from PostgreSQL

Auth: the backend sends `X-API-Key` (from `AI_SERVICE_API_KEY`); the Flask
service also accepts JWTs signed with the shared `AI_SERVICE_JWT_SECRET`.
Communication uses `http://127.0.0.1:5001` (override with `AI_SERVICE_URL` in
`backend/.env`). Retries (3 attempts with backoff) and error handling are
built into `backend/src/modules/ai/ai.service.ts`, and every AI response is
stored in the `ai_service_results` PostgreSQL table.

## Automatic AI integration

The AI service is triggered automatically by the backend - no admin clicks
required. All calls run in the background with retries (3 attempts, exponential
backoff); if the AI service is unreachable the failure is logged and the
original operation (asset/request/service) still completes.

| Operation | Automatic AI trigger | Result stored in |
| --------- | -------------------- | ---------------- |
| `POST /assets` (create/update) | `/ai/predict` + `/ai/anomaly` with telemetry (`usage_hours`, `temperature`, `cpu_usage`, `vibration`, `load_factor`, `years_operation`) | `asset_details.predictiveScore` (latest), `predictive_results` (summary snapshot), `ai_service_results` (full response) |
| `POST /requests` (maintenance/repair request) | `/ai/anomaly`; if anomalies are detected, `/ai/recommend` runs automatically | `ai_service_results` |
| `POST /services` (service logged / maintenance completed) | `/ai/maintenance_schedule` | `asset_details.next_maintenance_date`, `ai_service_results` |
| Every 5 minutes (background task) | `/ai/health` liveness check | logs AI service status |

`predictiveScore` in `asset_details` is therefore updated automatically by the
AI service whenever an asset is created or updated - you do not need to set it
manually. Telemetry supplied at asset creation/update is also stored on the
asset (`usageHours`, `temperature`, `cpuUsage`, `vibration`, `loadFactor`,
`yearsOperation`) and reused by later request anomaly checks.

### Example flows

    # 1. Create an asset with telemetry -> predictiveScore auto-computed
    curl -X POST http://localhost:3001/assets \
      -H "Authorization: Bearer <JWT>" -H "Content-Type: application/json" \
      -d '{"assetId":"AST-2001","assetName":"Server Rack","usage_hours":540,"temperature":88,"cpu_usage":94,"vibration":4.6,"load_factor":0.9,"years_operation":4}'

    # 2. Create a maintenance request -> anomaly + recommend auto-run
    curl -X POST http://localhost:3001/requests \
      -H "Authorization: Bearer <JWT>" -H "Content-Type: application/json" \
      -d '{"assetName":"Server Rack","assetIdentifier":"AST-2001","requestPriority":"urgent","temperature":88,"cpu_usage":94}'

    # 3. Log a service against an asset -> next_maintenance_date auto-computed
    curl -X POST http://localhost:3001/services \
      -H "Authorization: Bearer <JWT>" -H "Content-Type: application/json" \
      -d '{"serviceId":"SRV-3001","assetId":"AST-2001","serviceDesc":"Preventive maintenance","usage_hours":540,"last_maintenance_date":"2026-01-15"}'

    # 4. Inspect what the AI service computed
    curl -H "Authorization: Bearer <JWT>" http://localhost:3001/ai/history

### Example request

    curl -X POST http://localhost:3001/ai/predict \
      -H "Authorization: Bearer <JWT from POST /auth/login>" \
      -H "Content-Type: application/json" \
      -d '{"assetId":"AST-1001","usage_hours":320,"temperature":82,"cpu_usage":88,"vibration":3.1,"load_factor":0.7,"years_operation":3}'

Swagger docs for the AI endpoints: http://localhost:3001/api/docs
