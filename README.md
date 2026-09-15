# Always On Memory Agent

**An always-on AI memory agent built with the [OpenAI Agents SDK](https://github.com/openai/openai-agents-python)**

Most AI agents have amnesia. They process information when asked, then forget everything. This project gives agents a persistent, evolving memory that runs 24/7 as a lightweight background process, continuously processing, consolidating, and connecting information.

No vector database. No embeddings. Just an LLM that reads, thinks, and writes structured memory.

## The Problem

Current approaches to LLM memory fall short:

Approach | Limitation
--- | ---
**Vector DB + RAG** | Passive. Embeds once, retrieves later. No active processing.
**Conversation summary** | Loses detail over time. No cross-reference.
**Knowledge graphs** | Expensive to build and maintain.

The gap: No system actively consolidates information like a human brain does. Humans don't just store memories. During sleep, the brain replays, connects, and compresses information. This agent does the same thing.

## Architecture

The Always-On Memory Agent is a lightweight, cost-effective background system that continuously processes, consolidates, and serves memory using an LLM without vector databases or embeddings.

**System Overview**

```
┌─────────────────┐
│   React SPA     │  Dashboard UI served by FastAPI static files
│  (frontend/)    │  - Ingest tab: text + file upload
└────────┬────────┘  - Query tab: natural language search
         │           - Memories tab: browse/delete
         │  HTTP/REST
         ▼
┌──────────────────────────────┐
│   FastAPI Application        │  app/main.py
│  (app/)                      │
│  - /api/* routes             │
│  - Legacy /query, /ingest... │
│  - Static files mount        │
│  - Startup: agent + watcher +│
│    consolidator tasks        │
└────────┬─────────────────────┘
         │
         ├──────────────────────────────┐
         ▼                              ▼
┌──────────────────┐          ┌──────────────────┐
│  MemoryAgent     │          │   SQLite DB      │
│  app/agents.py   │◄────────►│  memory.db       │
│  - Orchestrator  │  tools   │  - memories      │
│  - IngestAgent   │          │  - consolidations│
│  - ConsolidateAgent│        │  - processed_files│
│  - QueryAgent    │          └──────────────────┘
└────────┬─────────┘
         │
         ├──────────────────┐
         ▼                  ▼
┌─────────────────┐ ┌──────────────┐
│ File Watcher    │ │ Consolidator │
│ app/services/   │ │ app/services/│
│ watcher.py      │ │ consolidator │
│ Polls ./inbox   │ │ Periodic     │
└─────────────────┘ └──────────────┘
```

**Components**

- **React Dashboard** `frontend/` - Modern SPA built with Vite + React + Tailwind. Served by FastAPI static mount at `/`. No separate frontend server needed.
- **FastAPI Backend** `app/main.py` - HTTP API, CORS, static serving, startup lifecycle. Exposes `/api/*` with OpenAPI docs at `/docs`. Keeps legacy routes for compatibility.
- **MemoryAgent** `app/agents.py` - OpenAI Agents SDK orchestrator with three sub-agents:
  - *IngestAgent*: processes text/media into structured memory via `store_memory`
  - *ConsolidateAgent*: finds patterns and connections via `read_unconsolidated_memories` + `store_consolidation`
  - *QueryAgent*: answers questions using `read_all_memories` + `read_consolidation_history`
  - All agents use typed tools backed by SQLite.
- **Database Layer** `app/db.py` - SQLite helpers for memories, consolidations, processed files. All access goes through typed dicts.
- **Services**
  - *Watcher* `app/services/watcher.py`: polls `./inbox` for new files, auto-ingests text/media via MemoryAgent
  - *Consolidator* `app/services/consolidator.py`: runs every N minutes to consolidate unconsolidated memories
- **Config** `app/config.py` - Env vars for Azure OpenAI, model, DB path, file extensions
- **Storage** `memory.db` + `inbox/` folder. Files are marked processed after ingest.

**Data Flow**

1. *Ingest*: File dropped in `inbox/` → Watcher detects → MemoryAgent.ingest_file → IngestAgent extracts summary/entities/topics/importance → `store_memory`
2. *Consolidate*: Timer triggers → ConsolidateAgent reads unconsolidated → finds connections → `store_consolidation` → marks memories consolidated
3. *Query*: User asks via dashboard → FastAPI `/api/query` → QueryAgent reads memories + history → synthesizes answer with citations
4. *API*: All operations exposed via FastAPI REST, compatible with previous aiohttp endpoints.

**What this project is about**

Most AI agents have amnesia. This project gives agents a persistent, evolving memory that runs 24/7 as a lightweight background process, continuously processing, consolidating, and connecting information. No vector database. No embeddings. Just an LLM that reads, thinks, and writes structured memory. The system actively consolidates information like human memory during sleep, building connections and insights over time.



## How It Works

### 1. Ingest

Feed the agent **any file** — text, images, audio, video, or PDFs. The **IngestAgent** uses the model's multimodal capabilities to extract structured information from all of them:


**Supported file types (27 total):**

Category | Extensions
--- | ---
Text | `.txt`, `.md`, `.json`, `.csv`, `.log`, `.xml`, `.yaml`, `.yml`
Images | `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.bmp`, `.svg`
Audio | `.mp3`, `.wav`, `.ogg`, `.flac`, `.m4a`, `.aac`
Video | `.mp4`, `.webm`, `.mov`, `.avi`, `.mkv`
Documents | `.pdf`

**Three ways to ingest:**

- **File watcher**: Drop any supported file in the `./inbox` folder. The agent picks it up automatically.
- **Dashboard upload**: Use the 📎 Upload button in the Streamlit dashboard.
- **HTTP API**: `POST /ingest` with text content.

### 2. Consolidate

The **ConsolidateAgent** runs on a timer (default: every 30 minutes). Like the human brain during sleep, it:

- Reviews unconsolidated memories
- Finds connections between them
- Generates cross-cutting insights
- Compresses related information

```
Memory #1: "AI agents are growing fast but reliability is a challenge"
Memory #2: "Q1 priority: reduce inference costs by 40%"
Memory #3: "Current LLM memory approaches all have gaps"
Memory #4: "Smart inbox idea: persistent AI memory for email"
                    |
                    v  ConsolidateAgent
    +---------------------------------------------+
    | Connections:                                 |
    |    #1 <-> #3: Agent reliability needs better  |
    |            memory architectures              |
    |    #2 <-> #1: Cost reduction enables scaling  |
    |            agent deployment                  |
    |    #3 <-> #4: Smart inbox is an application   |
    |            of reconstructive memory           |
    |                                              |
    | Insight: "The bottleneck for next-gen AI     |
    |  tools is the transition from static RAG     |
    |  to dynamic memory systems"                  |
    +---------------------------------------------+
```

### 3. Query

Ask any question. The **QueryAgent** reads all memories and consolidation insights, then synthesizes an answer with source citations:

```
Q: "What should I focus on?"

A: "Based on your memories, prioritize:
    1. Ship the API by March 15 [Memory 2]
    2. The agent reliability gap [Memory 1] could be addressed
      by the reconstructive memory approach [Memory 3]
    3. The smart inbox concept [Memory 4] validates the
      market need for persistent AI memory"
```

## Quick Start

### 1. Install

```bash
git clone https://github.com/codestreet.ai/always-on-memory-agent.git
cd always-on-memory-agent
pip install -r requirements.txt
```

### 2. Start the FastAPI server with React dashboard

```bash
python main.py --port 8888
# or
python main.py --watch ./inbox --port 8888 --consolidate-every 30
```

The API is available at http://localhost:8888/api and the React dashboard at http://localhost:8888

To develop the frontend:
```bash
cd frontend
npm install
npm run dev
```

To build the frontend for production:
```bash
cd frontend
npm run build
# outputs to ../static, served by FastAPI
```

### 2. Configure Azure OpenAI

The agent runs on **Azure OpenAI** via the OpenAI Responses API. Put your
resource credentials in a git-ignored `.env` file (a template is included):

```bash
cp .env.example .env
# then edit .env with your values
```

```dotenv
# .env
AZURE_OPENAI_ENDPOINT=https://intelli-dev-foundry-prj-resource.openai.azure.com
MODEL=gpt-4.1
OPENAI_API_VERSION=2025-03-01-preview
AZURE_OPENAI_API_KEY=your-azure-openai-key
```

| Variable | Meaning |
| --- | --- |
| `AZURE_OPENAI_ENDPOINT` | Your Azure OpenAI resource URL (the `/openai` suffix is added automatically). |
| `MODEL` | The deployment name on your resource (default `gpt-4.1`). |
| `OPENAI_API_VERSION` | API version for the Responses API. |
| `AZURE_OPENAI_API_KEY` | Your resource's API key. **Keep secret — never commit `.env`.** |

The agent loads `.env` automatically on start. When `AZURE_OPENAI_ENDPOINT` is
unset it falls back to a standard OpenAI client using `OPENAI_API_KEY`.

### 3. Start the agent

```bash
python main.py
```

That's it. The agent is now running:

- Watching `./inbox/` for new files (text, images, audio, video, PDFs)
- Consolidating every 30 minutes
- Serving FastAPI + React dashboard at `http://localhost:8888`
- API docs at `http://localhost:8888/docs`

### 4. Feed it information

**Option A: Drop any file**

```bash
echo "Some important information" > inbox/notes.txt
cp photo.jpg inbox/
cp meeting.mp3 inbox/
cp report.pdf inbox/
# Agent auto-ingests within 5-10 seconds
```

**Option B: HTTP API**


```bash
curl -X POST http://localhost:8888/ingest \
      -H "Content-Type: application/json" \
      -d '{"text": "AI agents are the future", "source": "article"}'
```

### 5. Query

```bash
curl "http://localhost:8888/query?q=what+do+you+know"
```
```bash
  curl -G "http://localhost:8888/query" --data-urlencode "q=your question here"
```

### 6. Dashboard

The React dashboard is served by FastAPI at `http://localhost:8888`.

Features:
- **Ingesting** text and uploading files via the inbox watcher
- **Querying** memory with natural language
- **Browsing** and **deleting** stored memories
- **Consolidating** memories on demand
- Real-time stats and dark theme UI

## API Reference

Base path: `/api` with legacy aliases at root.

Endpoint | Method | Description
--- | --- | ---
`/api/status` | GET | Memory statistics (counts)
`/api/memories` | GET | List all stored memories
`/api/ingest` | POST | Ingest new text (`{"text": "...", "source": "..."}`)
`/api/query?q=...` | GET | Query memory with a question
`/api/consolidate` | POST | Trigger manual consolidation
`/api/delete` | POST | Delete a memory (`{"memory_id": 1}`)
`/api/clear` | POST | Delete all memories (full reset)

Legacy routes `/status`, `/memories`, `/ingest`, `/query`, `/consolidate`, `/delete`, `/clear` are also available for compatibility.


## CLI Options

```bash
python agent.py [options]

   --watch DIR              Folder to watch (default: ./inbox)
   --port PORT              HTTP API port (default: 8888)
   --consolidate-every MIN  Consolidation interval (default: 30)
```

Environment variables (loaded from `.env`):

| Variable | Default |
| --- | --- |
| `AZURE_OPENAI_ENDPOINT` | — (required for Azure) |
| `MODEL` | `gpt-4.1` |
| `OPENAI_API_VERSION` | `2025-03-01-preview` |
| `AZURE_OPENAI_API_KEY` | — (required for Azure) |

## Project Structure

```
always-on-memory-agent/
├── main.py             # FastAPI entrypoint
├── app/                # Backend package (FastAPI + agents)
│   ├── main.py
│   ├── api/
│   ├── services/
│   └── agents.py
├── frontend/           # React + Vite dashboard source
├── static/             # Built React assets (generated)
├── requirements.txt    # Dependencies
├── .env.example        # Azure OpenAI credentials template
├── inbox/              # Drop any file here for auto-ingestion
├── docs/               # Logo assets
└── memory.db           # SQLite database (created automatically)
```

Deprecated:
- `agent.py` and `dashboard.py` are kept for reference but replaced by FastAPI + React.


## Why a fast, cheap model?

This agent runs continuously. Cost and speed matter more than raw intelligence for background processing:

- **Fast**: Low-latency ingestion and retrieval, designed for continuous background operation
- **Cheap**: Negligible cost per session, making 24/7 operation practical
- **Smart enough**: Extracts structure, finds connections, synthesizes answers

The default deployment is `gpt-4.1` on Azure OpenAI; override with the `MODEL`
environment variable.

## Built With

- [OpenAI Agents SDK](https://github.com/openai/openai-agents-python) for agent orchestration and handoffs
- [Azure OpenAI](https://learn.microsoft.com/azure/ai-services/openai/) (GPT-4.1, Responses API) for all LLM operations
- SQLite for persistent memory storage
- FastAPI + Uvicorn for the HTTP API
- React + Vite + TailwindCSS for the dashboard

## License

MIT
