import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from backend.app.config import settings
from backend.app.database import engine, Base
from backend.app.api.endpoints import router as api_router

# Initialize database tables defensively
try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"Warning: Database initialization notice: {e}")

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Production-quality prototype for experimental UPI payment splitting and reconciliation."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API endpoints
app.include_router(api_router)

# Locate frontend build directory across local dev, Docker, and Vercel serverless
possible_dist_dirs = [
    os.path.abspath("frontend/dist"),
    os.path.join(os.path.dirname(__file__), "../../../frontend/dist"),
    os.path.join(os.path.dirname(__file__), "../../frontend/dist"),
    "/var/task/frontend/dist"
]

dist_dir = None
for candidate in possible_dist_dirs:
    if candidate and os.path.exists(candidate) and os.path.isdir(candidate):
        dist_dir = candidate
        break

if dist_dir and os.path.exists(dist_dir):
    assets_dir = os.path.join(dist_dir, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api"):
            return {"detail": "Not Found"}
        target_file = os.path.join(dist_dir, full_path)
        if full_path and os.path.exists(target_file) and os.path.isfile(target_file):
            return FileResponse(target_file)
        index_file = os.path.join(dist_dir, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        return {"app": settings.app_name, "status": "online"}
else:
    @app.get("/")
    def read_root():
        return {
            "app": settings.app_name,
            "version": settings.app_version,
            "status": "online",
            "description": "UPI Split Pay API server running."
        }
