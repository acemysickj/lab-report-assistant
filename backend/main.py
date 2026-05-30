"""Lab Assistant Backend — FastAPI application entry point."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from config import CORS_ORIGINS, HOST, PORT, OUTPUT_DIR, PROJECT_ROOT

from routers import experiments, reports, files

app = FastAPI(
    title="Lab Assistant API",
    description="实验报告助手后端",
    version="1.0.0",
)

# CORS — allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routes
app.include_router(experiments.router)
app.include_router(reports.router)
app.include_router(files.router)

# Serve generated output files
if OUTPUT_DIR.exists():
    app.mount("/output", StaticFiles(directory=str(OUTPUT_DIR)), name="output")

# Serve common assets (images, etc.)
COMMON_DIR = PROJECT_ROOT / "common"
if COMMON_DIR.exists():
    app.mount("/common", StaticFiles(directory=str(COMMON_DIR)), name="common")


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    from services.claude_service import is_available
    return {
        "status": "ok",
        "claude_api": is_available(),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=HOST, port=PORT, reload=True)
