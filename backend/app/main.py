
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.routes.auth import router as auth_router
from app.routes.upload import router as upload_router
from app.routes.documents import router as documents_router
from app.routes.assistant import router as assistant_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="MediDoc AI",
    description=(
        "Medical document intelligence with OCR, "
        "document retrieval, and source-based answers."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(upload_router)
app.include_router(documents_router)
app.include_router(assistant_router)


@app.get("/")
def root():
    return {
        "name": "MediDoc AI",
        "status": "running",
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "MediDoc AI",
    }
