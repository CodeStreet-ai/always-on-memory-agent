"""
Consolidation loop service
"""
import logging

from .. import db
from ..agents import MemoryAgent

log = logging.getLogger("memory-agent")

async def consolidation_loop(agent: MemoryAgent, interval_minutes: int = 30):
    log.info(f"🔄 Consolidation: every {interval_minutes} minutes")
    while True:
        import asyncio
        await asyncio.sleep(interval_minutes * 60)
        try:
            conn = db.get_db()
            count = conn.execute("SELECT COUNT(*) as c FROM memories WHERE consolidated = 0").fetchone()["c"]
            conn.close()
            if count >= 2:
                log.info(f"🔄 Running consolidation ({count} unconsolidated memories)...")
                result = await agent.consolidate()
                log.info(f"🔄 {result[:200]}")
            else:
                log.info(f"🔄 Skipping consolidation ({count} unconsolidated memories)")
        except Exception as e:
            log.error(f"Consolidation error: {e}")
