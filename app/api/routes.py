"""
FastAPI routes
"""
from pathlib import Path

from fastapi import APIRouter, Query, Request, UploadFile, File
from fastapi.responses import JSONResponse

from .. import db
from ..agents import MemoryAgent
from ..config import ALL_SUPPORTED
from .schemas import IngestRequest, DeleteRequest

router = APIRouter(prefix="/api")


def get_agent(request: Request) -> MemoryAgent:
    return request.app.state.agent


@router.get("/status")
async def status():
    return db.get_memory_stats()


@router.get("/memories")
async def memories(limit: int = Query(50, ge=1, le=200)):
    return db.read_all_memories(limit=limit)


@router.post("/ingest")
async def ingest(req: IngestRequest, request: Request):
    agent = get_agent(request)
    result = await agent.ingest(req.text, source=req.source)
    return {"status": "ingested", "response": result}


@router.get("/query")
async def query(request: Request, q: str = Query(..., min_length=1, description="Question")):
    agent = get_agent(request)
    answer = await agent.query(q)
    return {"question": q, "answer": answer}


@router.post("/consolidate")
async def consolidate(request: Request):
    agent = get_agent(request)
    result = await agent.consolidate()
    return {"status": "done", "response": result}


@router.post("/delete")
async def delete_mem(req: DeleteRequest):
    return db.delete_memory(req.memory_id)


@router.post("/clear")
async def clear_all(request: Request):
    watch_path = getattr(request.app.state, "watch_path", None)
    return db.clear_all_memories(inbox_path=watch_path)


@router.post("/upload")
async def upload(request: Request, file: UploadFile = File(...)):
    name = Path(file.filename or "").name
    if not name or Path(name).suffix.lower() not in ALL_SUPPORTED:
        return JSONResponse({"status": "rejected", "reason": "unsupported file type", "filename": name}, status_code=415)

    watch_path = getattr(request.app.state, "watch_path", None) or "./inbox"
    folder = Path(watch_path)
    folder.mkdir(parents=True, exist_ok=True)
    dest = folder / name
    if dest.exists():
        return JSONResponse({"status": "skipped", "reason": "already exists", "filename": name}, status_code=409)
    dest.write_bytes(await file.read())
    return {"status": "saved", "filename": name}
