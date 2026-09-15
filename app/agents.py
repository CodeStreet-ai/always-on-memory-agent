"""
Agent definitions extracted from agent.py
"""
import base64
import json
import logging
import mimetypes
from datetime import datetime, timezone
from pathlib import Path
from typing import TypedDict

from agents import Agent, Runner, function_tool, handoff, set_default_openai_client, set_tracing_disabled
from openai import AsyncOpenAI

from . import db
from .config import MODEL, AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, OPENAI_API_VERSION, MEDIA_EXTENSIONS

log = logging.getLogger("memory-agent")

def configure_openai_provider():
    if not AZURE_OPENAI_ENDPOINT:
        return
    if not AZURE_OPENAI_API_KEY:
        raise RuntimeError("AZURE_OPENAI_ENDPOINT is set but AZURE_OPENAI_API_KEY is missing.")
    base_url = AZURE_OPENAI_ENDPOINT.rstrip("/")
    if not base_url.endswith("/openai"):
        base_url = f"{base_url}/openai"
    client = AsyncOpenAI(
        api_key=AZURE_OPENAI_API_KEY,
        base_url=base_url,
        default_query={"api-version": OPENAI_API_VERSION},
    )
    set_default_openai_client(client)
    set_tracing_disabled(True)
    log.info(f"🔌 Using Azure OpenAI endpoint: {base_url} (api-version {OPENAI_API_VERSION})")

# Tools wrappers
class Connection(TypedDict):
    from_id: int
    to_id: int
    relationship: str

class MemoryItem(TypedDict):
    id: int
    source: str
    summary: str
    entities: list[str]
    topics: list[str]
    importance: float
    connections: list[dict]
    created_at: str
    consolidated: bool

class MemoriesResponse(TypedDict):
    memories: list[MemoryItem]
    count: int

class ConsolidationItem(TypedDict):
    summary: str
    insight: str
    source_ids: str

class ConsolidationsResponse(TypedDict):
    consolidations: list[ConsolidationItem]
    count: int

class StatsResponse(TypedDict):
    total_memories: int
    unconsolidated: int
    consolidations: int

def store_memory_tool(raw_text: str, summary: str, entities: list[str], topics: list[str], importance: float, source: str = "") -> dict:
    return db.store_memory(raw_text, summary, entities, topics, float(importance), source)

def read_all_memories_tool() -> MemoriesResponse:
    return db.read_all_memories()

def read_unconsolidated_memories_tool() -> MemoriesResponse:
    return db.read_unconsolidated_memories()

def store_consolidation_tool(source_ids: list[int], summary: str, insight: str, connections: list[Connection]) -> dict:
    return db.store_consolidation(source_ids, summary, insight, connections)

def read_consolidation_history_tool() -> ConsolidationsResponse:
    return db.read_consolidation_history()

def get_memory_stats_tool() -> StatsResponse:
    return db.get_memory_stats()

def build_agents():
    ingest_agent = Agent(
        name="ingest_agent",
        model=MODEL,
        handoff_description="Processes raw text or media into structured memory. Call this when new information arrives.",
        instructions=(
            "You are a Memory Ingest Agent. You handle ALL types of input — text, images,\n"
            "audio, video, and PDFs. For any input you receive:\n"
            "1. Thoroughly describe what the content contains\n"
            "2. Create a concise 1-2 sentence summary\n"
            "3. Extract key entities (people, companies, products, concepts, objects, locations)\n"
            "4. Assign 2-4 topic tags\n"
            "5. Rate importance from 0.0 to 1.0\n"
            "6. Call store_memory with all extracted information\n\n"
            "For images: describe the scene, objects, text, people, and any visual details.\n"
            "For audio/video: describe the spoken content, sounds, scenes, and key moments.\n"
            "For PDFs: extract and summarize the document content.\n\n"
            "Use the full description as raw_text in store_memory so the context is preserved.\n"
            "Always call store_memory. Be concise and accurate.\n"
            "After storing, confirm what was stored in one sentence."
        ),
        tools=[function_tool(store_memory_tool)],
    )

    consolidate_agent = Agent(
        name="consolidate_agent",
        model=MODEL,
        handoff_description="Merges related memories and finds patterns. Call this periodically.",
        instructions=(
            "You are a Memory Consolidation Agent. You:\n"
            "1. Call read_unconsolidated_memories to see what needs processing\n"
            "2. If fewer than 2 memories, say nothing to consolidate\n"
            "3. Find connections and patterns across the memories\n"
            "4. Create a synthesized summary and one key insight\n"
            "5. Call store_consolidation with source_ids, summary, insight, and connections\n\n"
            "Connections: list of dicts with 'from_id', 'to_id', 'relationship' keys.\n"
            "Think deeply about cross-cutting patterns."
        ),
        tools=[function_tool(read_unconsolidated_memories_tool), function_tool(store_consolidation_tool)],
    )

    query_agent = Agent(
        name="query_agent",
        model=MODEL,
        handoff_description="Answers questions using stored memories.",
        instructions=(
            "You are a Memory Query Agent. When asked a question:\n"
            "1. Call read_all_memories to access the memory store\n"
            "2. Call read_consolidation_history for higher-level insights\n"
            "3. Synthesize an answer based ONLY on stored memories\n"
            "4. Reference memory IDs: [Memory 1], [Memory 2], etc.\n"
            "5. If no relevant memories exist, say so honestly\n\n"
            "Be thorough but concise. Always cite sources."
        ),
        tools=[function_tool(read_all_memories_tool), function_tool(read_consolidation_history_tool)],
    )

    orchestrator = Agent(
        name="memory_orchestrator",
        model=MODEL,
        instructions=(
            "You are the Memory Orchestrator for an always-on memory system.\n"
            "Route requests to the right sub-agent:\n"
            "- New information -> ingest_agent\n"
            "- Consolidation request -> consolidate_agent\n"
            "- Questions -> query_agent\n"
            "- Status check -> call get_memory_stats and report\n\n"
            "After the sub-agent completes, give a brief summary."
        ),
        handoffs=[handoff(ingest_agent), handoff(consolidate_agent), handoff(query_agent)],
        tools=[function_tool(get_memory_stats_tool)],
    )
    return orchestrator

class MemoryAgent:
    def __init__(self):
        self.agent = build_agents()

    @staticmethod
    def _media_input_item(mime_type: str, file_bytes: bytes, filename: str = "") -> dict:
        b64 = base64.b64encode(file_bytes).decode("utf-8")
        data_url = f"data:{mime_type};base64,{b64}"
        if mime_type.startswith("image/"):
            return {"type": "input_image", "image_url": data_url, "detail": "auto"}
        return {"type": "input_file", "file_data": data_url, "filename": filename or "file"}

    async def run(self, message: str) -> str:
        result = await Runner.run(self.agent, message)
        return result.final_output or ""

    async def run_multimodal(self, text: str, file_bytes: bytes, mime_type: str, filename: str = "") -> str:
        items = [
            {
                "role": "user",
                "content": [
                    {"type": "input_text", "text": text},
                    self._media_input_item(mime_type, file_bytes, filename),
                ],
            }
        ]
        result = await Runner.run(self.agent, items)
        return result.final_output or ""

    async def ingest(self, text: str, source: str = "") -> str:
        msg = f"Remember this information (source: {source}):\n\n{text}" if source else f"Remember this information:\n\n{text}"
        return await self.run(msg)

    async def ingest_file(self, file_path: Path) -> str:
        suffix = file_path.suffix.lower()
        mime_type = MEDIA_EXTENSIONS.get(suffix)
        if not mime_type:
            mime_type, _ = mimetypes.guess_type(str(file_path))
            mime_type = mime_type or "application/octet-stream"
        file_bytes = file_path.read_bytes()
        size_mb = len(file_bytes) / (1024 * 1024)
        if size_mb > 20:
            log.warning(f"⚠️  Skipping {file_path.name} ({size_mb:.1f}MB) — exceeds 20MB limit")
            return f"Skipped: file too large ({size_mb:.1f}MB)"
        prompt = (
            f"Remember this file (source: {file_path.name}, type: {mime_type}).\n\n"
            f"Thoroughly analyze the content of this {mime_type.split('/')[0]} file and "
            f"extract all meaningful information for memory storage."
        )
        log.info(f"🔮 Ingesting {mime_type.split('/')[0]}: {file_path.name} ({size_mb:.1f}MB)")
        return await self.run_multimodal(prompt, file_bytes, mime_type, filename=file_path.name)

    async def consolidate(self) -> str:
        return await self.run("Consolidate unconsolidated memories. Find connections and patterns.")

    async def query(self, question: str) -> str:
        return await self.run(f"Based on my memories, answer: {question}")

    async def status(self) -> str:
        return await self.run("Give me a status report on my memory system.")
