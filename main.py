"""
Entrypoint for FastAPI app
"""
import argparse
import uvicorn

parser = argparse.ArgumentParser(description="Always On Memory Agent - FastAPI")
parser.add_argument("--watch", default="./inbox", help="Folder to watch")
parser.add_argument("--port", type=int, default=8888, help="HTTP port")
parser.add_argument("--consolidate-every", type=int, default=30, help="Consolidation interval minutes")
args = parser.parse_args()

import os
os.environ["WATCH_DIR"] = args.watch
os.environ["PORT"] = str(args.port)
os.environ["CONSOLIDATE_EVERY"] = str(args.consolidate_every)

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=args.port, reload=False)
