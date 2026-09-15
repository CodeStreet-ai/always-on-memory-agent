from pydantic import BaseModel

class IngestRequest(BaseModel):
    text: str
    source: str = "api"

class DeleteRequest(BaseModel):
    memory_id: int

class MemoryItem(BaseModel):
    id: int
    source: str
    summary: str
    entities: list[str]
    topics: list[str]
    importance: float
    connections: list[dict]
    created_at: str
    consolidated: bool
    raw_text: str | None = None

class MemoriesResponse(BaseModel):
    memories: list[MemoryItem]
    count: int

class StatsResponse(BaseModel):
    total_memories: int
    unconsolidated: int
    consolidations: int
