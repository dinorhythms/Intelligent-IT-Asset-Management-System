# AI Service (ai-service)

Flask microservice for the Intelligent IT Asset Management System. Provides
predictive maintenance scoring, anomaly detection, maintenance recommendations
and maintenance scheduling using a Scikit-learn model.

## Structure

```
ai-service/
├── app.py                  # Flask app factory + logging + error handlers
├── config.py               # .env-driven configuration
├── security.py             # API key / JWT validation middleware
├── requirements.txt        # Python dependencies
├── .env / .env.example     # Environment configuration
├── models/
│   ├── predictive_model.py # Model definition, training + loading
│   ├── predictive_model.joblib  # Persisted trained model (auto-generated)
│   └── train_and_save.py   # Pre-train script
├── routes/
│   ├── health.py           # GET /health
│   ├── predict.py          # POST /predict
│   ├── anomaly.py          # POST /anomaly
│   ├── recommend.py        # POST /recommend
│   └── maintenance_schedule.py  # POST /maintenance_schedule
└── services/
    ├── predictive_service.py
    ├── anomaly_service.py
    ├── recommendation_service.py
    └── maintenance_service.py
```

## Setup

Requires Python 3.10+.

```bash
cd ai-service
python -m pip install -r requirements.txt
cp .env.example .env   # adjust secrets if desired
python models/train_and_save.py   # optional: pre-train and save the model
```

## Run

```bash
python app.py
```

The service listens on `http://0.0.0.0:5001` by default (configurable via
`AI_SERVICE_PORT`). The first `/predict` call trains a dummy-data model on the
fly and persists it to `models/predictive_model.joblib` for subsequent runs.

## Endpoints

All endpoints except `/health` require authentication via either:

- Header `X-API-Key: <AI_SERVICE_API_KEY>`, or
- Header `Authorization: Bearer <JWT>` (HS256, signed with `AI_SERVICE_JWT_SECRET`)

### GET /health

```bash
curl http://127.0.0.1:5001/health
```

```json
{"model": "saved-model", "port": 5001, "service": "it-asset-ai-service", "status": "ok", "uptime_seconds": 12.4}
```

### POST /predict

Body: `asset_id`, `usage_hours`, `temperature`, `cpu_usage`, `vibration`, `load_factor`, `years_operation`

```bash
curl -X POST http://127.0.0.1:5001/predict \
  -H "X-API-Key: ai-service-dev-key" -H "Content-Type: application/json" \
  -d '{"asset_id":"AST-1001","usage_hours":320,"temperature":82,"cpu_usage":88,"vibration":3.1,"load_factor":0.7,"years_operation":3}'
```

```json
{"asset_id":"AST-1001","predictive_score":0.98,"rul_days":1.0,"confidence":1.0,"model":"saved-model","status":"ok"}
```

### POST /anomaly

Body: `asset_id`, `temperature`, `cpu_usage`, `vibration`

```json
{"asset_id":"AST-1001","anomaly_detected":true,"anomaly_score":0.5125,"findings":[{"metric":"temperature","value":82,"threshold":80,"severity":"high"}],"status":"ok"}
```

### POST /recommend

Body: `asset_id`, `predictive_score` (optional; computed from telemetry if omitted)

```json
{"asset_id":"AST-1001","predictive_score":0.78,"anomaly_detected":false,"recommended_actions":[{"action":"Schedule preventive maintenance within 7 days","priority":"high","category":"maintenance"}],"status":"ok"}
```

### POST /maintenance_schedule

Body: `asset_id`, `usage_hours`, `last_maintenance_date` (ISO), `maintenance_interval_days`

```json
{"asset_id":"AST-1001","next_maintenance_date":"2026-08-03","estimated_days_until_maintenance":1,"days_since_last_maintenance":93,"estimated_daily_usage_hours":3.44,"maintenance_interval_days":90,"status":"ok"}
```

## Model

When no real dataset is provided the service trains a
`GradientBoostingRegressor` on synthetic telemetry where higher usage
(usage hours, temperature, CPU, vibration, load, age) shortens remaining
useful life. `predictive_score` is the normalized failure probability
(0–1, higher = worse). Swap in a real dataset by editing
`models/predictive_model.py` / `models/train_and_save.py` and re-running the
train script.

## Security

- API key check on the `X-API-Key` header against `AI_SERVICE_API_KEY`.
- JWT bearer check against `AI_SERVICE_JWT_SECRET` (shared with the NestJS
  backend so backend-issued tokens are accepted).
- `/health` is public for liveness probes.
- Request/response and error logging are enabled; set `AI_SERVICE_LOG_LEVEL`.
