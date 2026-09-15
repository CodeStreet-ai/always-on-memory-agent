"""
Database helpers extracted from agent.py
"""
import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import TypedDict

DB_PATH = Path(os.getenv("MEMORY_DB", "memory.db")) if False else None  # placeholder

# Will be set in __init__ via config
_DB_PATH = None

class Connection(TypedDict, total=False):
    from_id: int
    to_id: int
    relationship: str

def init_db_path(path: str):
    global _DB_PATH
    _DB_PATH = Path(path)

def get_db() -> sqlite3.Connection:
    if _DB_PATH is None:
        raise RuntimeError("DB path not initialized")
    db = sqlite3.connect(str(_DB_PATH), check_same_thread=False)
    db.row_factory = sqlite3.Row
    db.executescript("""
        CREATE TABLE IF NOT EXISTS memories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source TEXT NOT NULL DEFAULT '',
            raw_text TEXT NOT NULL,
            summary TEXT NOT NULL,
            entities TEXT NOT NULL DEFAULT '[]',
            topics TEXT NOT NULL DEFAULT '[]',
            connections TEXT NOT NULL DEFAULT '[]',
            importance REAL NOT NULL DEFAULT 0.5,
            created_at TEXT NOT NULL,
            consolidated INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS consolidations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_ids TEXT NOT NULL,
            summary TEXT NOT NULL,
            insight TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS processed_files (
            path TEXT PRIMARY KEY,
            processed_at TEXT NOT NULL
        );
    """)
    return db

def store_memory(raw_text: str, summary: str, entities: list[str], topics: list[str], importance: float, source: str = "") -> dict:
    db = get_db()
    now = datetime.now(timezone.utc).isoformat()
    cursor = db.execute(
        """INSERT INTO memories (source, raw_text, summary, entities, topics, importance, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (source, raw_text, summary, json.dumps(entities), json.dumps(topics), float(importance), now),
    )
    db.commit()
    mid = int(cursor.lastrowid)
    db.close()
    return {"memory_id": mid, "status": "stored", "summary": summary}

def read_all_memories(limit: int = 50) -> dict:
    db = get_db()
    rows = db.execute("SELECT * FROM memories ORDER BY created_at DESC LIMIT ?", (limit,)).fetchall()
    memories = []
    for r in rows:
        memories.append({
            "id": int(r["id"]), "source": r["source"], "summary": r["summary"],
            "entities": json.loads(r["entities"]), "topics": json.loads(r["topics"]),
            "importance": float(r["importance"]), "connections": json.loads(r["connections"]),
            "created_at": r["created_at"], "consolidated": bool(r["consolidated"]),
            "raw_text": r["raw_text"],
        })
    db.close()
    return {"memories": memories, "count": len(memories)}

def read_unconsolidated_memories(limit: int = 10) -> dict:
    db = get_db()
    rows = db.execute(
        "SELECT * FROM memories WHERE consolidated = 0 ORDER BY created_at DESC LIMIT ?",
        (limit,)
    ).fetchall()
    memories = []
    for r in rows:
        memories.append({
            "id": int(r["id"]), "summary": r["summary"],
            "entities": json.loads(r["entities"]), "topics": json.loads(r["topics"]),
            "importance": float(r["importance"]), "created_at": r["created_at"],
        })
    db.close()
    return {"memories": memories, "count": len(memories)}

def store_consolidation(source_ids: list[int], summary: str, insight: str, connections: list[Connection]) -> dict:
    db = get_db()
    now = datetime.now(timezone.utc).isoformat()
    db.execute(
        "INSERT INTO consolidations (source_ids, summary, insight, created_at) VALUES (?, ?, ?, ?)",
        (json.dumps(source_ids), summary, insight, now),
    )
    for conn in connections:
        from_id, to_id = conn.get("from_id"), conn.get("to_id")
        rel = conn.get("relationship", "")
        if from_id and to_id:
            for mid in [from_id, to_id]:
                row = db.execute("SELECT connections FROM memories WHERE id = ?", (mid,)).fetchone()
                if row:
                    existing = json.loads(row["connections"])
                    existing.append({"linked_to": to_id if mid == from_id else from_id, "relationship": rel})
                    db.execute("UPDATE memories SET connections = ? WHERE id = ?", (json.dumps(existing), mid))
    placeholders = ",".join("?" * len(source_ids))
    db.execute(f"UPDATE memories SET consolidated = 1 WHERE id IN ({placeholders})", source_ids)
    db.commit()
    db.close()
    return {"status": "consolidated", "memories_processed": len(source_ids), "insight": insight}

def read_consolidation_history(limit: int = 10) -> dict:
    db = get_db()
    rows = db.execute("SELECT * FROM consolidations ORDER BY created_at DESC LIMIT ?", (limit,)).fetchall()
    result = [{"summary": r["summary"], "insight": r["insight"], "source_ids": r["source_ids"]} for r in rows]
    db.close()
    return {"consolidations": result, "count": len(result)}

def get_memory_stats() -> dict:
    db = get_db()
    total = int(db.execute("SELECT COUNT(*) as c FROM memories").fetchone()["c"])
    unconsolidated = int(db.execute("SELECT COUNT(*) as c FROM memories WHERE consolidated = 0").fetchone()["c"])
    consolidations = int(db.execute("SELECT COUNT(*) as c FROM consolidations").fetchone()["c"])
    db.close()
    return {
        "total_memories": total,
        "unconsolidated": unconsolidated,
        "consolidations": consolidations,
    }

def delete_memory(memory_id: int) -> dict:
    db = get_db()
    row = db.execute("SELECT 1 FROM memories WHERE id = ?", (memory_id,)).fetchone()
    if not row:
        db.close()
        return {"status": "not_found", "memory_id": memory_id}
    db.execute("DELETE FROM memories WHERE id = ?", (memory_id,))
    db.commit()
    db.close()
    return {"status": "deleted", "memory_id": memory_id}

def clear_all_memories(inbox_path: str | None = None) -> dict:
    from pathlib import Path
    import shutil
    db = get_db()
    mem_count = db.execute("SELECT COUNT(*) as c FROM memories").fetchone()["c"]
    db.execute("DELETE FROM memories")
    db.execute("DELETE FROM consolidations")
    db.execute("DELETE FROM processed_files")
    db.commit()
    db.close()
    files_deleted = 0
    if inbox_path:
        folder = Path(inbox_path)
        if folder.is_dir():
            for f in folder.iterdir():
                if f.name.startswith("."):
                    continue
                try:
                    if f.is_file():
                        f.unlink()
                        files_deleted += 1
                    elif f.is_dir():
                        shutil.rmtree(f)
                        files_deleted += 1
                except OSError:
                    pass
    return {"status": "cleared", "memories_deleted": mem_count, "files_deleted": files_deleted}

# Import os after definition to avoid circular
import os
