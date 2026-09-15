"""
File watcher service
"""
import logging
from datetime import datetime, timezone
from pathlib import Path

from .. import db
from ..agents import MemoryAgent
from ..config import ALL_SUPPORTED, TEXT_EXTENSIONS

log = logging.getLogger("memory-agent")

async def watch_folder(agent: MemoryAgent, folder: Path, poll_interval: int = 5):
    folder.mkdir(parents=True, exist_ok=True)
    log.info(f"👁️  Watching: {folder}/  (supports: text, images, audio, video, PDFs)")
    while True:
        try:
            for f in sorted(folder.iterdir()):
                if f.name.startswith("."):
                    continue
                suffix = f.suffix.lower()
                if suffix not in ALL_SUPPORTED:
                    continue
                # Check processed
                conn = db.get_db()
                row = conn.execute("SELECT 1 FROM processed_files WHERE path = ?", (str(f),)).fetchone()
                conn.close()
                if row:
                    continue
                try:
                    if suffix in TEXT_EXTENSIONS:
                        log.info(f"📄 New text file: {f.name}")
                        text = f.read_text(encoding="utf-8", errors="replace")[:10000]
                        if text.strip():
                            await agent.ingest(text, source=f.name)
                    else:
                        log.info(f"🖼️  New media file: {f.name}")
                        await agent.ingest_file(f)
                except Exception as file_err:
                    log.error(f"Error ingesting {f.name}: {file_err}")
                    continue
                # Mark processed
                conn = db.get_db()
                conn.execute(
                    "INSERT INTO processed_files (path, processed_at) VALUES (?, ?)",
                    (str(f), datetime.now(timezone.utc).isoformat()),
                )
                conn.commit()
                conn.close()
        except Exception as e:
            log.error(f"Watch error: {e}")
        import asyncio
        await asyncio.sleep(poll_interval)
