"""
FastAPI application
"""
import asyncio
import logging
import os
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from . import db
from .config import DB_PATH, MODEL
from .agents import configure_openai_provider, MemoryAgent
from .services.watcher import watch_folder
from .services.consolidator import consolidation_loop
from .api import routes as api_routes

log = logging.getLogger("memory-agent")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s", datefmt="[%H:%M]")

# Initialize DB
db.init_db_path(DB_PATH)

app = FastAPI(title="Always On Memory Agent", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# State
app.state.agent = None
app.state.watch_path = None
app.state.tasks = []

@app.on_event("startup")
async def startup_event():
    configure_openai_provider()
    watch_dir = os.getenv("WATCH_DIR", "./inbox")
    port = int(os.getenv("PORT", "8888"))
    consolidate_every = int(os.getenv("CONSOLIDATE_EVERY", "30"))
    app.state.watch_path = watch_dir
    app.state.agent = MemoryAgent()
    log.info("🧠 Agent Memory Layer starting")
    log.info(f"   Model: {MODEL}")
    log.info(f"   Database: {DB_PATH}")
    log.info(f"   Watch: {watch_dir}")
    log.info(f"   Consolidate: every {consolidate_every}m")
    log.info(f"   API: http://localhost:{port}")

    # Background tasks
    watcher_task = asyncio.create_task(watch_folder(app.state.agent, Path(watch_dir)))
    consolidator_task = asyncio.create_task(consolidation_loop(app.state.agent, consolidate_every))
    app.state.tasks = [watcher_task, consolidator_task]

@app.on_event("shutdown")
async def shutdown_event():
    for t in app.state.tasks:
        t.cancel()

# API routes
app.include_router(api_routes.router)

# Serve the React build. Static assets are mounted under /assets; every other
# GET falls through to index.html so client-side routes (e.g. /memories,
# /query) work on direct navigation and refresh, not just in-app links.
static_dir = Path(__file__).resolve().parent.parent / "static"
if static_dir.exists():
    app.mount("/assets", StaticFiles(directory=str(static_dir / "assets")), name="static-assets")

    @app.get("/{full_path:path}")
    async def spa_fallback(full_path: str):
        candidate = static_dir / full_path
        if full_path and candidate.is_file():
            return FileResponse(str(candidate))
        return FileResponse(str(static_dir / "index.html"))
