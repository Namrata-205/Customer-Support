"""FastAPI entry point for the Customer Support RAG demo."""
import logging
import time
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, field_validator
from support_rag import ask_rag, backend_configured

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("customer_support")
app = FastAPI(title="Customer Support RAG API", version="2.0.0", docs_url="/api/docs", openapi_url="/api/openapi.json")

# Same-origin frontend; CORS is not required for production.
class QuestionRequest(BaseModel):
    question: str = Field(..., max_length=1000)

    @field_validator("question")
    @classmethod
    def nonempty(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Question cannot be empty")
        return value

@app.get("/api/health")
def health():
    return {"status": "running", "gemini_configured": backend_configured(), "message": "Customer Support API is running"}

@app.post("/api/ask")
def ask(request: QuestionRequest):
    start = time.perf_counter()
    try:
        result = ask_rag(request.question)
        elapsed = round((time.perf_counter() - start) * 1000, 2)
        logger.info("ask succeeded in %.2fms", elapsed)
        return {"question": request.question, "answer": result["answer"], "sources": result["sources"], "response_time_ms": elapsed, "status": "success", "response_mode": result.get("response_mode", "generated"), "model": result.get("model")}
    except Exception:
        logger.exception("ask failed after %.2fms", (time.perf_counter() - start) * 1000)
        raise HTTPException(status_code=503, detail="The AI service is temporarily unavailable. Please try again.")

# Mount last so API routes take precedence. Vercel serves public assets from its
# CDN and may omit this directory from the Python function bundle.
public_dir = Path(__file__).resolve().parent / "public"
if public_dir.is_dir():
    app.mount("/", StaticFiles(directory=str(public_dir), html=True), name="frontend")
