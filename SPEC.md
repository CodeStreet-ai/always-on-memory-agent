# Project Spec: FastAPI + React Migration for Always-On Memory Agent

## 1. Overview
Current stack:
- `agent.py` runs an always-on memory agent with aiohttp HTTP API on :8888
- `dashboard.py` is a Streamlit client that talks to the API via requests
- Dependencies: `aiohttp`, `streamlit`, `openai-agents`, `python-dotenv`, `requests`

Goal:
- Replace aiohttp with FastAPI for the HTTP layer
- Rebuild dashboard as a React SPA served by FastAPI static files (no separate frontend server)
- Improve UX compared to Streamlit

## 2. Goals
1. Keep existing agent logic, memory DB schema, file watcher, and consolidation loops unchanged
2. Provide drop-in API compatibility for existing clients (endpoints `/status`, `/memories`, `/ingest`, `/query`, `/consolidate`, `/delete`, `/clear`)
3. Add FastAPI docs via Swagger/OpenAPI at `/docs`
4. Serve React dashboard at `/` from FastAPI static files
5. Single `python main.py` entrypoint starts agent tasks + FastAPI server
6. Improve dashboard UX: modern React UI, real-time updates, file upload drag-drop, memory cards with tags, query history, dark mode

## 3. Architecture

```
always-on-memory-agent/
├─ app/
│  ├─ __init__.py
│  ├─ db.py               # SQLite helpers (from agent.py)
│  ├─ agents.py           # MemoryAgent, build_agents (from agent.py)
│  ├─ services/
│  │   ├─ watcher.py      # watch_folder
│  │   └─ consolidator.py # consolidation_loop
│  ├─ api/
│  │   ├─ routes.py       # FastAPI routers for /api/*
│  │   └─ deps.py         # agent singleton
│  └─ main.py             # FastAPI app, static mount, startup tasks
├─ frontend/              # React + Vite source
│  ├─ package.json
│  ├─ vite.config.ts
│  └─ src/
│     ├─ App.tsx
│     ├─ pages/Ingest.tsx
│     ├─ pages/Query.tsx
│     ├─ pages/Memories.tsx
│     └─ components/
├─ static/                # built React assets (generated)
├─ agent.py               # legacy, to be deprecated
├─ dashboard.py           # legacy, to be deprecated
├─ requirements.txt
├─ frontend/package.json
└─ SPEC.md
```

Runtime:
- FastAPI app mounts React build under `/` with SPA fallback
- API under `/api/*` mirrors current aiohttp routes
- Background asyncio tasks: file watcher and consolidation loop started on app startup via `startup_event`
- Same SQLite DB `memory.db`, same env vars

## 4. Tech Stack
Backend:
- Python 3.11+
- FastAPI + Uvicorn
- pydantic v2 for request/response models
- `openai-agents`, `openai`, `python-dotenv`, `sqlite3`, `aiofiles` optional

Frontend:
- React 18 + TypeScript
- Vite for dev/build
- TailwindCSS for styling
- React Query for data fetching
- Lucide icons
- Dropzone for file upload

No separate Node server in production; FastAPI serves static build.

## 5. API Design

Keep compatible JSON contracts. Add OpenAPI schemas.

Base path `/api`

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/status | Memory stats |
| GET | /api/memories | List memories, optional `?limit=50` |
| POST | /api/ingest | `{text, source?}` |
| GET | /api/query?q=... | Query memory |
| POST | /api/consolidate | Trigger consolidation |
| POST | /api/delete | `{memory_id}` |
| POST | /api/clear | Full reset |

Legacy paths `/query`, `/ingest`, etc. will be kept as alias routes for compatibility.

Request/Response models defined in `app/api/schemas.py`.

## 6. Backend Migration Plan

1. Extract core functions from `agent.py` into modules:
   - `db.py`: `get_db`, `store_memory`, `read_all_memories`, `read_unconsolidated_memories`, `store_consolidation`, `read_consolidation_history`, `get_memory_stats`, `delete_memory`, `clear_all_memories`
   - `agents.py`: `configure_openai_provider`, `build_agents`, `MemoryAgent` class
   - `services/watcher.py`: `watch_folder`
   - `services/consolidator.py`: `consolidation_loop`

2. Create FastAPI app `app/main.py`:
   - Mount static files from `static/` at `/`
   - SPA fallback: any GET not matching API serves `index.html`
   - Startup event: create `MemoryAgent` singleton, launch watcher and consolidator as asyncio Tasks

3. API routes `app/api/routes.py`:
   - Mirror existing aiohttp handlers
   - Async endpoints call `MemoryAgent` methods
   - Use Pydantic models for validation

4. Replace `aiohttp` import with FastAPI, update `requirements.txt`
   - Remove `aiohttp`, `streamlit`, `requests`
   - Add `fastapi`, `uvicorn[standard]`, `python-multipart`

5. Entry point `main.py` at repo root runs Uvicorn on `--port` default 8888

## 7. Frontend Spec: React Dashboard

Features:
- Sidebar with agent status, memory stats
- Ingest tab:
  - Text area + Process button
  - Sample quick-insert buttons
  - Drag-drop file upload to `./inbox` via API? Files uploaded via POST `/api/upload` which writes to inbox and returns immediate feedback. Watcher will process asynchronously.
  - Manual consolidation trigger
- Query tab:
  - Input with history
  - Results with citations and response time
- Memories tab:
  - Grid/list of memory cards with summary, entities, topics, importance badge, created_at, source
  - Delete button per card
  - Filter by topic/entity/importance
  - Danger zone: Clear all with confirmation

UI improvements over Streamlit:
- Dark theme default, responsive layout
- Real-time stats polling every 5s
- Toast notifications
- Keyboard shortcuts

Build process:
- `npm run dev` for Vite dev server proxying API to http://localhost:8888
- `npm run build` outputs to `static/`

## 8. Configuration & Environment

Keep existing `.env` vars:
- `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, `OPENAI_API_VERSION`, `MODEL`, `MEMORY_DB`

CLI args via FastAPI startup or env:
- `WATCH_DIR` default `./inbox`
- `PORT` default 8888
- `CONSOLIDATE_EVERY` default 30 minutes

## 9. Development Workflow

1. Backend dev: `python -m uvicorn app.main:app --reload --port 8888`
2. Frontend dev: `npm run dev` in `frontend/`
3. Build frontend: `npm run build` -> copy to `static/`
4. Production: `python main.py` runs Uvicorn with pre-built static

## 10. Testing & Verification

- API compatibility tests: run sample curls from README against `/api/*`
- Ensure watcher still ingests files dropped in inbox
- Ensure consolidation still runs
- Verify React routes load and API calls succeed

## 11. Risks & Decisions

- Multimodal file ingest currently handled by `MemoryAgent.ingest_file` which expects bytes. Upload endpoint must write file to inbox so watcher processes it, avoiding re-implementing multimodal handling.
- Keep SQLite concurrent access safe: use check_same_thread=False and serialize writes.
- No breaking changes: legacy routes kept as aliases.

## 12. Deliverables

- `app/` package with FastAPI app
- `frontend/` React SPA source
- `static/` built frontend
- `main.py` entrypoint
- Updated `requirements.txt` and `README.md` with new commands
- Migration guide for existing users

---
Status: Spec drafted for review before implementation.
